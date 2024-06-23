import { invariantResponse } from '@epic-web/invariant'
import {
	ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '#app/components/ui/button.tsx'

import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { productOrderTypeBgColors } from '../order+/_constants/productOrderTypesColors.ts'
import { OrderStatus } from '../order+/_types/order-status.ts'
import { ProductOrderType } from '../order+/_types/productOrderType.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.js'

import {
	DeleteOrder,
	deleteOrderActionIntent,
	DeleteOrderSchema,
} from './__delete-order.tsx'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { parseWithZod } from '@conform-to/zod'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const orderReport = await prisma.order.findUnique({
		where: { id: params.reportId, businessId },
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
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case deleteOrderActionIntent: {
			return await deleteOrderAction(formData)
		}
	}
}

export default function ReportRoute() {
	const { orderReport } = useLoaderData<typeof loader>()
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	return (
		<Card className="flex h-full animate-slide-left flex-col lg:h-[85dvh]  ">
			<CardHeader className="flex flex-col items-start  gap-2 bg-muted/50 2xl:flex-row">
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
				<div className="ml-auto flex w-full  items-center gap-1 2xl:justify-end">
					<Button asChild size="sm" variant="outline" className="h-8 gap-1">
						<Link
							target="_blank"
							reloadDocument
							to={`/reports/${orderReport.id}/report-pdf`}
						>
							<Icon name="checklist" className="h-3.5 w-3.5" />
							<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
								Generar reporte
							</span>
						</Link>
					</Button>
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
			<CardContent className="flex-1 overflow-auto p-6 text-sm ">
				<div className="grid gap-3">
					<div className="font-semibold">Detalles de transacción</div>
					<ScrollArea className="h-[13.5rem]">
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
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
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
		select: { id: true, productOrders: true },
		where: { id: orderId },
	})

	invariantResponse(order, 'Order not found', { status: 404 })

	//restore stock
	for (let productOrder of order.productOrders) {
		if (productOrder.type === ProductOrderType.RETURN) {
			await prisma.product.update({
				where: { id: productOrder.productId },
				data: { stock: { decrement: productOrder.quantity } },
			})
		} else {
			await prisma.product.update({
				where: { id: productOrder.productId },
				data: { stock: { increment: productOrder.quantity } },
			})
		}
	}

	await prisma.order.delete({ where: { id: orderId } })
	return redirectWithToast(`/reports`, {
		type: 'success',
		title: 'Transacción eliminada',
		description: `Transacción ID [${order.id}] ha sido eliminada permanentemente.`,
	})
}
