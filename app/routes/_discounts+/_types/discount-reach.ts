import { z } from 'zod'

export enum DiscountScope {
	SINGLE_PRODUCT = 'single-product',
	CATEGORY = 'category',
	GLOBAL = 'global',
}

const allDiscountScopes = [
	DiscountScope.SINGLE_PRODUCT,
	DiscountScope.CATEGORY,
	DiscountScope.GLOBAL,
] as const

export const DiscountScopeSchema = z.enum(allDiscountScopes)
