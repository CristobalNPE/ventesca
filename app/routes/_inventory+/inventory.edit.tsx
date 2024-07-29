import { getBusinessId } from '#app/utils/auth.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

import {
	getProductAlerts,
	shouldDeactivateProduct,
} from '#app/utils/product-status.ts'

import {
	CreateItemSchema,
	createSingleProductActionIntent,
} from './components/product-create-single.tsx'
import {
	CategoryEditorSchema,
	updateProductCategoryActionIntent,
} from './components/product-modify-category.tsx'
import {
	SellingPriceEditorSchema,
	updateProductSellingPriceActionIntent,
} from './components/product-modify-sellingPrice.tsx'
import {
	StatusEditorSchema,
	updateProductStatusActionIntent,
} from './components/product-modify-status.tsx'
import {
	StockEditorSchema,
	updateProductStockActionIntent,
} from './components/product-modify-stock.tsx'
import {
	SupplierEditorSchema,
	updateProductSupplierActionIntent,
} from './components/product-modify-supplier.tsx'
import { PriceModificationStatus } from './types/PriceModificationStatus.ts'
const DEFAULT_PRICE = 0
const DEFAULT_STOCK = 0
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case createSingleProductActionIntent: {
			return await createSingleProductAction({ formData, businessId })
		}
		case updateProductStockActionIntent: {
			return await updateProductStockAction({ formData })
		}
		case updateProductSellingPriceActionIntent: {
			return await updateProductSellingPriceAction({ formData })
		}
		case updateProductSupplierActionIntent: {
			return await updateProductSupplierAction({ formData })
		}
		case updateProductCategoryActionIntent: {
			return await updateProductCategoryAction({ formData })
		}
		case updateProductStatusActionIntent: {
			return await updateProductStatusAction({ formData })
		}
	}
}

async function updateProductStockAction({ formData }: { formData: FormData }) {
	const submission = parseWithZod(formData, {
		schema: StockEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { productId, stock } = submission.value

	const currentStatus = await prisma.product.findUniqueOrThrow({
		where: { id: productId },
		select: { id: true, stock: true },
	})

	if (stock !== currentStatus.stock) {
		await prisma.product.update({
			where: { id: productId },
			data: { stock },
		})
	}

	return json({ result: submission.reply() })
}

async function updateProductSellingPriceAction({
	formData,
}: {
	formData: FormData
}) {
	const submission = parseWithZod(formData, {
		schema: SellingPriceEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, sellingPrice } = submission.value

	const currentProduct = await prisma.product.findUniqueOrThrow({
		where: { id: productId, isDeleted: false },
		select: {
			sellingPrice: true,
		},
	})

	if (sellingPrice !== currentProduct.sellingPrice) {
		prisma.$transaction(async tx => {
			const updatedProduct = await tx.product.update({
				where: { id: productId },
				data: { sellingPrice },
			})

			await tx.priceModification.create({
				data: {
					status: PriceModificationStatus.APPLIED,
					oldPrice: currentProduct.sellingPrice,
					newPrice: updatedProduct.sellingPrice,
					productAnalytics: { connect: { productId: productId } },
				},
			})
			if (shouldDeactivateProduct(updatedProduct)) {
				await tx.product.update({
					where: { id: updatedProduct.id },
					data: { isActive: false },
				})
			}
		})
	}

	return json({ result: submission.reply() })
}

async function updateProductSupplierAction({
	formData,
}: {
	formData: FormData
}) {
	const submission = parseWithZod(formData, {
		schema: SupplierEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, supplierId } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { supplier: { connect: { id: supplierId } } },
	})

	return json({ result: submission.reply() })
}

async function updateProductCategoryAction({
	formData,
}: {
	formData: FormData
}) {
	const submission = parseWithZod(formData, {
		schema: CategoryEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, categoryId } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { category: { connect: { id: categoryId } } },
	})

	return json({ result: submission.reply() })
}
async function updateProductStatusAction({ formData }: { formData: FormData }) {
	const submission = await parseWithZod(formData, {
		schema: StatusEditorSchema.superRefine(async (data, ctx) => {
			const currentProduct = await prisma.product.findUniqueOrThrow({
				where: { id: data.productId },
			})

			if (!currentProduct.isActive) {
				const alertsToCheck = getProductAlerts(currentProduct)
				alertsToCheck.forEach(alert => {
					if (alert.condition) {
						ctx.addIssue({
							code: z.ZodIssueCode.custom,
							message: alert.description,
						})
					}
				})
			}
		}),

		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId } = submission.value

	const currentProduct = await prisma.product.findUniqueOrThrow({
		where: { id: productId },
	})

	if (currentProduct.isActive) {
		await prisma.product.update({
			where: { id: productId },
			data: { isActive: false },
		})
	}

	if (!currentProduct.isActive) {
		if (!shouldDeactivateProduct(currentProduct)) {
			await prisma.product.update({
				where: { id: productId },
				data: { isActive: true },
			})
		}
	}

	return json({ result: submission.reply() })
}

async function createSingleProductAction({
	formData,
	businessId,
}: {
	formData: FormData
	businessId: string
}) {
	const submission = await parseWithZod(formData, {
		schema: CreateItemSchema.superRefine(async (data, ctx) => {
			const productByCode = await prisma.product.findFirst({
				select: { id: true, code: true },
				where: { businessId, code: data.code, isDeleted: false },
			})

			if (productByCode && productByCode.id !== data.productId) {
				ctx.addIssue({
					path: ['code'],
					code: z.ZodIssueCode.custom,
					message: 'El código ya existe.',
				})
			}
		}),

		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { code, name } = submission.value

	const defaultCategory = await prisma.category.findFirstOrThrow({
		where: { businessId, isEssential: true },
		select: { id: true },
	})
	const defaultSupplier = await prisma.supplier.findFirstOrThrow({
		where: { businessId, isEssential: true },
		select: { id: true },
	})

	const createdProduct = await prisma.product.create({
		data: {
			code,
			isActive: false,
			name,
			sellingPrice: DEFAULT_PRICE,
			price: DEFAULT_PRICE,
			category: { connect: { id: defaultCategory.id } },
			supplier: { connect: { id: defaultSupplier.id } },
			business: { connect: { id: businessId } },
			stock: DEFAULT_STOCK,
			productAnalytics: { create: {} },
		},
	})

	return redirect(`/inventory/${createdProduct.id}`)
}
