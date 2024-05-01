import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import {
	UPDATE_IT_QUANTITY,
	UpdateItemTransactionQuantitySchema,
} from './_components/itemTransaction-quantitySelector.tsx'
import {
	UPDATE_IT_TYPE,
	UpdateItemTransactionTypeSchema,
} from './_components/itemTransaction-typeToggle.tsx'
import { TYPE_RETURN } from './_types/item-transactionType.ts'

export async function loader() {
	return redirect('/transaction')
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case UPDATE_IT_TYPE: {
			const result = UpdateItemTransactionTypeSchema.safeParse({
				itemTransactionId: formData.get('itemTransactionId'),
				itemTransactionType: formData.get('itemTransactionType'),
			})

			if (!result.success) {
				const errors = result.error.flatten()
				return json({ status: 'error', errors } as const, { status: 400 })
			}

			const { itemTransactionId, itemTransactionType } = result.data

			let { totalPrice } = await prisma.itemTransaction.findUniqueOrThrow({
				where: { id: itemTransactionId },
				select: { totalPrice: true },
			})

			if (itemTransactionType === TYPE_RETURN) {
				totalPrice = Math.abs(totalPrice) * -1
			} else {
				totalPrice = Math.abs(totalPrice)
			}

			await prisma.itemTransaction.update({
				where: { id: itemTransactionId },
				data: { type: itemTransactionType, totalPrice },
			})

			return json({ status: 'ok' } as const, { status: 200 })
		}
		default:
			return json({ status: 'error' } as const, { status: 400 })

		case UPDATE_IT_QUANTITY: {
			const result = UpdateItemTransactionQuantitySchema.safeParse({
				itemTransactionId: formData.get('itemTransactionId'),
				itemTransactionQuantity: Number(
					formData.get('itemTransactionQuantity'),
				),
			})

			if (!result.success) {
				const errors = result.error.flatten()
				return json({ status: 'error', errors } as const, { status: 400 })
			}

			const { itemTransactionId, itemTransactionQuantity } = result.data

			const {
				type,
				item: { sellingPrice },
			} = await prisma.itemTransaction.findUniqueOrThrow({
				where: { id: itemTransactionId },
				select: { type: true, item: { select: { sellingPrice: true } } },
			})

			let totalPrice = sellingPrice * itemTransactionQuantity

			if (type === TYPE_RETURN) {
				totalPrice = Math.abs(totalPrice) * -1
			} else {
				totalPrice = Math.abs(totalPrice)
			}

			await prisma.itemTransaction.update({
				where: { id: itemTransactionId },
				data: { quantity: itemTransactionQuantity, totalPrice: totalPrice },
			})
			return json({ status: 'ok' } as const, { status: 200 })
		}
	}
}
