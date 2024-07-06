import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
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
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuSeparator,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { useUser, userHasRole } from '#app/utils/user.ts'
import { type Order, Prisma } from '@prisma/client'
import {
	type LoaderFunctionArgs,
	type SerializeFrom,
	json,
} from '@remix-run/node'
import {
	MetaFunction,
	Outlet,
	useLoaderData,
	useLocation,
	useNavigate,
	useNavigation,
	useSearchParams,
} from '@remix-run/react'
import {
	eachDayOfInterval,
	endOfDay,
	endOfToday,
	endOfWeek,
	endOfYesterday,
	format,
	startOfDay,
	startOfToday,
	startOfWeek,
	startOfYesterday,
	subWeeks,
} from 'date-fns'
import { es } from 'date-fns/locale'

import {
	ChartConfig,
	ChartContainer,
	ChartTooltip,
} from '#app/components/ui/chart.tsx'
import { Sheet, SheetContent } from '#app/components/ui/sheet.tsx'
import {
	TimePeriod,
	allTimePeriods,
	getTimePeriodBoundaries,
	timePeriodNames,
} from '#app/utils/time-periods.ts'
import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, TooltipProps, XAxis } from 'recharts'
import {
	NameType,
	ValueType,
} from 'recharts/types/component/DefaultTooltipContent'
import { OrderStatus, allOrderStatuses } from '../order+/_types/order-status.ts'
import { VerifyOrderDialog } from './reports_.verify-order.tsx'

const statusParam = 'status'
const periodParam = 'period'
const sellerParam = 'seller'

const chartConfig = {
	earnings: {
		label: 'Ingresos',
		color: 'hsl(var(--chart-6))',
	},
} satisfies ChartConfig

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 50
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const periodFilter = url.searchParams.get(periodParam)?.toLowerCase()
	const statusFilter = url.searchParams.get(statusParam)
	const sellerFilter = url.searchParams.get(sellerParam)

	const { startDate, endDate } = getTimePeriodBoundaries(periodFilter)

	const { roles: userRoles } = await prisma.user.findFirstOrThrow({
		where: { id: userId },
		select: { roles: true },
	})

	const isAdmin = userRoles.map(role => role.name).includes('Administrador')

	const filters: Prisma.OrderWhereInput = {
		businessId,
		...(startDate &&
			endDate && { completedAt: { gte: startDate, lte: endDate } }),
		...(statusFilter && { status: statusFilter }),
		...(sellerFilter && { sellerId: sellerFilter }),
		...(!isAdmin && { sellerId: userId }),
	}

	const weekEarningsPromise = getLastTwoWeeksEarnings(businessId)

	const dayEarningsPromise = getLastTwoDaysEarnings(businessId)

	const weekDailyEarningsPromise = getWeeklyDailyEarnings(businessId)

	const numberOfOrdersPromise = prisma.order.count({
		where: filters,
	})

	const ordersPromise = prisma.order.findMany({
		take: $top,
		skip: $skip,
		select: {
			id: true,
			createdAt: true,
			completedAt: true,
			status: true,
			total: true,
			seller: { select: { name: true } },
		},
		where: filters,
		orderBy: { completedAt: 'desc' },
	})

	const businessSellersPromise = prisma.user.findMany({
		where: { businessId, isDeleted: false },
		select: { id: true, name: true },
	})

	const [
		numberOfOrders,
		orders,
		businessSellers,
		weekEarnings,
		dayEarnings,
		weekDailyEarnings,
	] = await Promise.all([
		numberOfOrdersPromise,
		ordersPromise,
		businessSellersPromise,
		weekEarningsPromise,
		dayEarningsPromise,
		weekDailyEarningsPromise,
	])

	return json({
		orders,
		numberOfOrders,
		businessSellers,
		weekEarnings,
		dayEarnings,
		weekDailyEarnings,
	})
}

