import { z } from 'zod'

export const PriceModificationStatus = {
	APPLIED: 'APPLIED',
	PENDING: 'PENDING',
} as const

export type PriceModificationStatus =
	keyof typeof PriceModificationStatus

export const allPriceModificationStatuses = Object.values(
	PriceModificationStatus,
) as [PriceModificationStatus, ...PriceModificationStatus[]]

export const PriceModificationStatusSchema = z.enum(
	allPriceModificationStatuses,
)
