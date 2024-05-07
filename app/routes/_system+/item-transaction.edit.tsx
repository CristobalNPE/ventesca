// import { json, redirect, type ActionFunctionArgs } from '@remix-run/node'
// import { z } from 'zod'
// import { ItemTransactionTypeSchema } from '#app/components/item-transaction-row.tsx'
// import { requireUserId } from '#app/utils/auth.server.ts'
// import { prisma } from '#app/utils/db.server.ts'

// const ItemTransactionSchema = z.object({
// 	id: z.string(),
// 	type: ItemTransactionTypeSchema,
// 	quantity: z.coerce.number(),
// 	totalPrice: z.coerce.number(),
// 	totalDiscount: z.coerce.number(),
// })

// export async function loader() {
// 	return redirect('/sell')
// }

// export async function action({ request }: ActionFunctionArgs) {
// 	await requireUserId(request)
// 	const formData = await request.formData()

// 	const result = ItemTransactionSchema.safeParse({
// 		id: formData.get('it-id'),
// 		type: formData.get('it-vpd'),
// 		quantity: formData.get('it-quantity'),
// 		totalPrice: formData.get('it-total-price'),
// 		totalDiscount: formData.get('it-total-discount'),
// 	})

// 	if (!result.success) {
// 		return json({ status: 'error', errors: result.error.flatten() } as const, {
// 			status: 400,
// 		})
// 	}

// 	const { id, type, quantity, totalPrice, totalDiscount } = result.data

// 	await prisma.itemTransaction.upsert({
// 		where: { id },
// 		create: {
// 			id,
// 			type,
// 			quantity,
// 			totalPrice,
// 			totalDiscount,
// 		},
// 		update: {
// 			type,
// 			quantity,
// 			totalPrice,
// 			totalDiscount,
// 		},
// 	})

// 	return json({ status: 'success' } as const)
// }
