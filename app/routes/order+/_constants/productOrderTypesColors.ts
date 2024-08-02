import { ProductOrderType } from '../../../types/orders/productOrderType.ts'

export const productOrderTypeBgColors: Record<ProductOrderType, string> = {
	[ProductOrderType.SELL]: 'bg-green-500/80',
	[ProductOrderType.PROMO]: 'bg-blue-500/80',
	[ProductOrderType.RETURN]: 'bg-orange-500/80',
}

export const productOrderTypeBorderColors: Record<ProductOrderType, string> = {
	[ProductOrderType.SELL]: 'focus:border-green-500/80',
	[ProductOrderType.PROMO]: 'focus:border-blue-500/80',
	[ProductOrderType.RETURN]: 'focus:border-orange-500/80',
}
