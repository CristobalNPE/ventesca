import { prisma } from '#app/utils/db.server.ts'



export async function getLowStockProducts(businessId: string, limit: number) {
	const lowStockProducts = await prisma.product.findMany({
		where: { stock: { lte: limit }, businessId, isDeleted: false },
		select: { id: true, stock: true },
	})

	const zeroStockProducts = lowStockProducts.filter(
		(product) => product.stock <= 0,
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
			name: true,
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

	const result = inventoryByCategory.map((category) => {
		let totalValue = 0
		let totalSellingValue = 0
		let totalItems = 0

		category.products.forEach((product) => {
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
			categoryName: category.name,
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

