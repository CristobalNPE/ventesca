import { prisma } from '#app/utils/db.server.js'
import { capitalize } from '#app/utils/misc.tsx'
import { Prisma, type ProductOrder as ProductOrderModel } from '@prisma/client'
import {
	eachDayOfInterval,
	endOfDay,
	endOfWeek,
	format,
	startOfDay,
	startOfWeek,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { OrderStatus } from '../../types/orders/order-status'
import { ProductOrderType } from '../../types/orders/productOrderType'
export enum OrderAction {
	CREATE,
	DELETE,
	DISCARD,
	UNDISCARD,
}

export async function updateProductStockAndAnalytics({
	productOrders,
	action,
	transactionClient,
}: {
	productOrders: ProductOrderModel[]
	action: OrderAction
	transactionClient?: Prisma.TransactionClient
}) {
	let prismaClient = transactionClient ?? prisma
	for (let productOrder of productOrders) {
		const product = await prismaClient.product.findUniqueOrThrow({
			where: { id: productOrder.productId },
			select: { stock: true, cost: true, sellingPrice: true },
		})

		//!Need to check for discounts as well, be it global or product tied.
		const profitPerUnit = product.sellingPrice - product.cost
		const totalProfit = profitPerUnit * productOrder.quantity

		let stockChange = 0
		let salesChange = 0
		let profitChange = 0
		let returnsChange = 0

		switch (action) {
			case OrderAction.CREATE:
				if (productOrder.type === ProductOrderType.RETURN) {
					stockChange = productOrder.quantity
					salesChange = -productOrder.quantity
					profitChange = -totalProfit
					returnsChange = productOrder.quantity
				} else {
					// SALE or PROMO
					stockChange = -productOrder.quantity
					salesChange = productOrder.quantity
					profitChange = totalProfit
				}
				break
			case OrderAction.DELETE:
			case OrderAction.DISCARD:
				if (productOrder.type === ProductOrderType.RETURN) {
					stockChange = -productOrder.quantity
					salesChange = productOrder.quantity
					profitChange = totalProfit
					returnsChange = -productOrder.quantity
				} else {
					// SALE or PROMO
					stockChange = productOrder.quantity
					salesChange = -productOrder.quantity
					profitChange = -totalProfit
				}
				break
			case OrderAction.UNDISCARD:
				if (productOrder.type === ProductOrderType.RETURN) {
					stockChange = productOrder.quantity
					salesChange = -productOrder.quantity
					profitChange = -totalProfit
					returnsChange = productOrder.quantity
				} else {
					// SALE or PROMO
					stockChange = -productOrder.quantity
					salesChange = productOrder.quantity
					profitChange = totalProfit
				}
				break
		}

		//We do not allow stock to be negative, even if we allow sales to go through.
		if (product.stock + stockChange < 0) {
			stockChange = -product.stock
		}

		const update: Prisma.ProductUpdateInput = {
			stock: { increment: stockChange },

			productAnalytics: {
				update: {
					data: {
						totalSales: { increment: salesChange },
						totalProfit: { increment: profitChange },
						totalReturns: { increment: returnsChange },
					},
				},
			},
		}

		await prismaClient.product.update({
			where: { id: productOrder.productId },
			data: update,
		})

		// productOrder.type === ProductOrderType.RETURN
		// 	? acc + productOrder.productDetails.cost * productOrder.quantity
		// 	: acc - productOrder.productDetails.cost * productOrder.quantity

		await prismaClient.productOrder.update({
			where: { id: productOrder.id },
			//?: Is this ok?
			data: {
				profit:
					productOrder.totalPrice -
					productOrder.totalDiscount +
					(productOrder.type === ProductOrderType.RETURN
						? product.cost * productOrder.quantity
						: product.cost * productOrder.quantity * -1),
			},
		})
	}
}

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

export async function getLowStockProducts(businessId: string, limit: number) {
	const lowStockProducts = await prisma.product.findMany({
		where: { stock: { lte: limit }, businessId, isDeleted: false },
		select: { id: true, stock: true },
	})

	const zeroStockProducts = lowStockProducts.filter(
		product => product.stock <= 0,
	)

	return { lowStockProducts, zeroStockProducts }
}

type OverallTotals = {
	totalItems: number
	totalValue: number
	totalSellingValue: number
	potentialProfit: number
	profitMarginPercentage: number
	markupPercentage: number
}

export async function getInventoryValueByCategory(businessId: string) {
	const inventoryByCategory = await prisma.category.findMany({
		where: { businessId },
		select: {
			id: true,
			description: true,
			colorCode: true,
			products: {
				where: {
					isDeleted: false,
					isActive: true,
					stock: { gt: 0 },
				},
				select: {
					sellingPrice: true,
					cost: true,
					stock: true,
				},
			},
		},
	})

	const result = inventoryByCategory.map(category => {
		let totalValue = 0
		let totalSellingValue = 0
		let totalItems = 0

		category.products.forEach(product => {
			totalValue += product.cost * product.stock
			totalSellingValue += product.sellingPrice * product.stock
			totalItems += product.stock
		})

		const potentialProfit = totalSellingValue - totalValue

		//Percentage of the revenue that is profit
		const profitMarginPercentage = (potentialProfit / totalSellingValue) * 100

		//How much price is increased over the cost
		const markupPercentage = (potentialProfit / totalValue) * 100

		return {
			categoryId: category.id,
			fill: category.colorCode,
			categoryDescription: category.description,
			totalItems: totalItems,
			totalValue: totalValue,
			totalSellingValue: totalSellingValue,
			potentialProfit: potentialProfit,
			profitMarginPercentage: profitMarginPercentage,
			markupPercentage: markupPercentage,
		}
	})

	// Calculate totals across all categories
	const overallTotals = result.reduce(
		(acc, category) => {
			acc.totalItems += category.totalItems
			acc.totalValue += category.totalValue
			acc.totalSellingValue += category.totalSellingValue
			acc.potentialProfit += category.potentialProfit
			return acc
		},
		{
			totalItems: 0,
			totalValue: 0,
			totalSellingValue: 0,
			potentialProfit: 0,
		} as OverallTotals,
	)

	overallTotals.profitMarginPercentage =
		(overallTotals.potentialProfit / overallTotals.totalSellingValue) * 100
	overallTotals.markupPercentage =
		(overallTotals.potentialProfit / overallTotals.totalValue) * 100

	return { categoryBreakdown: result, overallTotals }
}

export async function softDeleteProduct(productId: string) {
	const product = await prisma.product.findUniqueOrThrow({
		where: { id: productId },
		select: { code: true },
	})

	return await prisma.product.update({
		where: { id: productId },
		data: {
			code: `REMOVED-${new Date().toISOString()}-${product.code}`,
			isActive: false,
			isDeleted: true,
			deletedAt: new Date(),
		},
		select: { id: true, name: true },
	})
}

export async function restoreProduct(productId: string) {
	return prisma.product.update({
		where: { id: productId },
		data: {
			isDeleted: false,
			deletedAt: null,
		},
		select: { id: true, name: true },
	})
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
		weekDays.map(async day => {
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
					order.productOrders.forEach(po => {
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
