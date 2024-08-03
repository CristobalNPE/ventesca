import { ProductOrderType } from '../types/orders/productOrderType.ts'

export const productOrderTypeBgColors: Record<ProductOrderType, string> = {
	[ProductOrderType.SELL]: 'bg-green-500/80',
	[ProductOrderType.PROMO]: 'bg-blue-500/80',
	[ProductOrderType.RETURN]: 'bg-orange-500/80',
}

export const productOrderTypeBgFocusColors: Record<ProductOrderType, string> = {
	[ProductOrderType.SELL]: 'focus:bg-green-500/20',
	[ProductOrderType.PROMO]: 'focus:bg-blue-500/20',
	[ProductOrderType.RETURN]: 'focus:bg-orange-500/20',
}
