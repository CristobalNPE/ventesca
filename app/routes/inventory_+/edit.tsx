import { type ActionFunctionArgs, json } from '@remix-run/node'
import { z } from 'zod'
import { requireUserId } from '#app/utils/auth.server.ts'

import { prisma } from '#app/utils/db.server.ts'
import {
	CategoryEditorSchema,
	UPDATE_CATEGORY_KEY,
} from './__item-editors/category-editor.tsx'
import {
	CodeEditorSchema,
	UPDATE_CODE_KEY,
} from './__item-editors/code-editor.tsx'
import {
	ItemNameEditorSchema,
	UPDATE_ITEM_NAME_KEY,
} from './__item-editors/name-editor.tsx'
import {
	PriceEditorSchema,
	UPDATE_PRICE_KEY,
} from './__item-editors/price-editor.tsx'
import {
	SellingPriceEditorSchema,
	UPDATE_SELLINGPRICE_KEY,
} from './__item-editors/sellingPrice-editor.tsx'
import {
	STATUS_ENABLED,
	StatusEditorSchema,
	UPDATE_STATUS_KEY,
} from './__item-editors/status-editor.tsx'
import {
	StockEditorSchema,
	UPDATE_STOCK_KEY,
} from './__item-editors/stock-editor.tsx'
import {
	SupplierEditorSchema,
	UPDATE_SUPPLIER_KEY,
} from './__item-editors/supplier-editor.tsx'
import { getWhereBusinessQuery } from '#app/utils/global-queries.ts'
import { parseWithZod } from '@conform-to/zod'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')

	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case UPDATE_ITEM_NAME_KEY: {
			const submission = await parseWithZod(formData, {
				schema: ItemNameEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { itemId, name } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { name },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_CODE_KEY: {
			const submission = await parseWithZod(formData, {
				schema: CodeEditorSchema.superRefine(async (data, ctx) => {
					const itemByCode = await prisma.item.findFirst({
						select: { id: true, code: true },
						where: { ...getWhereBusinessQuery(userId), code: data.code },
					})

					if (itemByCode && itemByCode.id !== data.itemId) {
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

			const { itemId, code } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { code },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_STOCK_KEY: {
			const submission = await parseWithZod(formData, {
				schema: StockEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}
			const { itemId, stock } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { stock },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_PRICE_KEY: {
			const submission = await parseWithZod(formData, {
				schema: PriceEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { itemId, price } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { price },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_SELLINGPRICE_KEY:
			const submission = await parseWithZod(formData, {
				schema: SellingPriceEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { itemId, sellingPrice } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { sellingPrice },
			})

			return json({ result: submission.reply() })
		case UPDATE_SUPPLIER_KEY: {
			const submission = await parseWithZod(formData, {
				schema: SupplierEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { itemId, supplierId } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { supplier: { connect: { id: supplierId } } },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_CATEGORY_KEY: {
			const submission = await parseWithZod(formData, {
				schema: CategoryEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { itemId, categoryId } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { category: { connect: { id: categoryId } } },
			})

			return json({ result: submission.reply() })
		}
		case UPDATE_STATUS_KEY: {
			const submission = await parseWithZod(formData, {
				schema: StatusEditorSchema,
			})

			if (submission.status !== 'success') {
				return json(
					{ result: submission.reply() },
					{ status: submission.status === 'error' ? 400 : 200 },
				)
			}

			const { itemId, status } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { isActive: status === STATUS_ENABLED ? true : false },
			})

			return json({ result: submission.reply() })
		}
	}
}
