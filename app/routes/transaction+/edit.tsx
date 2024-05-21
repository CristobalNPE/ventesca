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
import { ItemTransactionType } from './_types/item-transactionType.ts'
import { Discount, ItemTransaction } from '@prisma/client'
import { DiscountType } from '../_discounts+/_types/discount-type.ts'
import { DiscountApplicationMethod } from '../_discounts+/_types/discount-applicationMethod.ts'

export async function loader() {
	return redirect('/transaction')
}

type ItemTransactionWithRelations = ItemTransaction & {
	item: {
		discounts: Discount[]
		sellingPrice: number
	}
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const formData = await request.formData()

	const intent = formData.get('intent')

	switch (intent) {
		case UPDATE_IT_TYPE: {
			return await handleUpdateType(formData)
		}

		case UPDATE_IT_QUANTITY: {
			return await handleUpdateQuantity(formData)
		}
		default:
			return json({ status: 'error' } as const, { status: 400 })
	}
}

async function handleUpdateType(formData: FormData) {
	const result = UpdateItemTransactionTypeSchema.safeParse({
		itemTransactionId: formData.get('itemTransactionId'),
		itemTransactionType: formData.get('itemTransactionType'),
	})

	if (!result.success) {
		const errors = result.error.flatten()
		return json({ status: 'error', errors } as const, { status: 400 })
	}

	const { itemTransactionId, itemTransactionType } = result.data

	const currentItemTransaction =
		(await prisma.itemTransaction.findUniqueOrThrow({
			where: { id: itemTransactionId },
			select: {
				totalPrice: true,
				quantity: true,
				item: { select: { discounts: true, sellingPrice: true } },
			},
		})) as ItemTransactionWithRelations

	const { totalPrice, totalDiscount } = calculateTotals(
		currentItemTransaction,
		itemTransactionType,
	)

	await prisma.itemTransaction.update({
		where: { id: itemTransactionId },
		data: {
			type: itemTransactionType,
			totalPrice,
			totalDiscount,
		},
	})

	return json({ status: 'ok' } as const, { status: 200 })
}

async function handleUpdateQuantity(formData: FormData) {
	const result = UpdateItemTransactionQuantitySchema.safeParse({
		itemTransactionId: formData.get('itemTransactionId'),
		itemTransactionQuantity: Number(formData.get('itemTransactionQuantity')),
	})

	if (!result.success) {
		const errors = result.error.flatten()
		return json({ status: 'error', errors } as const, { status: 400 })
	}

	const { itemTransactionId, itemTransactionQuantity } = result.data

	const currentItemTransaction =
		(await prisma.itemTransaction.findUniqueOrThrow({
			where: { id: itemTransactionId },
			select: {
				type: true,
				totalPrice: true,

				item: { select: { discounts: true, sellingPrice: true } },
			},
		})) as ItemTransactionWithRelations

	const { totalPrice, totalDiscount } = calculateTotals(
		{ ...currentItemTransaction, quantity: itemTransactionQuantity },
		currentItemTransaction.type as ItemTransactionType,
	)

	await prisma.itemTransaction.update({
		where: { id: itemTransactionId },
		data: {
			quantity: itemTransactionQuantity,
			totalPrice,
			totalDiscount,
		},
	})

	return json({ status: 'ok' } as const, { status: 200 })
}

function calculateTotals(
	itemTransaction: ItemTransactionWithRelations,
	transactionType: ItemTransactionType,
) {
	let totalPrice = itemTransaction.item.sellingPrice * itemTransaction.quantity
	let totalDiscountToApply = 0

	for (let discount of itemTransaction.item.discounts) {
		totalDiscountToApply += calculateDiscountValue(
			discount,
			itemTransaction,
			itemTransaction.item.sellingPrice,
		)
	}

	if (transactionType === ItemTransactionType.RETURN) {
		totalPrice = Math.abs(totalPrice) * -1
	} else {
		totalPrice = Math.abs(totalPrice)
	}

	if (transactionType === ItemTransactionType.PROMO) {
		totalPrice -= totalDiscountToApply
	}

	return { totalPrice, totalDiscount: totalDiscountToApply }
}

function calculateDiscountValue(
	discount: Pick<
		Discount,
		'value' | 'type' | 'applicationMethod' | 'minimumQuantity'
	>,
	itemTransaction: Pick<ItemTransaction, 'quantity'>,
	itemSellingPrice: number,
) {
	let discountTotalValue = 0
	const isEligibleForDiscount =
		itemTransaction.quantity >= discount.minimumQuantity

	if (isEligibleForDiscount) {
		if (discount.type === DiscountType.FIXED) {
			if (discount.applicationMethod === DiscountApplicationMethod.BY_ITEM) {
				discountTotalValue = itemTransaction.quantity * discount.value
			}
			if (discount.applicationMethod === DiscountApplicationMethod.TO_TOTAL) {
				discountTotalValue = discount.value
			}
		}
		if (discount.type === DiscountType.PERCENTAGE) {
			discountTotalValue =
				(itemTransaction.quantity * itemSellingPrice * discount.value) / 100
		}
	}

	return discountTotalValue
}
