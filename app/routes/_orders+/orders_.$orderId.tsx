import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { type MetaFunction, useLoaderData } from '@remix-run/react'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { OrderActions } from '#app/components/orders/order-actions.tsx'

import { OrderDetails } from '#app/components/orders/order-details.tsx'
import { OrderHeader } from '#app/components/orders/order-header.tsx'
import { OrderProductsTable } from '#app/components/orders/order-products-table.tsx'
import { OrderReceiptDisplay } from '#app/components/orders/order-receipt-display.tsx'
import { OrderProvider } from '#app/context/orders/OrderContext.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { userIsAdmin } from '#app/utils/user.ts'

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
			seller: { select: { id: true, name: true, username: true } },
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

export default function OrderRoute() {
	const loaderData = useLoaderData<typeof loader>()
	const isAdmin = userIsAdmin()
	const shouldShowReceipt = loaderData.order.productOrders.length > 0

	return (
		<OrderProvider data={loaderData}>
			<ContentLayout title={`Transacción #${loaderData.order.id.slice(-6).toUpperCase()}`} limitHeight>
				<main className="flex h-full flex-col gap-4">
					{/* <OrderHeader /> */}
					<div
						className={cn(
							'grid flex-1 grid-cols-1 gap-y-4 lg:grid-cols-6 lg:gap-4  ',
							shouldShowReceipt && 'lg:grid-cols-7',
						)}
					>
						<div className={'col-span-2  overflow-x-clip'}>
							<OrderDetails />
						</div>
						<div
							className={cn('col-span-4 ', shouldShowReceipt && 'lg:col-span-3')}
						>
							<OrderProductsTable />
						</div>
						{shouldShowReceipt && (
							<div className="col-span-2  ">
								<OrderReceiptDisplay />
							</div>
						)}
					</div>
					<OrderActions />
				</main>
			</ContentLayout>
		</OrderProvider>
	)
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
