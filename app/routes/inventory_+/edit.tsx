import { getBusinessId } from '#app/utils/auth.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'

import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { invariantResponse } from '@epic-web/invariant'
import {
	CategoryEditorSchema,
	updateProductCategoryActionIntent,
} from './__product-editors/category-editor.tsx'
import {
	CodeEditorSchema,
	updateProductCodeActionIntent,
} from './__product-editors/code-editor.tsx'
import {
	ProductNameEditorSchema,
	updateProductNameActionIntent,
} from './__product-editors/name-editor.tsx'
import {
	PriceEditorSchema,
	updateProductPriceActionIntent,
} from './__product-editors/price-editor.tsx'
import {
	SellingPriceEditorSchema,
	updateProductSellingPriceActionIntent,
} from './__product-editors/sellingPrice-editor.tsx'
import {
	STATUS_ENABLED,
	StatusEditorSchema,
	updateProductStatusActionIntent,
} from './__product-editors/status-editor.tsx'
import {
	StockEditorSchema,
	updateProductStockActionIntent,
} from './__product-editors/stock-editor.tsx'
import {
	SupplierEditorSchema,
	updateProductSupplierActionIntent,
} from './__product-editors/supplier-editor.tsx'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()

	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case updateProductNameActionIntent: {
			return await updateProductNameAction({ formData })
		}
		case updateProductCodeActionIntent: {
			return await updateProductCodeAction({ formData, businessId })
		}
		case updateProductStockActionIntent: {
			return await updateProductStockAction({ formData })
		}
		case updateProductPriceActionIntent: {
			return await updateProductPriceAction({ formData })
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

async function updateProductNameAction({ formData }: { formData: FormData }) {
	const submission = await parseWithZod(formData, {
		schema: ProductNameEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, name } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { name },
	})

	return json({ result: submission.reply() })
}

async function updateProductCodeAction({
	formData,
	businessId,
}: {
	formData: FormData
	businessId: string
}) {
	const submission = await parseWithZod(formData, {
		schema: CodeEditorSchema.superRefine(async (data, ctx) => {
			const productByCode = await prisma.product.findFirst({
				select: { id: true, code: true },
				where: { businessId, code: data.code },
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

	const { productId, code } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { code },
	})

	return json({ result: submission.reply() })
}

async function updateProductStockAction({ formData }: { formData: FormData }) {
	const submission = await parseWithZod(formData, {
		schema: StockEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { productId, stock } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { stock },
	})

	return json({ result: submission.reply() })
}

async function updateProductPriceAction({ formData }: { formData: FormData }) {
	const submission = await parseWithZod(formData, {
		schema: PriceEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, price } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { price },
	})

	return json({ result: submission.reply() })
}

async function updateProductSellingPriceAction({
	formData,
}: {
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
		schema: SellingPriceEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, sellingPrice } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { sellingPrice },
	})

	return json({ result: submission.reply() })
}

async function updateProductSupplierAction({
	formData,
}: {
	formData: FormData
}) {
	const submission = await parseWithZod(formData, {
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
	const submission = await parseWithZod(formData, {
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
		schema: StatusEditorSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { productId, status } = submission.value

	await prisma.product.update({
		where: { id: productId },
		data: { isActive: status === STATUS_ENABLED ? true : false },
	})

	return json({ result: submission.reply() })
}
