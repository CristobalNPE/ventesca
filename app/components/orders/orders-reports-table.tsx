import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { useSearchParams } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'

import { TimePeriod, getTimePeriodBoundaries } from '#app/utils/time-periods.ts'

import { useOrders } from '#app/context/orders/OrdersContext.tsx'
import { periodParam } from '#app/routes/_orders+/orders.tsx'
import { OrderStatus } from '#app/routes/order+/_types/order-status.ts'
import { ScrollArea } from '../ui/scroll-area'

export function OrdersReportsTable() {
	const { orders, numberOfOrders } = useOrders()

	const [searchParams] = useSearchParams()

	if (orders.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center text-balance rounded-sm bg-card text-muted-foreground">
				<p>Sin transacciones durante este periodo: </p>
				<p>{getCardTitleFromParams(searchParams)}</p>
			</div>
		)
	}
	return (
		<Card className="w-full">
			<CardHeader>
				<CardTitle>
					Transacciones - {getCardTitleFromParams(searchParams)}
				</CardTitle>
				{orders.length > 1 ? (
					<CardDescription>
						Mostrando {orders.length} de {numberOfOrders} transacciones.
					</CardDescription>
				) : null}
			</CardHeader>
			<ScrollArea className="relative h-[42rem] max-h-[42rem] border-b p-6  pt-0 ">
				<Table>
					<TableHeader className="sticky  top-0 z-20 overflow-clip rounded-md bg-secondary">
						<TableRow>
							<TableHead className="rounded-t-md"># Transacción</TableHead>
							<TableHead className="hidden sm:table-cell">Vendedor</TableHead>
							<TableHead className="">Estado</TableHead>
							<TableHead className="hidden rounded-t-md sm:table-cell">
								Total
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orders.map(order => (
							<TableRow className="group" key={order.id}>
								<TableCell>
									<LinkWithParams
										unstable_viewTransition
										preserveSearch
										prefetch="intent"
										to={order.id}
										className={
											'flex w-fit items-center gap-1 rounded-md px-2 py-[1px] font-semibold transition-all duration-100 hover:translate-x-1 hover:scale-105 group-hover:bg-primary  group-hover:text-primary-foreground '
										}
									>
										{order.id.slice(-6).toLocaleUpperCase()}
										<Icon
											name="file-text"
											className="text-primary-foreground opacity-0 transition-all  duration-100 group-hover:opacity-100"
										/>
									</LinkWithParams>
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									{order.seller.name}
								</TableCell>
								<TableCell className="">
									<Badge
										className={cn(
											'text-xs ',
											order.status === OrderStatus.DISCARDED &&
												'text-destructive',
											order.status === OrderStatus.PENDING && 'text-orange-400',
										)}
										variant="outline"
									>
										{order.status}
									</Badge>
								</TableCell>
								<TableCell className="hidden font-semibold sm:table-cell">
									{formatCurrency(order.total)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</ScrollArea>
		</Card>
	)
}

const getCardTitleFromParams = (searchParams: URLSearchParams) => {
	const period = searchParams.get(periodParam) ?? TimePeriod.TODAY
	const { startDate, endDate } = getTimePeriodBoundaries(period)

	switch (period) {
		case TimePeriod.TODAY:
			return `Hoy ${format(startDate, "dd 'de' MMMM", {
				locale: es,
			})}`
		case TimePeriod.LAST_WEEK:
			return `${format(startDate, 'dd', {
				locale: es,
			})} a ${format(endDate, "dd 'de' MMMM", {
				locale: es,
			})}`
		case TimePeriod.LAST_MONTH:
			return `Mes de  ${format(startDate, 'MMMM', {
				locale: es,
			})}`
		case TimePeriod.LAST_YEAR:
			return `Año ${format(startDate, 'yyyy', {
				locale: es,
			})}`
		default:
			return `Hoy ${format(startDate, "dd 'de' MMMM", {
				locale: es,
			})}`
	}
}
