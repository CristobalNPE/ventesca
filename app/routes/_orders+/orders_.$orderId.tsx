import { invariantResponse } from '@epic-web/invariant'
import {
	ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { MetaFunction, useLoaderData } from '@remix-run/react'

import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { OrderStatus } from '../../types/orders/order-status.ts'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { OrderDetails } from '#app/components/orders/order-details.tsx'
import { OrderHeader } from '#app/components/orders/order-header.tsx'
import { OrderProductsTable } from '#app/components/orders/order-products-table.tsx'
import { OrderProvider } from '#app/context/orders/OrderContext.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { userIsAdmin } from '#app/utils/user.ts'
import { parseWithZod } from '@conform-to/zod'
import {
	OrderAction,
	updateProductStockAndAnalytics,
} from '../_inventory+/product-service.server.ts'
import {
	deleteOrderActionIntent,
	DeleteOrderSchema,
} from './__delete-order.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const order = await prisma.order.findUnique({
		where: { id: params.orderId, businessId },
		select: {
			id: true,
			status: true,
			paymentMethod: true,
			createdAt: true,
			completedAt: true,
			updatedAt: true,
			subtotal: true,
			total: true,
			totalDiscount: true,
			directDiscount: true,
			seller: { select: { name: true, username: true } },
			productOrders: {
				select: {
					id: true,
					quantity: true,
					type: true,
					totalPrice: true,
					totalDiscount: true,
					productDetails: { select: { code: true, name: true } },
				},
			},
		},
	})

	invariantResponse(order, 'Not found', { status: 404 })
	return json({ order })
}

export async function action({ request }: ActionFunctionArgs) {
	await requireUserWithRole(request, 'Administrador')

	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case deleteOrderActionIntent: {
			return await deleteOrderAction(formData)
		}
	}
}

export default function ReportSheet() {
	const loaderData = useLoaderData<typeof loader>()
	const isAdmin = userIsAdmin()

	return (
		<OrderProvider data={loaderData}>
			<main className="flex flex-col gap-4">
				<OrderHeader isAdmin={isAdmin} />
				<div className="grid grid-cols-1 gap-y-4 sm:grid-cols-5 sm:gap-4">
					<div className="col-span-2  ">
						<OrderDetails />
					</div>
					<div className="col-span-3  ">
						<OrderProductsTable />
					</div>
				</div>
			</main>
		</OrderProvider>
	)
}

async function deleteOrderAction(formData: FormData) {
	const submission = parseWithZod(formData, {
		schema: DeleteOrderSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { orderId } = submission.value

	const order = await prisma.order.findUnique({
		select: { id: true, productOrders: true, status: true },
		where: { id: orderId },
	})

	invariantResponse(order, 'Order not found', { status: 404 })

	// Update stock and analytics only if deleting a finished order
	if (order.status === OrderStatus.FINISHED) {
		await updateProductStockAndAnalytics(
			order.productOrders,
			OrderAction.DELETE,
		)
	}

	await prisma.order.delete({ where: { id: orderId } })
	return redirectWithToast(`/orders`, {
		type: 'success',
		title: 'Transacción eliminada',
		description: `Transacción ID [${order.id}] ha sido eliminada permanentemente.`,
	})
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const orderId = data ? data.order.id.slice(-6).toUpperCase() : ''

	return [
		{
			title: `Transacción ${orderId} | Ventesca`,
		},
	]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>Transacción con ID "{params.orderId?.toUpperCase()}" no existe</p>
				),
			}}
		/>
	)
}
