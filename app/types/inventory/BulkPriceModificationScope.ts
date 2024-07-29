import { z } from 'zod'

export const BulkPriceModificationScope = {
	INVENTORY: 'INVENTORY',
	CATEGORY: 'CATEGORY',
} as const

export type BulkPriceModificationScope = keyof typeof BulkPriceModificationScope

export const allBulkPriceModificationScopes = Object.values(
	BulkPriceModificationScope,
) as [BulkPriceModificationScope, ...BulkPriceModificationScope[]]

export const BulkPriceModificationScopeSchema = z.enum(
	allBulkPriceModificationScopes,
)
