import { OrderStatus } from '#app/types/orders/order-status.ts'
import { ProductOrderType } from '#app/types/orders/productOrderType.js'
import { prisma } from '#app/utils/db.server.ts'
import { ProductOrder, User } from '@prisma/client'
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

export async function getSellersStats(
	businessId: string,
	startDate: Date,
	endDate: Date,
) {
	//get all the orders from the business in the date range
	//group by seller
	//calculate the total transactions, profit generated and average transaction time for each seller
	//return all the sellers with their stats

	const orders = await prisma.order.findMany({
		where: { businessId, completedAt: { gte: startDate, lte: endDate } },
		select: {
			seller: true,
			createdAt: true,
			status: true,
			total: true,
		},
	})

	type SellerStats = {
		user: Pick<User, 'id' | 'name' | 'username'>
		totalTransactions: number
		profitGenerated: number
		averageTransactionTime: number
	}

	const sellerStats = orders.reduce<Record<string, SellerStats>>((acc, order) => {
    return {
      // ...acc,
      [order.seller.id]: {
        user: order.seller,
        totalTransactions: 0,
        profitGenerated: 0,
        averageTransactionTime: 0,
      }
    }
  }, {})

	return [
		{
			user: null,
			totalTransactions: 0,
			profitGenerated: 0,
			averageTransactionTime: 0,
		},
	]
}

export async function getCompletedOrdersCount(businessId: string) {
	return prisma.order.count({
		where: { businessId, status: OrderStatus.FINISHED },
	})
}

export async function getTotalProfits(businessId: string) {
	const orders = await prisma.order.findMany({
		where: { businessId, status: OrderStatus.FINISHED },
		select: {
			productOrders: {
				select: {
					productId: true,
					type: true,
					quantity: true,
					productDetails: { select: { price: true, sellingPrice: true } },
				},
			},
		},
	})
	const totalProfit = await calculateTotalProfit(
		orders.flatMap(order => order.productOrders),
	)
	return totalProfit
}

export async function getTotalDailyTransactionsInRange(
	businessId: string,
	startDate: Date,
	endDate: Date,
) {
	// const daysRange = eachDayOfInterval({ start: startDate, end: endDate })

	// //use productAnalytics through products to get the total sales and returns for each day
	// const products = await prisma.product.findMany({
	// 	where: { businessId },
	// 	select: {
	// 		productAnalytics: {
	// 			where: {
	// 				createdAt: {
	// 					gte: startDate,
	// 					lte: endDate,
	// 				},
	// 			},
	// 			select: {
	// 				totalSales: true,
	// 				totalReturns: true,
	// 				createdAt: true,
	// 			},
	// 		},
	// 	},
	// })

	// const productAnalytics = await prisma.productAnalytics.findMany({
	//   where: {createdAt: {gte: startDate, lte: endDate}}

	// })

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
					productOrders: {
						select: {
							productId: true,
							type: true,
							quantity: true,
							productDetails: { select: { price: true, sellingPrice: true } },
						},
					},
				},
			})
			const profit = await calculateTotalProfit(
				orders.flatMap(order => order.productOrders),
			)
			return {
				day,
				profit,
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
async function calculateTotalProfit(
	productOrders: Array<
		Pick<ProductOrder, 'productId' | 'type' | 'quantity'> & {
			productDetails: { price: number; sellingPrice: number }
		}
	>,
) {
	const productOrderProfits = await Promise.all(
		productOrders.map(calculateProductOrderProfit),
	)

	return productOrderProfits.reduce((acc, profit) => acc + profit, 0)
}

async function calculateProductOrderProfit(
	productOrder: Pick<ProductOrder, 'productId' | 'type' | 'quantity'> & {
		productDetails: { price: number; sellingPrice: number }
	},
) {
	const profit =
		productOrder.productDetails.sellingPrice - productOrder.productDetails.price

	if (productOrder.type === ProductOrderType.RETURN) {
		return profit * productOrder.quantity * -1
	}

	return profit * productOrder.quantity
}
