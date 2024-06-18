import { ProductOrderType } from '../_types/productOrderType.ts'

export const productOrderTypeColors: Record<ProductOrderType, string> = {
	[ProductOrderType.SELL]: 'bg-green-500/80',
	[ProductOrderType.PROMO]: 'bg-blue-500/80',
	[ProductOrderType.RETURN]: 'bg-orange-500/80',
}
