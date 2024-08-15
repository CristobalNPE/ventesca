import { prisma } from "#app/utils/db.server.ts"

export async function getBestSellingProduct(businessId: string) {
	const bestSeller = await prisma.productAnalytics.findFirst({
		where: {
			product: {
				isDeleted: false,
				businessId: businessId,
			},
		},
		orderBy: {
			totalSales: 'desc',
		},
		select: {
			totalSales: true,
			totalProfit: true,
			product: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	})

	return bestSeller
}
export async function getMostProfitProduct(businessId: string) {
	const mostProfit = await prisma.productAnalytics.findFirst({
		where: {
			product: {
				isDeleted: false,
				businessId: businessId,
			},
		},
		orderBy: {
			totalProfit: 'desc',
		},
		select: {
			totalSales: true,
			totalProfit: true,
			product: {
				select: {
					id: true,
					name: true,
					code: true,
				},
			},
		},
	})

	return mostProfit
}
