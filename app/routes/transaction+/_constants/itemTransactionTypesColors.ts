import {
	type ItemTransactionType,
	TYPE_SELL,
	TYPE_PROMO,
	TYPE_RETURN,
} from '../_types/item-transactionType.ts'

export const itemTransactionTypeColors: Record<ItemTransactionType, string> = {
	[TYPE_SELL]: 'bg-green-500/80',
	[TYPE_PROMO]: 'bg-blue-500/80',
	[TYPE_RETURN]: 'bg-orange-500/80',
}
