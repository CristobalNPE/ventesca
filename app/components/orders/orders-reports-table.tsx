import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { useSearchParams } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { Badge } from '#app/components/ui/badge.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { ProcessedPriceHistory } from '#app/utils/inventory/product-calculations.js'

import { TimePeriod, getTimePeriodBoundaries } from '#app/utils/time-periods.ts'

import { useOrders } from '#app/context/orders/OrdersContext.tsx'
import { periodParam } from '#app/routes/_orders+/orders.tsx'
import { OrderStatus } from '#app/routes/order+/_types/order-status.ts'
import { ScrollArea } from '../ui/scroll-area'

export function OrdersReportsTable({ isAdmin }: { isAdmin: boolean }) {
	const { orders, numberOfOrders } = useOrders()

	const [searchParams] = useSearchParams()

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
	if (orders.length === 0) {
		return (
			<div className="flex h-full flex-col items-center justify-center text-balance rounded-sm bg-card text-muted-foreground">
				<p>Sin transacciones durante este periodo: </p>
				<p>{getCardTitleFromParams(searchParams)}</p>
			</div>
		)
	}
	return (
		// <Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
		// 	<CardHeader className="sticky top-0 z-10 items-center justify-between bg-card px-7 text-center sm:items-start sm:text-start md:flex-row">
		// 		<div className="w-fit">
		// 			<CardTitle>
		// 				Transacciones - {getCardTitleFromParams(searchParams)}
		// 			</CardTitle>
		// 			{orders.length > 1 ? (
		// 				<CardDescription>
		// 					Mostrando {orders.length} de {numberOfOrders} transacciones.
		// 				</CardDescription>
		// 			) : null}
		// 		</div>
		// 		<PaginationBar top={50} total={numberOfOrders} />
		// 	</CardHeader>
		// 	<CardContent className="flex flex-col gap-3 sm:gap-1 ">
		// 		{orders.map(order => (
		// 			<LinkWithParams
		// 				key={order.id}
		// 				prefetch={'intent'}
		// 				className={({ isActive }) =>
		// 					cn(
		// 						'flex  flex-col items-center justify-between gap-1 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary sm:flex-row sm:gap-5 ',
		// 						isActive && 'border-primary/10 bg-secondary',
		// 					)
		// 				}
		// 				preserveSearch
		// 				to={order.id}
		// 			>
		// 				<span className="hidden w-[25%]  overflow-clip  text-nowrap text-center font-semibold uppercase sm:text-left xl:flex">
		// 					{order.id.slice(-15)}
		// 				</span>
		// 				<span className="flex w-fit text-nowrap text-center font-semibold uppercase sm:w-[10rem] sm:text-left xl:hidden">
		// 					{order.id.slice(-6)}
		// 				</span>

		// 				{isAdmin ? (
		// 					<span className=" w-[25%] text-nowrap  text-center  text-muted-foreground">
		// 						{order.seller.name}
		// 					</span>
		// 				) : null}

		// 				<TooltipProvider>
		// 					<Tooltip>
		// 						<TooltipTrigger asChild>
		// 							<span className="hidden w-[25%] text-nowrap text-center  text-muted-foreground  2xl:flex">
		// 								{format(new Date(order.completedAt), "dd'/'MM'/'yyyy", {
		// 									locale: es,
		// 								})}
		// 							</span>
		// 						</TooltipTrigger>
		// 						<TooltipContent>
		// 							<p>Fecha Ingreso</p>
		// 						</TooltipContent>
		// 					</Tooltip>
		// 				</TooltipProvider>

		// 				<Badge
		// 					className={cn(
		// 						'text-xs ',
		// 						order.status === OrderStatus.DISCARDED && 'text-destructive',
		// 						order.status === OrderStatus.PENDING && 'text-orange-400',
		// 					)}
		// 					variant="outline"
		// 				>
		// 					{order.status}
		// 				</Badge>
		// 				<span className="w-[20%] text-nowrap text-center font-semibold text-muted-foreground sm:text-end">
		// 					{order.total !== 0 ? formatCurrency(order.total) : null}
		// 				</span>
		// 			</LinkWithParams>
		// 		))}
		// 	</CardContent>
		// </Card>
		<Card className="w-full">
			<CardHeader>
				<CardTitle>
					{' '}
					Transacciones - {getCardTitleFromParams(searchParams)}
				</CardTitle>
				{orders.length > 1 ? (
					<CardDescription>
						Mostrando {orders.length} de {numberOfOrders} transacciones.
					</CardDescription>
				) : null}
			</CardHeader>
			<ScrollArea className="relative h-[42rem] max-h-[42rem] p-6 pt-0  ">
				<Table className="">
					<TableHeader className="sticky  top-0 z-20 rounded-md bg-secondary">
						<TableRow>
							<TableHead># Transacción</TableHead>
							<TableHead className="hidden sm:table-cell">Vendedor</TableHead>
							<TableHead className="">Estado</TableHead>
							<TableHead className="hidden sm:table-cell">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{orders.map(order => (
							<TableRow className="group" key={order.id}>
								<TableCell>
									<LinkWithParams
										unstable_viewTransition
										preserveSearch
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
