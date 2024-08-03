import { prisma } from '#app/utils/db.server.ts'
import { Prisma } from '@prisma/client'
// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import { OrderStatus } from '../../types/orders/order-status.ts'
import { PaymentMethod } from '../../types/orders/payment-method.ts'
import { ProductOrderType } from '#app/types/orders/productOrderType.ts'
import { DiscountScope } from '#app/types/discounts/discount-reach.ts'

const orderDetailsSelect = {
	id: true,
	status: true,
	createdAt: true,
	paymentMethod: true,
	totalDiscount: true,
	directDiscount: true,
	total: true,
	subtotal: true,
	seller: { select: { name: true } },
	productOrders: {
		select: {
			id: true,
			type: true,
			quantity: true,
			totalPrice: true,
			totalDiscount: true,
			productDetails: {
				select: {
					id: true,
					code: true,
					name: true,
					sellingPrice: true,
					stock: true,
					discounts: true,
				},
			},
		},
	},
}

const discountDetailsSelect: Prisma.DiscountSelect = {
	id: true,
	name: true,
	description: true,
	applicationMethod: true,
	type: true,
	scope: true,
	minimumQuantity: true,
	validFrom: true,
	validUntil: true,
	value: true,
	isActive: true,
}

export async function createNewOrder(userId: string, businessId: string) {
	const newOrder = await prisma.order.create({
		data: {
			seller: { connect: { id: userId } },
			status: OrderStatus.PENDING,
			paymentMethod: PaymentMethod.CASH,
			totalDiscount: 0,
			directDiscount: 0,
			subtotal: 0,
			total: 0,
			business: { connect: { id: businessId } },
		},
		select: orderDetailsSelect,
	})

	return newOrder
}

export async function fetchCurrentPendingOrder(
	userId: string,
	businessId: string,
) {
	return await prisma.order.findFirst({
		where: {
			sellerId: userId,
			businessId: businessId,
			status: OrderStatus.PENDING,
		},
		select: { id: true },
	})
}

export async function fetchOrderDetails(orderId: string) {
	const order = await prisma.order.findUniqueOrThrow({
		where: { id: orderId },
		select: orderDetailsSelect,
	})

	//update totals before serving to front end
	const discount = order.productOrders
		.filter(productOrder => productOrder.type === ProductOrderType.PROMO)
		.reduce((acc, productOrder) => acc + productOrder.totalDiscount, 0)

	const total =
		order.productOrders.reduce(
			(acc, productOrder) => acc + productOrder.totalPrice,
			0,
		) - order.directDiscount

	const subtotal = total + discount + order.directDiscount

	const updatedOrder = await prisma.order.update({
		where: { id: orderId },
		data: {
			totalDiscount: discount,
			total: total,
			subtotal: subtotal,
		},
		select: orderDetailsSelect,
	})

	return updatedOrder
}

export async function fetchAvailableDiscounts(orderId: string) {
	const order = await prisma.order.findUniqueOrThrow({
		where: { id: orderId },
		select: orderDetailsSelect,
	})

	const availableProductDiscounts = order.productOrders.flatMap(productOrder =>
		productOrder.productDetails.discounts
			.filter(discount => productOrder.quantity >= discount.minimumQuantity)
			.map(discount => discount.id),
	)

	const uniqueDiscountIds = [...new Set(availableProductDiscounts)]

	const availableDiscounts = await prisma.discount.findMany({
		where: { id: { in: uniqueDiscountIds }, isActive: true },
		select: discountDetailsSelect,
	})

	const globalDiscounts = await prisma.discount.findMany({
		where: { scope: DiscountScope.GLOBAL },
		select: discountDetailsSelect,
	})

	return { availableDiscounts, globalDiscounts }
}
