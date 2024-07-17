import { z } from 'zod'

export const BulkPriceModificationDirection = {
	INCREASE: 'INCREASE',
	DECREASE: 'DECREASE',
} as const

export type BulkPriceModificationDirection =
	keyof typeof BulkPriceModificationDirection

export const allBulkPriceModificationDirections = Object.values(
	BulkPriceModificationDirection,
) as [BulkPriceModificationDirection, ...BulkPriceModificationDirection[]]

export const BulkPriceModificationDirectionSchema = z.enum(
	allBulkPriceModificationDirections,
)
