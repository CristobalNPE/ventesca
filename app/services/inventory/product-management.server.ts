import { prisma } from '#app/utils/db.server.js'
import {
	type Prisma,
	type ProductOrder as ProductOrderModel,
} from '@prisma/client'
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
