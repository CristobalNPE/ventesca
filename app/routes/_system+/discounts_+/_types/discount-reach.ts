import { z } from 'zod'

export enum DiscountScope {
	SINGLE_ITEM = 'single-item',
	CATEGORY = 'category',
}

const allDiscountScopes = [
	DiscountScope.SINGLE_ITEM,
	DiscountScope.CATEGORY,
] as const

export const DiscountScopeSchema = z.enum(allDiscountScopes)
