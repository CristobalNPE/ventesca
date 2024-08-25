import { OrderStatus } from '#app/types/orders/order-status.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function getSellerAnalytics({
	sellerId,
	// startDate,
	// endDate,
}: {
	sellerId: string
	// startDate: Date
	// endDate: Date
}) {
	const orders = await prisma.order.findMany({
		where: {
      
			sellerId,
			// completedAt: { gte: startDate, lte: endDate },
			status: OrderStatus.FINISHED,
		},
		select: {
			createdAt: true,
			completedAt: true,
			status: true,
			profit: true,
		},
	})

	type SellerAnalytics = {
		totalTransactions: number
		profitGenerated: number
		averageTransactionTime: number
	}

	if (orders.length === 0) return null

	const sellerAnalytics = orders.reduce<SellerAnalytics>(
		(acc, order) => {
			acc.totalTransactions += 1
			acc.profitGenerated += order.profit
			const transactionTime =
				order.completedAt.getTime() - order.createdAt.getTime()
			acc.averageTransactionTime =
				(acc.averageTransactionTime * (acc.totalTransactions - 1) +
					transactionTime) /
				acc.totalTransactions
			return acc
		},
		{
			totalTransactions: 0,
			profitGenerated: 0,
			averageTransactionTime: 0,
		},
	)

	return {
		...sellerAnalytics,
		averageTransactionTime: Math.round(
			sellerAnalytics.averageTransactionTime / 1000,
		),
	}
}
