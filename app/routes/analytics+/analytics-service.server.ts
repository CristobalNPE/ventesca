import { type User } from '@prisma/client'
import {
	eachDayOfInterval,
	endOfDay,
	endOfMonth,
	endOfWeek,
	format,
	startOfDay,
	startOfMonth,
	startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { OrderStatus } from '#app/types/orders/order-status.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function getTopSellerStatsForWeek({
	businessId,
	referenceDay = new Date(),
}: {
	businessId: string
	referenceDay?: Date
}) {
	const start = startOfWeek(referenceDay, { weekStartsOn: 1 })
	const end = endOfWeek(start, { weekStartsOn: 1 })

	const sellerStats =
		(await getSellersStats({
			businessId,
			startDate: start,
			endDate: end,
		})) ?? []

	if (sellerStats.length === 0) return null

	const topSeller = sellerStats.reduce((topSeller, seller) => {
		return seller.totalTransactions > topSeller.totalTransactions
			? seller
			: topSeller
	})

	return topSeller
}

async function getSellersStats({
	businessId,
	startDate,
	endDate,
}: {
	businessId: string
	startDate: Date
	endDate: Date
}) {
	const orders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: startDate, lte: endDate },
			status: OrderStatus.FINISHED,
		},
		select: {
			seller: {
				select: {
					id: true,
					name: true,
					username: true,
					image: { select: { id: true } },
				},
			},
			createdAt: true,
			completedAt: true,
			status: true,
			profit: true,
		},
	})

	type SellerStats = {
		sellerData: Pick<User, 'id' | 'name' | 'username'> & {
			image: { id: string } | null
		}
		totalTransactions: number
		profitGenerated: number
		averageTransactionTime: number
	}

	if (orders.length === 0) return null

	const sellerStats = orders.reduce<Record<string, SellerStats>>(
		(acc, order) => {
			const sellerId = order.seller.id
			if (!acc[sellerId]) {
				acc[sellerId] = {
					sellerData: order.seller,
					totalTransactions: 0,
					profitGenerated: 0,
					averageTransactionTime: 0,
				}
			}

			acc[sellerId].totalTransactions += 1
			acc[sellerId].profitGenerated += order.profit
			const transactionTime =
				order.completedAt.getTime() - order.createdAt.getTime()
			acc[sellerId].averageTransactionTime =
				(acc[sellerId].averageTransactionTime *
					(acc[sellerId].totalTransactions - 1) +
					transactionTime) /
				acc[sellerId].totalTransactions

			return acc
		},
		{},
	)

	return Object.values(sellerStats).map(stats => ({
		...stats,
		averageTransactionTime: Math.round(stats.averageTransactionTime / 1000), // Convert to seconds
	}))
}

export async function getCompletedOrdersCount(businessId: string) {
	return prisma.order.count({
		where: { businessId, status: OrderStatus.FINISHED },
	})
}

export async function getTotalProfits(businessId: string) {
	const orders = await prisma.order.findMany({
		where: { businessId, status: OrderStatus.FINISHED },
		select: { profit: true },
	})
	const totalProfit = orders
		.map(order => order.profit)
		.reduce((acc, profit) => acc + profit, 0)

	return totalProfit
}

export async function getTotalDailyTransactionsInRange(
	businessId: string,
	startDate: Date,
	endDate: Date,
) {
	return {
		sales: 0,
		returns: 0,
	}
}

export async function getDailyProfitsInRange({
	businessId,
	startDate,
	endDate,
}: {
	businessId: string
	startDate: Date
	endDate: Date
}) {
	const daysRange = eachDayOfInterval({ start: startDate, end: endDate })

	const dailyProfit = await Promise.all(
		daysRange.map(async day => {
			const orders = await prisma.order.findMany({
				where: {
					businessId,
					status: OrderStatus.FINISHED,
					completedAt: { gte: startOfDay(day), lte: endOfDay(day) },
				},
				select: {
					profit: true,
				},
			})

			const totalProfit = orders
				.map(order => order.profit)
				.reduce((acc, profit) => acc + profit, 0)

			return {
				day,
				profit: totalProfit,
			}
		}),
	)

	return dailyProfit
}

export async function getDailyProfitsForWeek({
	businessId,
	referenceDay = new Date(),
}: {
	businessId: string
	referenceDay?: Date
}) {
	const start = startOfWeek(referenceDay, { weekStartsOn: 1 })
	const end = endOfWeek(start, { weekStartsOn: 1 })
	const dailyProfits = await getDailyProfitsInRange({
		businessId,
		startDate: start,
		endDate: end,
	})
	return dailyProfits
}

export async function getWeeklyProfitsForMonth({
	businessId,
	referenceDay = new Date(),
}: {
	businessId: string
	referenceDay?: Date
}) {
	const firstDayOfMonth = startOfMonth(referenceDay)
	const lastDayOfMonth = endOfMonth(referenceDay)

	const monthlyProfits = await getDailyProfitsInRange({
		businessId,
		startDate: firstDayOfMonth,
		endDate: lastDayOfMonth,
	})

	return {
		month: format(referenceDay, 'MMMM', {
			locale: es,
		}),

		profits: Object.entries(
			monthlyProfits.reduce((acc: Record<string, number>, day) => {
				const weekStart = startOfWeek(day.day, { weekStartsOn: 1 })
				const weekEnd = endOfWeek(day.day, { weekStartsOn: 1 })
				const weekRange = `${format(weekStart, 'yyyy-MM-dd')}|${format(weekEnd, 'yyyy-MM-dd')}`
				acc[weekRange] = (acc[weekRange] || 0) + day.profit
				return acc
			}, {}),
		).map(([weekRange, weekProfit]) => {
			const [weekStart, weekEnd] = weekRange.split('|')
			return {
				weekStart: new Date(weekStart!),
				weekEnd: new Date(weekEnd!),
				weekProfit,
			}
		}),
	}
}

export async function getTopSellingProducts(businessId: string) {
	const products = await prisma.product.findMany({
		where: { businessId },
		select: {
			id: true,
			name: true,
			code: true,
			productAnalytics: { select: { totalSales: true } },
		},
		orderBy: {
			productAnalytics: {
				totalSales: 'desc',
			},
		},
		take: 10,
	})

	//only return name and total sales
	return products.map((product, i) => ({
		id: product.id,
		top: i + 1,
		name: product.name,
		code: product.code,
		totalSales: product.productAnalytics!.totalSales,
	}))
}
