import { PriceModificationStatus } from '#app/types/inventory/PriceModificationStatus.js'
import { PriceModification } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'

export function calculateProfitMargin({
	sellingPrice,
	cost,
}: {
	sellingPrice: number
	cost: number
}): number {
	return sellingPrice - cost
}

export function calculateMarkupPercentage({
	sellingPrice,
	cost,
}: {
	sellingPrice: number
	cost: number
}): number {
	if (cost === 0 && sellingPrice === 0) return 0
	if (cost === 0) return 100
	return Number((((sellingPrice - cost) / cost) * 100).toFixed(1))
}

export type ProcessedPriceHistory = SerializeFrom<PriceModification> & {
	percentChange: number
}

export function processPriceHistory(
	priceHistory: SerializeFrom<PriceModification>[],
): ProcessedPriceHistory[] {
	return priceHistory
		.filter(pm => pm.status === PriceModificationStatus.APPLIED)
		.map(pm => ({
			...pm,
			percentChange: calculatePercentChange(pm.oldPrice, pm.newPrice),
		}))
}

function calculatePercentChange(oldPrice: number, newPrice: number): number {
	if (oldPrice === 0) return newPrice > 0 ? 100 : 0
	return Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2))
}
