import { requireUserId } from '#app/utils/auth.server.ts'
import { ActionFunctionArgs, json } from '@remix-run/node'
import {
	UPDATE_IT_TYPE,
	UpdateItemTransactionTypeSchema,
} from './_components/itemTransaction-typeToggle.tsx'
import { prisma } from '#app/utils/db.server.ts'

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

			await prisma.itemTransaction.update({
				where: { id: itemTransactionId },
				data: { type: itemTransactionType },
			})

			return json({ status: 'ok' } as const, { status: 200 })
		}
		default:
			return json({ status: 'error' } as const, { status: 400 })
	}
}
