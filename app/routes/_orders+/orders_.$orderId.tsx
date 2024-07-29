import { Button } from '#app/components/ui/button.tsx'
import { invariantResponse } from '@epic-web/invariant'
import {
	ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import {
	MetaFunction,
	useLoaderData,
	useNavigation,
	useSearchParams,
} from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.js'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { productOrderTypeBgColors } from '../order+/_constants/productOrderTypesColors.ts'
import { OrderStatus } from '../order+/_types/order-status.ts'
import { ProductOrderType } from '../order+/_types/productOrderType.ts'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { getTimePeriodForDate } from '#app/utils/time-periods.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { parseWithZod } from '@conform-to/zod'
import { useEffect, useRef } from 'react'
import {
	DeleteOrder,
	deleteOrderActionIntent,
	DeleteOrderSchema,
} from './__delete-order.tsx'
import { useSpinDelay } from 'spin-delay'
import {
	OrderAction,
	updateProductStockAndAnalytics,
} from '../_inventory+/product-service.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const orderReport = await prisma.order.findUnique({
		where: { id: params.orderId, businessId },
		select: {
			id: true,
			status: true,
			paymentMethod: true,
			createdAt: true,
			completedAt: true,
			subtotal: true,
			total: true,
			totalDiscount: true,
			directDiscount: true,
			seller: { select: { name: true } },
			productOrders: {
				select: {
					id: true,
					quantity: true,
					type: true,
					totalPrice: true,
					productDetails: { select: { code: true, name: true } },
				},
			},
		},
	})

	invariantResponse(orderReport, 'Not found', { status: 404 })
	return json({ orderReport })
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
	const { orderReport } = useLoaderData<typeof loader>()
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')
	const iframeRef = useRef<HTMLIFrameElement>(null)
	const [searchParams, setSearchParams] = useSearchParams()

	useEffect(() => {
		const periodParam = searchParams.get('period')

		if (!periodParam) {
			setSearchParams(prev => {
				prev.set(
					'period',
					getTimePeriodForDate(new Date(orderReport.completedAt))?.toString() ??
						'',
				)
				return prev
			})
		}
	}, [])

	const navigation = useNavigation()
	const isLoading = navigation.state === 'loading'

	const shouldShowLoadingSpinner = useSpinDelay(isLoading, {
		delay: 150,
		minDuration: 500,
	})

	if (shouldShowLoadingSpinner) {
		return (
			<div className="flex h-full flex-col items-center justify-center gap-2">
				<Icon name="update" className="animate-spin text-3xl" />
				<span>Cargando detalles</span>
			</div>
		)
	}

	return (
		<Card className="flex h-full flex-col rounded-none">
			<CardHeader className="flex flex-col items-start bg-muted/50  p-4 ">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						Transacción
						<span className="font-semibold uppercase">
							{orderReport.id.slice(-6)}
						</span>
						<Button
							size="icon"
							variant="outline"
							className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Icon name="copy" className="h-3 w-3" />
							<span className="sr-only">Copiar ID transacción</span>
						</Button>
					</CardTitle>
					<CardDescription>
						Fecha:
						{format(new Date(orderReport.createdAt), " dd' de 'MMMM', 'yyyy", {
							locale: es,
						})}
					</CardDescription>
				</div>
				<div className="ml-auto flex w-full  items-center gap-1">
					<iframe
						className="hidden"
						ref={iframeRef}
						src={`${orderReport.id}/receipt`}
					/>
					{orderReport.status === OrderStatus.FINISHED ? (
						<Button
							onClick={() => iframeRef.current?.contentWindow?.print()}
							size="sm"
							variant="outline"
							className="h-8 gap-1"
						>
							<Icon name="printer" className="h-3.5 w-3.5" />
							<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
								Imprimir comprobante
							</span>
						</Button>
					) : null}

					{isAdmin ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button size="icon" variant="outline" className="h-8 w-8">
									<Icon name="dots-vertical" className="h-3.5 w-3.5" />
									<span className="sr-only">More</span>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem>
									<LinkWithParams preserveSearch to={'edit'}>
										<Icon name="update" className="mr-2" />
										Modificar transacción
									</LinkWithParams>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<DeleteOrder id={orderReport.id} />
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			</CardHeader>
			<CardContent className="flex-1  overflow-auto p-4  text-sm ">
				<div className="flex flex-col gap-3 ">
					<div className="font-semibold">Detalles de transacción</div>
					<ScrollArea className="h-[18rem] ">
						<ul className="grid gap-3">
							{orderReport.productOrders.map(productOrder => (
								<li
									key={productOrder.id}
									className="flex items-center justify-between border-b-2  border-dashed border-border/70 2xl:border-0"
								>
									<div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center">
										<span
											className={cn(
												'w-[3rem] rounded-sm px-[1px] text-center text-xs uppercase text-background opacity-70',
												`${
													productOrderTypeBgColors[
														productOrder.type as ProductOrderType
													]
												}`,
											)}
										>
											{productOrder.type.slice(0, 5)}
										</span>
										<span className="text-muted-foreground">
											{productOrder.productDetails.name} x{' '}
											<span>{productOrder.quantity}</span>
										</span>
									</div>
									<span>{formatCurrency(productOrder.totalPrice)}</span>
								</li>
							))}
						</ul>
					</ScrollArea>

					<Separator className="my-2" />
					<ul className="grid gap-3">
						<li className="flex items-center justify-between">
							<span className="text-muted-foreground">Subtotal</span>
							<span>{formatCurrency(orderReport.subtotal)}</span>
						</li>
						{orderReport.totalDiscount ? (
							<li className="flex items-center justify-between">
								<span className="text-muted-foreground">
									Promociones activas
								</span>
								<span>- {formatCurrency(orderReport.totalDiscount)}</span>
							</li>
						) : null}
						{orderReport.directDiscount ? (
							<li className="flex items-center justify-between">
								<span className="text-muted-foreground">Descuento directo</span>
								<span>- {formatCurrency(orderReport.directDiscount)}</span>
							</li>
						) : null}
						<li className="flex items-center justify-between font-semibold">
							<span className="text-muted-foreground">Total</span>
							<span>{formatCurrency(orderReport.total)}</span>
						</li>
					</ul>
				</div>
				<Separator className="my-4" />
				<div className="grid gap-3">
					<div className="font-semibold">Método de pago</div>
					<span className="text-muted-foreground">
						{orderReport.paymentMethod}
					</span>
				</div>
				<Separator className="my-4" />
				<div className="grid gap-3">
					<div className="font-semibold">Vendedor</div>
					<span className="text-muted-foreground">
						{orderReport.seller.name}
					</span>
				</div>
				<Separator className="my-4" />
				<div className="grid gap-3">
					<div className="font-semibold">Estado de la transacción</div>
					<dl className="grid gap-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 text-muted-foreground">
								<Icon
									name={
										orderReport.status === OrderStatus.DISCARDED
											? 'cross-1'
											: orderReport.status === OrderStatus.PENDING
												? 'update'
												: 'checks'
									}
									className="h-4 w-4"
								/>
								{orderReport.status}
							</div>
						</div>
					</dl>
				</div>
			</CardContent>
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 p-4">
				{orderReport.status !== OrderStatus.PENDING ? (
					<div className="text-xs text-muted-foreground">
						{orderReport.status === OrderStatus.FINISHED
							? 'Completada'
							: 'Cancelada'}{' '}
						el{' '}
						{format(
							new Date(orderReport.completedAt),
							"dd 'de' MMMM', 'yyyy' a las' hh:mm",
							{
								locale: es,
							},
						)}
					</div>
				) : null}
			</CardFooter>
		</Card>
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
	// if (order.status === OrderStatus.FINISHED) {
	// 	for (let productOrder of order.productOrders) {
	// 		if (productOrder.type === ProductOrderType.RETURN) {
	// 			await prisma.product.update({
	// 				where: { id: productOrder.productId },
	// 				data: { stock: { decrement: productOrder.quantity } },
	// 			})
	// 		} else {
	// 			await prisma.product.update({
	// 				where: { id: productOrder.productId },
	// 				data: { stock: { increment: productOrder.quantity } },
	// 			})
	// 		}
	// 	}
	// }

	await prisma.order.delete({ where: { id: orderId } })
	return redirectWithToast(`/orders`, {
		type: 'success',
		title: 'Transacción eliminada',
		description: `Transacción ID [${order.id}] ha sido eliminada permanentemente.`,
	})
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const orderId = data ? data.orderReport.id.slice(-6).toUpperCase() : ''

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
