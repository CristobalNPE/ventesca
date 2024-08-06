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

import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { OrderStatus } from '#app/types/orders/order-status.ts'
import { PaginationBar } from '../pagination-bar'
import { ScrollArea } from '../ui/scroll-area'
import { OrdersFilters } from './orders-filters'

export function OrdersReportsTable() {
	const { orders, numberOfOrders, businessSellers } = useOrders()

	const [searchParams] = useSearchParams()

	return (
		<Card className="w-full">
			<CardHeader className="flex flex-col gap-2">
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex w-full items-center justify-between">
						<CardTitle>
							Transacciones - {getCardTitleFromParams(searchParams)}
						</CardTitle>
						{orders.length > 1 && (
							<CardDescription className="h-5">
								Mostrando {orders.length} de {numberOfOrders} transacciones.
							</CardDescription>
						)}
					</div>

					<div className="flex w-full  flex-col flex-wrap items-center justify-center gap-2">
						<OrdersFilters sellers={businessSellers} />
						<PaginationBar total={numberOfOrders} top={20} />
					</div>
				</div>
			</CardHeader>
			{orders.length ? (
				<ScrollArea className="relative h-[calc(100%-14rem)]  border-b p-6  pt-0 ">
					<Table>
						<TableHeader className="sticky  top-0 z-20 overflow-clip rounded-md bg-secondary">
							<TableRow>
								<TableHead className="rounded-tl-md">Código</TableHead>
								<TableHead className="hidden sm:table-cell">
									Fecha Ingreso
								</TableHead>
								<TableHead className="hidden sm:table-cell">Vendedor</TableHead>
								<TableHead className="">Estado</TableHead>
								<TableHead className="hidden rounded-tr-md sm:table-cell">
									Total
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{orders.map(order => (
								<TableRow className="group" key={order.id}>
									<TableCell className=" h-full overflow-hidden p-0">
										<LinkWithParams
											unstable_viewTransition
											preserveSearch
											prefetch="intent"
											to={order.id}
											className={
												'group/link flex h-full  w-full flex-1  gap-1 p-4 font-bold transition-all duration-100  group-hover:bg-accent group-hover:text-foreground'
											}
										>
											<span className="">
												{order.id.slice(-6).toLocaleUpperCase()}
											</span>
											<Icon
												name="file-arrow-right"
												className="text-foreground opacity-0 transition-all  duration-200 group-hover/link:translate-x-2 group-hover/link:opacity-100 "
											/>
										</LinkWithParams>
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										<div className="text-xs leading-none text-muted-foreground ">
											<p>
												{format(order.completedAt, 'dd/MM/yyyy', {
													locale: es,
												})}
											</p>
											<p>
												{format(order.completedAt, 'HH:mm', {
													locale: es,
												})}
											</p>
										</div>
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
												order.status === OrderStatus.PENDING &&
													'text-orange-400',
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
			) : (
				<div className="flex h-[40rem] w-full flex-col items-center justify-center gap-2 text-balance rounded-sm border border-dashed bg-card text-muted-foreground">
					<Icon name="exclamation-circle" size="xl" />
					<p>No existen transacciones que cumplan con los filtros aplicados.</p>
				</div>
			)}
		</Card>
	)
}

const getCardTitleFromParams = (searchParams: URLSearchParams) => {
	const period = searchParams.get(FILTER_PARAMS.TIME_PERIOD) ?? TimePeriod.TODAY
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
