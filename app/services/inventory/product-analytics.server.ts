import { OrderStatus } from '#app/types/orders/order-status.ts'
import { ProductOrderType } from '#app/types/orders/productOrderType.ts'
import { prisma } from '#app/utils/db.server.ts'
import { capitalize } from '#app/utils/misc.tsx'
import {
	eachDayOfInterval,
	endOfDay,
	endOfWeek,
	format,
	startOfDay,
	startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'

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

export async function getCurrentWeekProductSales({
	productId,
	businessId,
}: {
	productId: string
	businessId: string
}) {
	const weekDays = eachDayOfInterval({
		start: startOfWeek(new Date(), { weekStartsOn: 1 }),
		end: endOfWeek(new Date(), { weekStartsOn: 1 }),
	})

	const dailySales = await Promise.all(
		weekDays.map(async (day) => {
			const orders = await prisma.order.findMany({
				where: {
					businessId,
					status: OrderStatus.FINISHED,
					completedAt: { gte: startOfDay(day), lte: endOfDay(day) },
				},
				select: {
					productOrders: {
						where: {
							productId,
						},
						select: { type: true, quantity: true },
					},
				},
			})

			const { totalSales, totalReturns } = orders.reduce(
				(acc, order) => {
					order.productOrders.forEach((po) => {
						if (po.type === ProductOrderType.RETURN) {
							acc.totalReturns += po.quantity
						} else {
							acc.totalSales += po.quantity
						}
					})
					return acc
				},
				{ totalSales: 0, totalReturns: 0 },
			)

			return {
				day: capitalize(
					format(day, 'eeee', {
						locale: es,
					}),
				),
				date: format(day, 'dd/MM/yyyy', {
					locale: es,
				}),
				totalSales,
				totalReturns,
			}
		}),
	)
	return dailySales
}
