import { DiscountApplicationMethod } from '../../../types/discounts/discount-applicationMethod.ts'

export const discountAppmethodNames: Record<DiscountApplicationMethod, string> =
	{
		[DiscountApplicationMethod.BY_PRODUCT]: 'Por articulo',
		[DiscountApplicationMethod.TO_TOTAL]: 'Al total',
	}
