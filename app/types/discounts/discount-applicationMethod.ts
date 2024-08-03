import { z } from 'zod'

export enum DiscountApplicationMethod {
	BY_PRODUCT = 'by-product',
	TO_TOTAL = 'to-total',
}

export const allDiscountApplicationMethods = [
	DiscountApplicationMethod.BY_PRODUCT,
	DiscountApplicationMethod.TO_TOTAL,
] as const

export const DiscountApplicationMethodSchema = z.enum(
	allDiscountApplicationMethods,
)
