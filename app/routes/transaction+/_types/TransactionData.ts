import { z } from 'zod'

const DiscountSchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
	type: z.string(),
	scope: z.string(),
	applicationMethod: z.string(),
	minimumQuantity: z.number(),
	value: z.number(),
	validFrom: z.coerce.date(),
	validUntil: z.coerce.date(),
	isActive: z.boolean(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

const ItemSchema = z.object({
	id: z.string(),
	code: z.number(),
	name: z.string(),
	sellingPrice: z.number(),
	stock: z.number(),
	discounts: z.array(DiscountSchema),
})

const ItemTransactionSchema = z.object({
	id: z.string(),
	type: z.string(),
	quantity: z.number(),
	totalPrice: z.number(),
	totalDiscount: z.number(),
	item: ItemSchema,
})

const SellerSchema = z.object({
	name: z.string(),
})

export const TransactionDetailsSchema = z.object({
	id: z.string(),
	status: z.string(),
	createdAt: z.coerce.date(),
	paymentMethod: z.string(),
	totalDiscount: z.number(),
	total: z.number(),
	directDiscount: z.number(),
	subtotal: z.number(),
	seller: SellerSchema,
	itemTransactions: z.array(ItemTransactionSchema),
})

export type TransactionDetails = z.infer<typeof TransactionDetailsSchema>