export default function OrderReportsRoute() {
	const {
		orders,
		numberOfOrders,
		businessSellers,
		weekEarnings,
		dayEarnings,
		weekDailyEarnings,
	} = useLoaderData<typeof loader>()

	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	const [searchParams, setSearchParams] = useSearchParams()
	const periodFilter = searchParams.get(periodParam)
	const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false)

	const location = useLocation()
	const navigation = useNavigation()
	const navigate = useNavigate()

	useEffect(() => {
		if (location.pathname !== '/reports') {
			const reportId = location.pathname.split('/').pop()
			if (reportId) {
				if (navigation.state === 'idle') {
					setIsDetailsSheetOpen(true)
				}
			}
		}
	}, [location.pathname, navigation.state])

	return (
		<main className="flex h-full flex-col gap-4">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Reportes de Transacción</h1>
			</div>

			<div className="flex w-full flex-1 flex-col gap-4  lg:h-[48rem] lg:flex-row">
				<div className="flex h-full w-full flex-1 flex-col gap-4  xl:flex-row-reverse ">
					<div className="flex w-full flex-col  gap-4 xl:max-w-[25rem]   ">
						<Card className="w-full">
							<CardHeader className="pb-2">
								<CardDescription>Ingresos hoy</CardDescription>
								<CardTitle className="flex items-center gap-4 text-4xl">
									<span>{formatCurrency(dayEarnings.todaysEarnings)}</span>
									{dayEarnings.isIncrease ? (
										<Icon className="text-3xl" name="arrow-up" />
									) : null}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{dayEarnings.isIncrease ? (
									<div className="text-xs text-muted-foreground">
										+{dayEarnings.percentageDifference}% de ingresos respecto
										ayer
									</div>
								) : (
									<div className="text-xs text-muted-foreground">
										{dayEarnings.percentageDifference}% de los ingresos de ayer
									</div>
								)}
							</CardContent>
							<CardFooter>
								<Progress
									value={dayEarnings.percentageDifference}
									aria-label={
										dayEarnings.isIncrease
											? `${dayEarnings.percentageDifference}% incremento de ganancias`
											: `${dayEarnings.percentageDifference}% de ganancias de ayer`
									}
								/>
							</CardFooter>
						</Card>
						<Card className="w-full">
							<CardHeader className="pb-2">
								<CardDescription>Ingresos esta semana</CardDescription>
								<CardTitle className="flex items-center gap-4 text-4xl">
									<span>{formatCurrency(weekEarnings.thisWeekEarnings)} </span>
									{weekEarnings.isIncrease ? (
										<Icon className="text-3xl" name="arrow-up" />
									) : null}
								</CardTitle>
							</CardHeader>
							<CardContent>
								{weekEarnings.isIncrease ? (
									<div className="text-xs text-muted-foreground">
										+{weekEarnings.percentageDifference}% de ingresos respecto
										la semana pasada
									</div>
								) : (
									<div className="text-xs text-muted-foreground">
										{weekEarnings.percentageDifference}% de los ingresos de la
										semana anterior
									</div>
								)}
							</CardContent>
							<CardFooter>
								<Progress
									value={weekEarnings.percentageDifference}
									aria-label={
										weekEarnings.isIncrease
											? `${weekEarnings.percentageDifference}% incremento de ganancias`
											: `${weekEarnings.percentageDifference}% de ganancias de la semana anterior`
									}
								/>
							</CardFooter>
						</Card>
						<Card className="flex h-full w-full flex-1 flex-col">
							<CardHeader className="pb-2">
								<CardTitle>Detalle ingresos semanal</CardTitle>
								<CardDescription>
									Semana{' '}
									{`${format(
										startOfWeek(new Date(), { weekStartsOn: 1 }),
										'dd',
										{
											locale: es,
										},
									)} a ${format(
										endOfWeek(new Date(), { weekStartsOn: 1 }),
										"dd 'de' MMMM",
										{
											locale: es,
										},
									)}`}{' '}
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-1 flex-col items-center justify-center">
								<ChartContainer config={chartConfig} className="h-full w-full">
									<BarChart accessibilityLayer data={weekDailyEarnings}>
										<CartesianGrid strokeDasharray={'3 3'} vertical={false} />
										<XAxis
											dataKey="day"
											tickLine={false}
											tickMargin={10}
											axisLine={false}
											tickFormatter={value => value.slice(0, 3)}
										/>
										<ChartTooltip cursor={false} content={<CustomTooltip />} />
										<Bar
											dataKey="earnings"
											fill="var(--color-earnings)"
											radius={8}
										/>
									</BarChart>
								</ChartContainer>
							</CardContent>
							<CardFooter></CardFooter>
						</Card>
					</div>
					<div className="flex flex-1 flex-col gap-2">
						<div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
							<div className="flex h-fit w-fit  items-center gap-2 rounded-sm bg-secondary px-1 py-[1px]">
								{allTimePeriods.map((period, i) => (
									<div
										onClick={() => {
											const newSearchParams = new URLSearchParams(searchParams)
											newSearchParams.set(periodParam, period)

											navigate(`/reports?${newSearchParams.toString()}`)
										}}
										className={cn(
											'flex h-7 w-[5rem] cursor-pointer items-center justify-center rounded-sm text-sm font-semibold',
											periodFilter === period && 'bg-background',
											!periodFilter &&
												period === TimePeriod.TODAY &&
												'bg-background',
										)}
										key={i}
									>
										{timePeriodNames[period]}
									</div>
								))}
							</div>
							<div className="flex gap-4">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											variant="outline"
											size="sm"
											className="h-7  gap-1 text-sm"
										>
											<Icon name="filter" className="h-3.5 w-3.5 " />
											<span className="sr-only sm:not-sr-only">Filtrar</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
										<DropdownMenuSeparator />
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												Por estado
											</DropdownMenuSubTrigger>
											<DropdownMenuPortal>
												<DropdownMenuSubContent>
													{allOrderStatuses.map((orderStatus, index) => (
														<DropdownMenuCheckboxItem
															key={index}
															checked={
																searchParams.get(statusParam) === orderStatus
															}
															onClick={() => {
																setSearchParams(prev => {
																	prev.set(statusParam, orderStatus)
																	return prev
																})
															}}
														>
															{orderStatus}
														</DropdownMenuCheckboxItem>
													))}
												</DropdownMenuSubContent>
											</DropdownMenuPortal>
										</DropdownMenuSub>
										<DropdownMenuSub>
											<DropdownMenuSubTrigger>
												Por vendedor
											</DropdownMenuSubTrigger>
											<DropdownMenuPortal>
												<DropdownMenuSubContent>
													{businessSellers.map(businessSeller => (
														<DropdownMenuCheckboxItem
															key={businessSeller.id}
															checked={
																searchParams.get(sellerParam) ===
																businessSeller.id
															}
															onClick={() => {
																setSearchParams(prev => {
																	prev.set(sellerParam, businessSeller.id)
																	return prev
																})
															}}
														>
															{businessSeller.name}
														</DropdownMenuCheckboxItem>
													))}
												</DropdownMenuSubContent>
											</DropdownMenuPortal>
										</DropdownMenuSub>
										<DropdownMenuSeparator />
										<DropdownMenuCheckboxItem
											onClick={() => {
												setSearchParams('')
											}}
										>
											Quitar filtros
										</DropdownMenuCheckboxItem>
									</DropdownMenuContent>
								</DropdownMenu>
								<VerifyOrderDialog />
							</div>
						</div>
						<OrderReportsCard orders={orders} totalOrders={numberOfOrders} />
					</div>
				</div>

				<Sheet
					modal={false}
					open={isDetailsSheetOpen}
					onOpenChange={setIsDetailsSheetOpen}
				>
					<SheetContent className="p-0 ">
						<Outlet />
					</SheetContent>
				</Sheet>
			</div>
		</main>
	)
}

