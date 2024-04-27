import { z } from 'zod'

export const TYPE_SELL = 'Venta'
export const TYPE_RETURN = 'Devolución'
export const TYPE_PROMO = 'Promoción'

const allItemTransactionTypes = [TYPE_SELL, TYPE_RETURN, TYPE_PROMO] as const

export const ItemTransactionTypeSchema = z.enum(allItemTransactionTypes)
export type ItemTransactionType = z.infer<typeof ItemTransactionTypeSchema>
