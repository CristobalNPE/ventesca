import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { type ActionFunctionArgs, json, redirect } from '@remix-run/node'
import { OrderReportEditSchema } from './__order-editor'
import { OrderStatus } from '../../types/orders/order-status.ts'
import { ProductOrderType } from '../../types/orders/productOrderType.ts'
import {
	OrderAction,
	updateProductStockAndAnalytics,
} from '../_inventory+/product-service.server.ts'

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')
	const formData = await request.formData()

	const url = new URL(request.url)
	const params = url.searchParams.toString()

	const submission = await parseWithZod(formData, {
		schema: OrderReportEditSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id, status, paymentMethod, directDiscount } = submission.value

	const order = await prisma.order.findUniqueOrThrow({
		where: { id },
		include: {
			productOrders: true,
		},
	})

	//If changed status, update stock and analytics
	if (status !== order.status) {
		if (status === OrderStatus.DISCARDED) {
			await updateProductStockAndAnalytics(
				order.productOrders,
				OrderAction.DISCARD,
			)
		} else if (
			order.status === OrderStatus.DISCARDED &&
			status === OrderStatus.FINISHED
		) {
			await updateProductStockAndAnalytics(
				order.productOrders,
				OrderAction.UNDISCARD,
			)
		}
	}

	await prisma.order.update({
		where: { id },
		data: {
			status,
			paymentMethod,
			directDiscount,
			total: order.subtotal - directDiscount - order.totalDiscount,
		},
	})

	return redirect(`/orders/${id}${params ? `?${params}` : ''}`)
}