type OrderWithSellerName = Pick<
	Order,
	'id' | 'completedAt' | 'status' | 'total'
> & {
	seller: {
		name: string | null
	}
}

//!Make better var names
function OrderReportsCard({
	orders,
	totalOrders,
}: {
	orders: SerializeFrom<OrderWithSellerName>[]
	totalOrders: number
}) {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

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
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 items-center justify-between bg-card px-7 text-center sm:items-start sm:text-start md:flex-row">
				<div className="w-fit">
					<CardTitle>
						Transacciones - {getCardTitleFromParams(searchParams)}
					</CardTitle>
					{orders.length > 1 ? (
						<CardDescription>
							Mostrando {orders.length} de {totalOrders} transacciones.
						</CardDescription>
					) : null}
				</div>
				<PaginationBar top={50} total={totalOrders} />
			</CardHeader>
			<CardContent className="flex flex-col gap-3 sm:gap-1 ">
				{orders.map(order => (
					<LinkWithParams
						// onClick={() => setOpenReport(true)}
						key={order.id}
						prefetch={'intent'}
						className={({ isActive }) =>
							cn(
								'flex  flex-col items-center justify-between gap-1 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary sm:flex-row sm:gap-5 ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						preserveSearch
						to={order.id}
					>
						<span className="hidden w-[25%]  overflow-clip  text-nowrap text-center font-semibold uppercase sm:text-left xl:flex">
							{order.id.slice(-15)}
						</span>
						<span className="flex w-fit text-nowrap text-center font-semibold uppercase sm:w-[10rem] sm:text-left xl:hidden">
							{order.id.slice(-6)}
						</span>

						{isAdmin ? (
							<span className=" w-[25%] text-nowrap  text-center  text-muted-foreground">
								{order.seller.name}
							</span>
						) : null}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="hidden w-[25%] text-nowrap text-center  text-muted-foreground  2xl:flex">
										{format(new Date(order.completedAt), "dd'/'MM'/'yyyy", {
											locale: es,
										})}
									</span>
								</TooltipTrigger>
								<TooltipContent>
									<p>Fecha Ingreso</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>

						<Badge
							className={cn(
								'text-xs ',
								order.status === OrderStatus.DISCARDED && 'text-destructive',
								order.status === OrderStatus.PENDING && 'text-orange-400',
							)}
							variant="outline"
						>
							{order.status}
						</Badge>
						<span className="w-[20%] text-nowrap text-center font-semibold text-muted-foreground sm:text-end">
							{order.total !== 0 ? formatCurrency(order.total) : null}
						</span>
					</LinkWithParams>
				))}
			</CardContent>
		</Card>
	)
}

async function getLastTwoWeeksEarnings(businessId: string) {
	const currentWeekStartDate = startOfWeek(new Date(), { weekStartsOn: 1 })
	const currentWeekEndDate = endOfWeek(new Date(), { weekStartsOn: 1 })

	const previousWeekDate = subWeeks(new Date(), 1)
	const previousWeekStartDate = startOfWeek(previousWeekDate, {
		weekStartsOn: 1,
	})
	const previousWeekEndDate = endOfWeek(previousWeekDate, { weekStartsOn: 1 })

	const thisWeekOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: currentWeekStartDate, lte: currentWeekEndDate },
		},
		select: { status: true, total: true },
	})
	const previousWeekOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: previousWeekStartDate, lte: previousWeekEndDate },
		},
		select: { status: true, total: true },
	})

	const thisWeekEarnings = calculateTotalEarnings(thisWeekOrders)
	const previousWeekEarnings = calculateTotalEarnings(previousWeekOrders)

	return {
		thisWeekEarnings,
		previousWeekEarnings,
		isIncrease: thisWeekEarnings > previousWeekEarnings,
		percentageDifference: calculateEarningsComparison(
			thisWeekEarnings,
			previousWeekEarnings,
		),
	}
}

