import { z } from 'zod'

export const BulkPriceModificationStrategy = {
	PERCENTAGE: 'PERCENTAGE',
	FIXED_AMOUNT: 'FIXED_AMOUNT',
} as const

export type BulkPriceModificationStrategy =
	keyof typeof BulkPriceModificationStrategy

export const allBulkPriceModificationStrategies = Object.values(
	BulkPriceModificationStrategy,
) as [BulkPriceModificationStrategy, ...BulkPriceModificationStrategy[]]

export const BulkPriceModificationStrategySchema = z.enum(
	allBulkPriceModificationStrategies,
)
