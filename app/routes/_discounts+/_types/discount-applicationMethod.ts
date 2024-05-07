import { z } from 'zod'

export enum DiscountApplicationMethod {
	BY_ITEM = 'by-item',
	TO_TOTAL = 'to-total',
}

const allDiscountApplicationMethods = [
	DiscountApplicationMethod.BY_ITEM,
	DiscountApplicationMethod.TO_TOTAL,
] as const

export const DiscountApplicationMethodSchema = z.enum(
	allDiscountApplicationMethods,
)