async function getWeeklyDailyEarnings(businessId: string) {
	const weekDays = eachDayOfInterval({
		start: startOfWeek(new Date(), { weekStartsOn: 1 }),
		end: endOfWeek(new Date(), { weekStartsOn: 1 }),
	})

	const dailyEarnings = await Promise.all(
		weekDays.map(async day => {
			const orders = await prisma.order.findMany({
				where: {
					businessId,
					completedAt: { gte: startOfDay(day), lte: endOfDay(day) },
				},
				select: { status: true, total: true },
			})
			const earnings = calculateTotalEarnings(orders)
			return {
				day: format(day, 'eeee', {
					locale: es,
				}),
				earnings,
			}
		}),
	)

	return dailyEarnings
}

async function getLastTwoDaysEarnings(businessId: string) {
	const currentDayStartDate = startOfToday()
	const currentDayEndDate = endOfToday()
	const previousDayStartDate = startOfYesterday()
	const previousDayEndDate = endOfYesterday()

	const todaysOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: currentDayStartDate, lte: currentDayEndDate },
		},
		select: { status: true, total: true },
	})
	const yesterdaysOrders = await prisma.order.findMany({
		where: {
			businessId,
			completedAt: { gte: previousDayStartDate, lte: previousDayEndDate },
		},
		select: { status: true, total: true },
	})

	const todaysEarnings = calculateTotalEarnings(todaysOrders)
	const yesterdaysEarnings = calculateTotalEarnings(yesterdaysOrders)

	return {
		todaysEarnings,
		yesterdaysEarnings,
		isIncrease: todaysEarnings > yesterdaysEarnings,
		percentageDifference: calculateEarningsComparison(
			todaysEarnings,
			yesterdaysEarnings,
		),
	}
}

function calculateEarningsComparison(current: number, previous: number) {
	if (previous === 0) {
		return current === 0 ? 0 : 100
	}

	if (current < previous) {
		return Number(((current * 100) / previous).toFixed())
	} else {
		return Number((((current - previous) / previous) * 100).toFixed())
	}
}

function calculateTotalEarnings(orders: Pick<Order, 'status' | 'total'>[]) {
	const orderTotals = orders
		.filter(order => order.status === OrderStatus.FINISHED)
		.map(order => order.total)

	if (orderTotals.length > 0) {
		return orderTotals.reduce((acc, orderTotal) => acc + orderTotal, 0)
	}
	return 0
}

export const meta: MetaFunction = () => {
	return [{ title: 'Reportes de transacción | Ventesca' }]
}

const CustomTooltip = ({
	active,
	payload,
	label,
}: TooltipProps<ValueType, NameType>) => {
	if (active && payload && payload.length) {
		return (
			<div className="flex items-center gap-1 rounded border bg-background p-1">
				<div className="h-2 w-2 bg-primary "></div>
				<p className="font-semibold capitalize">{`${label} : ${formatCurrency(Number(payload?.[0]?.value))}`}</p>
			</div>
		)
	}

	return null
}
