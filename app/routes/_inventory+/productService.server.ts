import { prisma } from '#app/utils/db.server.js'
import { type ProductOrder as ProductOrderModel } from '@prisma/client'
import { ProductOrderType } from '../order+/_types/productOrderType'
export enum OrderAction {
	CREATE,
	DELETE,
	DISCARD,
	UNDISCARD,
}

export async function updateProductStockAndAnalytics(
	productOrders: ProductOrderModel[],
	action: OrderAction,
) {
	for (let productOrder of productOrders) {
		const product = await prisma.product.findUniqueOrThrow({
			where: { id: productOrder.productId },
			select: { stock: true, price: true, sellingPrice: true },
		})

		//!Need to check for discounts as well, be it global or product tied.
		const profitPerUnit = product.sellingPrice - product.price
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

		await prisma.product.update({
			where: { id: productOrder.productId },
			data: {
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
			},
		})
	}
}

export async function getBestSellingProduct(businessId: string) {
	const bestSeller = await prisma.productAnalytics.findFirst({
		where: {
			item: {
				businessId: businessId,
			},
		},
		orderBy: {
			totalSales: 'desc',
		},
		select: {
			totalSales: true,
			totalProfit: true,
			item: {
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
			item: {
				businessId: businessId,
			},
		},
		orderBy: {
			totalProfit: 'desc',
		},
		select: {
			totalSales: true,
			totalProfit: true,
			item: {
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
		where: { stock: { lte: limit }, businessId },
		select: { id: true, stock: true },
	})

	const zeroStockProducts = lowStockProducts.filter(
		product => product.stock <= 0,
	)

	console.log(
		`lowStockProducts = ${lowStockProducts.length}, zeroStockProducts = ${zeroStockProducts.length}`,
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
					isActive: true,
					stock: { gt: 0 },
				},
				select: {
					sellingPrice: true,
					price: true,
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
			totalValue += product.price * product.stock
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
