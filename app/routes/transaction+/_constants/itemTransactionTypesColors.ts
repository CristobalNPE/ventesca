import { ItemTransactionType } from '../_types/item-transactionType.ts'

export const itemTransactionTypeColors: Record<ItemTransactionType, string> = {
	[ItemTransactionType.SELL]: 'bg-green-500/80',
	[ItemTransactionType.PROMO]: 'bg-blue-500/80',
	[ItemTransactionType.RETURN]: 'bg-orange-500/80',
}
