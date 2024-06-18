import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
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
import { productOrderTypeColors } from '../order+/_constants/productOrderTypesColors.ts'
import { type ProductOrderType } from '../order+/_types/productOrderType.ts'
import { OrderStatus } from '../order+/_types/order-status.ts'

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

export default function ReportRoute() {
	const { orderReport } = useLoaderData<typeof loader>()

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden">
			<CardHeader className="flex flex-row items-start bg-muted/50">
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
				<div className="ml-auto flex items-center gap-1">
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
				</div>
			</CardHeader>
			<CardContent className="flex-1 p-6 text-sm">
				<div className="grid gap-3">
					<div className="font-semibold">Detalles de transacción</div>
					<ScrollArea className="h-[13.5rem]">
						<ul className="grid gap-3">
							{orderReport.productOrders.map(productOrder => (
								<li
									key={productOrder.id}
									className="flex items-center justify-between"
								>
									<div className="flex items-center gap-2">
										<span
											className={cn(
												'w-[3rem] rounded-sm px-[1px] text-center text-xs uppercase text-background opacity-70',
												`${
													productOrderTypeColors[
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
