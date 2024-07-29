import { z } from 'zod'

export const BulkPriceModificationStatus = {
	EXECUTED: 'EXECUTED',
	REVERTED: 'REVERTED',
	PENDING: 'PENDING',
} as const

export type BulkPriceModificationStatus =
	keyof typeof BulkPriceModificationStatus

export const allBulkPriceModificationStatuses = Object.values(
	BulkPriceModificationStatus,
) as [BulkPriceModificationStatus, ...BulkPriceModificationStatus[]]

export const BulkPriceModificationStatusSchema = z.enum(
	allBulkPriceModificationStatuses,
)
