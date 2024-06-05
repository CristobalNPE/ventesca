import { z } from 'zod'

export enum DiscountScope {
	SINGLE_ITEM = 'single-item',
	CATEGORY = 'category',
	GLOBAL = 'global',
}

const allDiscountScopes = [
	DiscountScope.SINGLE_ITEM,
	DiscountScope.CATEGORY,
	DiscountScope.GLOBAL,
] as const

export const DiscountScopeSchema = z.enum(allDiscountScopes)
