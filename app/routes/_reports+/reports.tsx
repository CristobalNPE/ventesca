import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Spacer } from '#app/components/spacer.tsx'
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
import { type Order } from '@prisma/client'
import {
	type LoaderFunctionArgs,
	type SerializeFrom,
	json,
} from '@remix-run/node'
import {
	MetaFunction,
	Outlet,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react'
import {
	endOfMonth,
	endOfToday,
	endOfWeek,
	endOfYear,
	format,
	startOfMonth,
	startOfToday,
	startOfWeek,
	startOfYear,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { Prisma } from '@prisma/client'

import { OrderStatus, allOrderStatuses } from '../order+/_types/order-status.ts'

export enum TimePeriod {
	TODAY = 'today',
	LAST_WEEK = 'last-week',
	LAST_MONTH = 'last-month',
	LAST_YEAR = 'last-year',
}

export const allTimePeriods = [
	TimePeriod.TODAY,
	TimePeriod.LAST_WEEK,
	TimePeriod.LAST_MONTH,
	TimePeriod.LAST_YEAR,
] as const

export const timePeriodNames: Record<TimePeriod, string> = {
	[TimePeriod.TODAY]: 'Hoy',
	[TimePeriod.LAST_WEEK]: 'Semana',
	[TimePeriod.LAST_MONTH]: 'Mes',
	[TimePeriod.LAST_YEAR]: 'Año',
}

const statusParam = 'status'
const periodParam = 'period'
const sellerParam = 'seller'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 10
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const periodFilter = url.searchParams.get(periodParam)?.toLowerCase()
	const statusFilter = url.searchParams.get(statusParam)
	const sellerFilter = url.searchParams.get(sellerParam)

	const { startDate, endDate } = getDateRangeByParam(periodFilter)

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

	const [numberOfOrders, orders, businessSellers] = await Promise.all([
		numberOfOrdersPromise,
		ordersPromise,
		businessSellersPromise,
	])

	return json({ orders, numberOfOrders, businessSellers })
}

export default function OrderReportsRoute() {
	const { orders, numberOfOrders, businessSellers } =
		useLoaderData<typeof loader>()

	const [searchParams, setSearchParams] = useSearchParams()
	const periodFilter = searchParams.get(periodParam)

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Reportes de Transacción</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="grid items-start  gap-4 lg:h-[85dvh] lg:grid-cols-3 ">
				<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-2">
					<div className="flex flex-col gap-4 lg:flex-row">
						<Card className="w-full">
							<CardHeader className="pb-2">
								<CardDescription>This Week</CardDescription>
								<CardTitle className="text-4xl">$1,329</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-xs text-muted-foreground">
									+25% from last week
								</div>
							</CardContent>
							<CardFooter>
								<Progress value={25} aria-label="25% increase" />
							</CardFooter>
						</Card>
						<Card className="w-full">
							<CardHeader className="pb-2">
								<CardDescription>This Week</CardDescription>
								<CardTitle className="text-4xl">$1,329</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-xs text-muted-foreground">
									+25% from last week
								</div>
							</CardContent>
							<CardFooter>
								<Progress value={25} aria-label="25% increase" />
							</CardFooter>
						</Card>
					</div>
					<div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
						<div className="flex h-fit w-fit items-center gap-2 rounded-sm bg-secondary px-1 py-[1px]">
							{allTimePeriods.map((period, i) => (
								<div
									onClick={() => {
										setSearchParams(prev => {
											prev.set(periodParam, period)
											return prev
										})
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
										<DropdownMenuSubTrigger>Por estado</DropdownMenuSubTrigger>
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
							<Button
								asChild
								variant="outline"
								size="sm"
								className="h-7 gap-1 text-sm"
							>
								<LinkWithParams
									preserveSearch
									target="_blank"
									reloadDocument
									to={`/reports/orders-report`}
								>
									<span className="flex gap-1 lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
										<Icon name="file-text" className="h-3.5 w-3.5" />
										<span className="sr-only sm:not-sr-only">Exportar</span>
									</span>
								</LinkWithParams>
							</Button>
						</div>
					</div>
					<OrderReportsCard orders={orders} totalOrders={numberOfOrders} />
				</div>

				<div className="col-span-1 ">
					<Outlet />
				</div>
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

function OrderReportsCard({
	orders,
	totalOrders,
}: {
	orders: SerializeFrom<OrderWithSellerName>[]
	totalOrders: number
}) {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	if (orders.length === 0) {
		return (
			<div className="flex h-full items-center justify-center rounded-sm bg-card text-muted-foreground">
				<p>Sin transacciones durante este periodo.</p>
			</div>
		)
	}

	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 items-center justify-between bg-card px-7 text-center sm:items-start sm:text-start md:flex-row">
				<div className="w-fit">
					<CardTitle>Transacciones</CardTitle>
					{orders.length > 1 ? (
						<CardDescription>
							Mostrando {orders.length} de {totalOrders} transacciones.
						</CardDescription>
					) : null}
				</div>
				<PaginationBar top={10} total={totalOrders} />
			</CardHeader>
			<CardContent className="flex flex-col gap-3 sm:gap-1 ">
				{orders.map(order => (
					<LinkWithParams
						key={order.id}
						prefetch={'intent'}
						className={({ isActive }) =>
							cn(
								'flex flex-col items-center justify-between gap-1 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary sm:flex-row sm:gap-5 ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						preserveSearch
						to={order.id}
					>
						<span className="hidden w-[15rem]  overflow-clip  text-nowrap text-center font-semibold uppercase sm:text-left xl:flex">
							{order.id.slice(-15)}
						</span>
						<span className="flex w-fit text-nowrap text-center font-semibold uppercase sm:w-[10rem] sm:text-left xl:hidden">
							{order.id.slice(-6)}
						</span>

						{isAdmin ? (
							<span className=" w-[15rem] text-nowrap  text-center  text-muted-foreground">
								{order.seller.name}
							</span>
						) : null}

						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<span className="hidden w-[15rem] text-nowrap text-center  text-muted-foreground  2xl:flex">
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
						<span className="w-[15rem] text-nowrap text-center font-semibold text-muted-foreground sm:text-end">
							{order.total !== 0 ? formatCurrency(order.total) : null}
						</span>
					</LinkWithParams>
				))}
			</CardContent>
		</Card>
	)
}

function getDateRangeByParam(param: string | undefined) {
	switch (param) {
		case TimePeriod.TODAY:
			return { startDate: startOfToday(), endDate: endOfToday() }
		case TimePeriod.LAST_WEEK:
			return {
				startDate: startOfWeek(new Date(), { weekStartsOn: 1 }),
				endDate: endOfWeek(new Date(), { weekStartsOn: 1 }),
			}
		case TimePeriod.LAST_MONTH:
			return {
				startDate: startOfMonth(new Date()),
				endDate: endOfMonth(new Date()),
			}
		case TimePeriod.LAST_YEAR:
			return {
				startDate: startOfYear(new Date()),
				endDate: endOfYear(new Date()),
			}
		default:
			return { startDate: startOfToday(), endDate: endOfToday() }
	}
}

export const meta: MetaFunction = () => {
	return [{ title: 'Ventesca | Reportes de transacción' }]
}
