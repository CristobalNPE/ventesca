import { DiscountType } from '../../../types/discounts/discount-type.ts'

export const discountTypeNames: Record<DiscountType, string> = {
	[DiscountType.FIXED]: 'Fijo',
	[DiscountType.PERCENTAGE]: 'Porcentual',
}
