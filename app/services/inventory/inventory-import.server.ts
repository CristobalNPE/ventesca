import { ImportInventoryFromFileSchema } from '#app/components/inventory/inventory-import.tsx'
import {
	ParsedProduct,
	parseExcelTemplate,
	validateParsedProduct,
	validateTemplate,
} from '#app/routes/resources+/inventory.template-generator.tsx'

import { prisma } from '#app/utils/db.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { type Product } from '@prisma/client'
import { json } from '@remix-run/node'
import { z } from 'zod'
import { getDefaultCategory } from '../categories/categories-queries.server'
import { getDefaultSupplier } from '../suppliers/suppliers-queries.server'

export async function createProductsFromImport({
	formData,
	businessId,
}: {
	formData: FormData
	businessId: string
}) {
	const submission = await parseWithZod(formData, {
		schema: ImportInventoryFromFileSchema.superRefine(async (data, ctx) => {
			const buffer = Buffer.from(await data.template.arrayBuffer())
			const isValidTemplate = validateTemplate(buffer)

			if (!isValidTemplate) {
				ctx.addIssue({
					path: ['template'],
					code: z.ZodIssueCode.custom,
					message: 'La plantilla cargada no es válida.',
				})
			}
		}),
		async: true,
	})

	if (submission.status !== 'success') {
		return json(
			{
				result: submission.reply(),
				productsWithErrors: null,
				productsWithWarnings: null,
				successfulProducts: null,
			},
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { template } = submission.value

	const arrayBuffer = await template.arrayBuffer()
	const buffer = Buffer.from(arrayBuffer)

	const productsReceived = parseExcelTemplate(buffer)

	const businessCategories = await prisma.category.findMany({
		where: { businessId },
		select: { id: true, code: true },
	})
	const businessSuppliers = await prisma.supplier.findMany({
		where: { businessId },
		select: { id: true, code: true },
	})
	const fallbackCategory = await getDefaultCategory(businessId)
	const fallbackSupplier = await getDefaultSupplier(businessId)

	const existingProductCodesOnly = await prisma.product.findMany({
		where: { businessId, code: { in: productsReceived.map((p) => p.code) } },
		select: { code: true },
	})
	const existingCodes = new Set(existingProductCodesOnly.map((p) => p.code))

	const productsToCreate: Pick<
		Product,
		| 'code'
		| 'name'
		| 'businessId'
		| 'categoryId'
		| 'supplierId'
		| 'cost'
		| 'sellingPrice'
		| 'stock'
		| 'isActive'
	>[] = []
	const productsWithErrors: Array<{
		parsedProduct: ParsedProduct
		message: string
	}> = []
	const productsWithWarnings: Array<{
		parsedProduct: ParsedProduct
		message: string
	}> = []
	const successfulProducts: Array<ParsedProduct> = []
	for (const parsedProduct of productsReceived) {
		if (existingCodes.has(parsedProduct.code)) {
			productsWithErrors.push({
				parsedProduct,
				message: 'Código se encuentra registrado en inventario.',
			})
			continue
		}
		if (new Set(productsToCreate.map((p) => p.code)).has(parsedProduct.code)) {
			productsWithErrors.push({
				parsedProduct,
				message: 'Código se encuentra duplicado en plantilla.',
			})
			continue
		}

		const validationResult = await validateParsedProduct({
			parsedProduct,
			businessCategories,
			businessSuppliers,
			fallbackCategory,
			fallbackSupplier,
		})

		if (!validationResult.isValidProductName) {
			productsWithErrors.push({
				parsedProduct,
				message: validationResult.errorMessage,
			})
			continue
		}

		productsToCreate.push({
			code: parsedProduct.code,
			name: parsedProduct.name,
			cost: validationResult.cost,
			sellingPrice: validationResult.sellingPrice,
			stock: validationResult.stock,
			businessId,
			categoryId: validationResult.categoryId,
			supplierId: validationResult.supplierId,
			isActive:
				validationResult.cost > 0 &&
				validationResult.sellingPrice > 0 &&
				validationResult.stock > 0,
		})

		if (validationResult.errorMessage) {
			productsWithWarnings.push({
				parsedProduct,
				message: validationResult.errorMessage,
			})
		} else {
			successfulProducts.push(parsedProduct)
		}
	}

	await prisma.$transaction(async (tx) => {
		const products = await tx.product.createManyAndReturn({
			data: productsToCreate,
			select: { id: true },
		})

		await tx.productAnalytics.createMany({
			data: products.map((product) => ({
				productId: product.id,
				businessId,
			})),
		})
	})

	return json({
		result: submission.reply(),
		productsWithErrors,
		productsWithWarnings,
		successfulProducts,
	})
}
