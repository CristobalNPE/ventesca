import { requireUserId } from '#app/utils/auth.server.ts'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { parse } from '@conform-to/zod'
import { ActionFunctionArgs, json } from '@remix-run/node'
import { StockEditorSchema } from './__item-editors/stock-editor.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { PriceEditorSchema } from './__item-editors/price-editor.tsx'
import { SellingPriceEditorSchema } from './__item-editors/sellingPrice-editor.tsx'

export async function action({ request }: ActionFunctionArgs) {
	//should require with admin permission later
	await requireUserId(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)

	const intent = formData.get('intent')

	switch (intent) {
		case 'update-name':
			break
		case 'update-code':
			break
		case 'update-stock': {
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
		case 'update-price': {
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
		case 'update-sellingPrice':
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
