import { OrderStatus } from '#app/types/orders/order-status.ts'
import { prisma } from '#app/utils/db.server.ts'
import { endOfWeek, startOfWeek } from 'date-fns'

export async function getMostSoldProductInCategory({
	categoryId,
	startDate,
	endDate,
}: {
	categoryId: string
	startDate: Date
	endDate: Date
}) {
	const productsWithTotalQuantitySold = await prisma.product.findMany({
		where: {
			categoryId,
		},
		select: {
			id: true,
			code: true,
			name: true,
			productOrders: {
				where: {
					createdAt: {
						gte: startDate,
						lte: endDate,
					},
					order: {
						status: OrderStatus.FINISHED,
					},
				},
			},
		},
	})
	if (productsWithTotalQuantitySold.length === 0) return null

	const processedProducts = productsWithTotalQuantitySold.map((product) => ({
		...product,
		totalQuantitySold: product.productOrders.reduce(
			(total, order) => total + order.quantity,
			0,
		),
	}))

	const mostSoldProduct =
		processedProducts.length > 0
			? processedProducts.reduce((max, product) =>
					product.totalQuantitySold > max.totalQuantitySold ? product : max,
				)
			: null

	if (!mostSoldProduct) return null

	const currentWeekSales = await prisma.productOrder.aggregate({
		where: {
			productId: mostSoldProduct.id,
			createdAt: {
				gte: startDate,
				lte: endDate,
			},
			order: { status: OrderStatus.FINISHED },
		},
		_sum: { quantity: true },
	})

	return {
		mostSoldProduct: {
			id: mostSoldProduct.id,
			code: mostSoldProduct.code,
			name: mostSoldProduct.name,
		},
		totalQuantitySold: currentWeekSales._sum.quantity || 0,
	}
}

export async function getCategoryTotalPriceAndCost(categoryId: string) {
	const products = await prisma.product.findMany({
		where: {
			categoryId,
		},
		select: {
			sellingPrice: true,
			cost: true,
			stock: true,
		},
	})

	const totalSellingPrice = products.reduce(
		(total, product) => total + product.sellingPrice * product.stock,
		0,
	)
	const totalCost = products.reduce(
		(total, product) => total + product.cost * product.stock,
		0,
	)

	return {
		totalSellingPrice,
		totalCost,
	}
}

export async function getCategoryProfitAnalytics(categoryId: string) {
	let currentDate = new Date()
	const currentWeekStart = startOfWeek(currentDate)
	const currentWeekEnd = endOfWeek(currentDate)

	const orders = await prisma.order.findMany({
		where: {
			status: OrderStatus.FINISHED,
			productOrders: {
				some: {
					productDetails: {
						categoryId,
					},
				},
			},
		},
		select: {
			id: true,
			completedAt: true,
			productOrders: {
				select: {
					profit: true,
				},
				where: {
					productDetails: {
						categoryId,
					},
				},
			},
		},
	})

	let totalProfit = 0
	let totalProfitLastWeek = 0

	for (const order of orders) {
		const orderProfit = order.productOrders.reduce(
			(total, productOrder) => total + productOrder.profit,
			0,
		)
		totalProfit += orderProfit

		if (
			order.completedAt >= currentWeekStart &&
			order.completedAt <= currentWeekEnd
		) {
			totalProfitLastWeek += orderProfit
		}
	}

	console.log(totalProfit, totalProfitLastWeek)

	return {
		totalProfit,
		totalProfitLastWeek,
	}
}
