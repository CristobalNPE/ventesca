import { z } from 'zod'

export enum ItemTransactionType {
	SELL = 'Venta',
	RETURN = 'Devolución',
	PROMO = 'Promoción',
}

export const allItemTransactionTypes = [
	ItemTransactionType.SELL,
	ItemTransactionType.RETURN,
	ItemTransactionType.PROMO,
] as const

export const ItemTransactionTypeSchema = z.enum(allItemTransactionTypes)
