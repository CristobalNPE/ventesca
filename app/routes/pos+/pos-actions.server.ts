import { parseWithZod } from '@conform-to/zod'
import { json } from '@remix-run/node'

import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { z } from 'zod'
import { DiscountType } from '../../types/discounts/discount-type.ts'
// import { updateDiscountValidity } from '../_discounts+/discounts_.$discountId.tsx'
import { OrderStatus } from '../../types/orders/order-status.ts'
import {
	DirectDiscountSchema,
	RemoveDirectDiscountSchema,
} from '../../components/pos/current-order-direct-discount.tsx'
import { DiscardOrderSchema } from '../../components/pos/current-order-discard.tsx'
import { FinishTransactionSchema } from '../../components/pos/current-order-finish.tsx'
import { SetPaymentMethodSchema } from '../../components/pos/current-order-payment-method.tsx'

import {
	OrderAction,
	updateProductStockAndAnalytics,
} from '../_inventory+/product-service.server.ts'

export async function discardOrderAction(formData: FormData) {
	const submission = parseWithZod(formData, {
		schema: DiscardOrderSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId } = submission.value

	const order = await prisma.order.findUniqueOrThrow({
		select: { id: true },
		where: { id: orderId },
	})

	await prisma.order.update({
		where: { id: order.id },
		data: {
			isDiscarded: true,
			status: OrderStatus.DISCARDED,
			completedAt: new Date(),
		},
	})
	return redirectWithToast(`/orders`, {
		type: 'message',
		title: 'Transacción Descartada',
		description: `Transacción ${order.id} ha sido descartada.`,
	})
}

export async function setPaymentMethodAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: SetPaymentMethodSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId, paymentMethod } = submission.value

	await prisma.order.update({
		where: { id: orderId },
		data: { paymentMethod },
	})

	return json({ result: submission.reply() })
}

export async function finishOrderAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: FinishTransactionSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { orderId } = submission.value

	const order = await prisma.order.update({
		where: { id: orderId },
		data: {
			status: OrderStatus.FINISHED,
			completedAt: new Date(),
		},
		select: { productOrders: true, status: true },
	})

	//update stock for products in the order
	await updateProductStockAndAnalytics(order.productOrders, OrderAction.CREATE)

	return redirectWithToast(`/orders/${orderId}`, {
		type: 'success',
		title: 'Transacción Completa',
		description: `Venta completada bajo ID de transacción: [${orderId.toUpperCase()}].`,
	})
}

export async function applyDirectDiscountAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: DirectDiscountSchema.superRefine(async (data, ctx) => {
			const currentOrder = await prisma.order.findUniqueOrThrow({
				where: { id: data.orderId },
				select: { total: true },
			})

			//El valor del descuento cuando es fijo, no puede ser mayor al total de la transacción.
			if (
				data.discountType === DiscountType.FIXED &&
				data.discountValue > currentOrder.total
			) {
				ctx.addIssue({
					path: ['discountValue'],
					code: z.ZodIssueCode.custom,
					message: `El descuento no puede superar el valor total ( ${formatCurrency(
						currentOrder.total,
					)} )`,
				})
			}

			//Si el descuento es porcentual, el valor debe estar entre 1 y 100
			if (
				data.discountType === DiscountType.PERCENTAGE &&
				!(data.discountValue >= 1 && data.discountValue <= 100)
			) {
				ctx.addIssue({
					path: ['discountValue'],
					code: z.ZodIssueCode.custom,
					message: 'Un descuento porcentual debe estar entre 1% y 100%.',
				})
			}
		}),
		async: true,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId, totalDirectDiscount } = submission.value

	await prisma.order.update({
		where: { id: orderId },
		data: { directDiscount: totalDirectDiscount },
	})

	return json({ result: submission.reply() })
}

export async function removeDirectDiscountAction(formData: FormData) {
	const submission = await parseWithZod(formData, {
		schema: RemoveDirectDiscountSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId } = submission.value

	await prisma.order.update({
		where: { id: orderId },
		data: { directDiscount: 0 },
	})

	return json({ result: submission.reply() })
}
