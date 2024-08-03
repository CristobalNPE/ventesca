import { z } from 'zod'

export enum DiscountType {
	PERCENTAGE = 'percentage',
	FIXED = 'fixed',
}

//?TRY THIS INSTEAD
// const DiscountType = {
// 	PERCENTAGE: 'PERCENTAGE',
// 	FIXED: 'FIXED',
// } as const


export const allDiscountTypes = [DiscountType.PERCENTAGE, DiscountType.FIXED] as const

export const DiscountTypeSchema = z.enum(allDiscountTypes)
