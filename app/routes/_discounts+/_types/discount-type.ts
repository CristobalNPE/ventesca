import { z } from 'zod'

export enum DiscountType {
	PERCENTAGE = 'percentage',
	FIXED = 'fixed',
}

export const allDiscountTypes = [DiscountType.PERCENTAGE, DiscountType.FIXED] as const

export const DiscountTypeSchema = z.enum(allDiscountTypes)
