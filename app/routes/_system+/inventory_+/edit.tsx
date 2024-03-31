import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { parse } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import {
	StockEditorSchema,
	UPDATE_STOCK_KEY,
} from './__item-editors/stock-editor.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	PriceEditorSchema,
	UPDATE_PRICE_KEY,
} from './__item-editors/price-editor.tsx'
import {
	SellingPriceEditorSchema,
	UPDATE_SELLINGPRICE_KEY,
} from './__item-editors/sellingPrice-editor.tsx'
import {
	CodeEditorSchema,
	UPDATE_CODE_KEY,
} from './__item-editors/code-editor.tsx'
import { z } from 'zod'
import {
	NameEditorSchema,
	UPDATE_NAME_KEY,
} from './__item-editors/name-editor.tsx'

export async function action({ request }: ActionFunctionArgs) {
	//should require with admin permission later
	await requireUserId(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	switch (intent) {
		case UPDATE_NAME_KEY: {
			const submission = await parse(formData, { schema: NameEditorSchema })

			if (submission.intent !== 'submit') {
				return json({ submission, status: 'error' } as const)
			}

			if (!submission.value) {
				return json({ submission, status: 'error' } as const, { status: 400 })
			}

			const { itemId, name } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { name },
			})

			return json({ submission, status: 'success' } as const)
		}
		case UPDATE_CODE_KEY: {
			const submission = await parse(formData, {
				schema: CodeEditorSchema.superRefine(async (data, ctx) => {
					const itemByCode = await prisma.item.findUnique({
						select: { id: true, code: true },
						where: { code: data.code },
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

			if (submission.intent !== 'submit') {
				return json({ submission, status: 'error' } as const)
			}

			if (!submission.value) {
				return json({ submission, status: 'error' } as const, { status: 400 })
			}

			const { itemId, code } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { code },
			})

			return json({ submission, status: 'success' } as const)
		}
		case UPDATE_STOCK_KEY: {
			const submission = await parse(formData, { schema: StockEditorSchema })

			if (submission.intent !== 'submit') {
				return json({ submission, status: 'error' } as const)
			}

			if (!submission.value) {
				return json({ submission, status: 'error' } as const, { status: 400 })
			}

			const { itemId, stock } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { stock },
			})

			return json({ submission, status: 'success' } as const)
		}
		case UPDATE_PRICE_KEY: {
			const submission = await parse(formData, { schema: PriceEditorSchema })

			if (submission.intent !== 'submit') {
				return json({ submission, status: 'error' } as const)
			}

			if (!submission.value) {
				return json({ submission, status: 'error' } as const, { status: 400 })
			}

			const { itemId, price } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { price },
			})

			return json({ submission, status: 'success' } as const)
		}
		case UPDATE_SELLINGPRICE_KEY:
			const submission = await parse(formData, {
				schema: SellingPriceEditorSchema,
			})

			if (submission.intent !== 'submit') {
				return json({ submission, status: 'error' } as const)
			}

			if (!submission.value) {
				return json({ submission, status: 'error' } as const, { status: 400 })
			}

			const { itemId, sellingPrice } = submission.value

			await prisma.item.update({
				where: { id: itemId },
				data: { sellingPrice },
			})

			return json({ submission, status: 'success' } as const)
		case 'update-supplier':
			break
		case 'update-category':
			break
		default:
			return json({ submission: null, status: 'error' } as const)
	}
}
