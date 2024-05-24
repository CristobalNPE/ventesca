import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
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
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { Separator } from '#app/components/ui/separator.tsx'
import { TransactionStatus } from '../transaction+/_types/transaction-status.ts'
import { itemTransactionTypeColors } from '../transaction+/_constants/itemTransactionTypesColors.ts'
import { ItemTransactionType } from '../transaction+/_types/item-transactionType.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const transactionReport = await prisma.transaction.findUnique({
		where: { id: params.reportId },
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
			itemTransactions: {
				select: {
					id: true,
					quantity: true,
					type: true,
					totalPrice: true,
					item: { select: { code: true, name: true } },
				},
			},
		},
	})

	invariantResponse(transactionReport, 'Not found', { status: 404 })
	return json({ transactionReport })
}

export default function ReportRoute() {
	const { transactionReport } = useLoaderData<typeof loader>()

	return (
		<Card className="flex h-full flex-col overflow-hidden">
			<CardHeader className="flex flex-row items-start bg-muted/50">
				<div className="grid gap-0.5">
					<CardTitle className="group flex items-center gap-2 text-lg">
						Transacción
						<span className="font-semibold uppercase">
							{transactionReport.id.slice(-6)}
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
						{format(
							new Date(transactionReport.createdAt),
							" dd' de 'MMMM', 'yyyy",
							{
								locale: es,
							},
						)}
					</CardDescription>
				</div>
				<div className="ml-auto flex items-center gap-1">
					<Button asChild size="sm" variant="outline" className="h-8 gap-1">
						<Link
							target="_blank"
							reloadDocument
							to={`/reports/${transactionReport.id}/report-pdf`}
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
							{transactionReport.itemTransactions.map(itemTransaction => (
								<li
									key={itemTransaction.id}
									className="flex items-center justify-between"
								>
									<div className='flex items-center gap-2'>
										<span
											className={cn(
												'opacity-70 text-xs uppercase text-background rounded-sm px-[1px] w-[3rem] text-center',
												`${
													itemTransactionTypeColors[
														itemTransaction.type as ItemTransactionType
													]
												}`,
											)}
										>
											{itemTransaction.type.slice(0, 5)}
										</span>
										<span className="text-muted-foreground">
											{itemTransaction.item.name} x{' '}
											<span>{itemTransaction.quantity}</span>
										</span>
									</div>
									<span>{formatCurrency(itemTransaction.totalPrice)}</span>
								</li>
							))}
						</ul>
					</ScrollArea>
					<Separator className="my-2" />
					<ul className="grid gap-3">
						<li className="flex items-center justify-between">
							<span className="text-muted-foreground">Subtotal</span>
							<span>{formatCurrency(transactionReport.subtotal)}</span>
						</li>
						{transactionReport.totalDiscount ? (
							<li className="flex items-center justify-between">
								<span className="text-muted-foreground">
									Promociones activas
								</span>
								<span>- {formatCurrency(transactionReport.totalDiscount)}</span>
							</li>
						) : null}
						{transactionReport.directDiscount ? (
							<li className="flex items-center justify-between">
								<span className="text-muted-foreground">Descuento directo</span>
								<span>
									- {formatCurrency(transactionReport.directDiscount)}
								</span>
							</li>
						) : null}
						<li className="flex items-center justify-between font-semibold">
							<span className="text-muted-foreground">Total</span>
							<span>{formatCurrency(transactionReport.total)}</span>
						</li>
					</ul>
				</div>
				<Separator className="my-4" />

				<div className="grid gap-3">
					<div className="font-semibold">Vendedor</div>
					<span className="text-muted-foreground">
						{transactionReport.seller.name}
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
										transactionReport.status === TransactionStatus.DISCARDED
											? 'cross-1'
											: transactionReport.status === TransactionStatus.PENDING
											  ? 'update'
											  : 'checks'
									}
									className="h-4 w-4"
								/>
								{transactionReport.status}
							</div>
						</div>
					</dl>
				</div>
			</CardContent>
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
				{transactionReport.status !== TransactionStatus.PENDING ? (
					<div className="text-xs text-muted-foreground">
						{transactionReport.status === TransactionStatus.FINISHED
							? 'Completada'
							: 'Cancelada'}{' '}
						el{' '}
						{format(
							new Date(transactionReport.completedAt),
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
