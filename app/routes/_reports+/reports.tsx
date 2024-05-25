import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
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
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { Transaction } from '@prisma/client'
import { LoaderFunctionArgs, SerializeFrom, json } from '@remix-run/node'
import { NavLink, Outlet, useLoaderData, useLocation } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { TransactionStatus } from '../transaction+/_types/transaction-status.ts'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'

//MOVE THIS OUT OF HERE

enum TimePeriod {
	TODAY = 'today',
	LAST_WEEK = 'last-week',
	LAST_MONTH = 'last-month',
	LAST_YEAR = 'last-year',
}

const allTimePeriods = [
	TimePeriod.TODAY,
	TimePeriod.LAST_WEEK,
	TimePeriod.LAST_MONTH,
	TimePeriod.LAST_YEAR,
] as const

const timePeriodNames: Record<TimePeriod, string> = {
	[TimePeriod.TODAY]: 'Hoy',
	[TimePeriod.LAST_WEEK]: 'Semana',
	[TimePeriod.LAST_MONTH]: 'Mes',
	[TimePeriod.LAST_YEAR]: 'Año',
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)
	const url = new URL(request.url)
	const period = url.searchParams.get('period')?.toLowerCase()

	let startDate = new Date()
	startDate.setHours(0, 0, 0, 0)
	let endDate

	// Adjust date range based on the selected filter
	switch (period) {
		case TimePeriod.TODAY:
			endDate = new Date()
			break
		case TimePeriod.LAST_WEEK:
			startDate.setDate(startDate.getDate() - 7)
			endDate = new Date()
			break
		case TimePeriod.LAST_MONTH:
			startDate.setMonth(startDate.getMonth() - 1)
			endDate = new Date()
			break
		case TimePeriod.LAST_YEAR:
			startDate.setFullYear(startDate.getFullYear() - 1)
			endDate = new Date()
			break
		default:
			//fetch only last day if no range given
			endDate = new Date()
			break
	}

	const transactions = await prisma.transaction.findMany({
		select: {
			id: true,
			createdAt: true,
			status: true,
			total: true,
			seller: { select: { name: true } },
		},
		where: {
			businessId,
			// Add date filter if startDate and endDate are defined
			...(startDate &&
				endDate && { createdAt: { gte: startDate, lte: endDate } }),
		},
		orderBy: { createdAt: 'desc' },
	})

	return json({ transactions })
}

export default function TransactionReportsRoute() {
	const isAdmin = true

	const { transactions } = useLoaderData<typeof loader>()
	const { search } = useLocation()
	const periodParam = new URLSearchParams(search).get('period')

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Reportes de Transacción</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="grid h-[93%]  gap-4 lg:grid-cols-3">
				<div className="grid gap-4 lg:col-span-2">
					<div className="grid gap-4 xl:grid-cols-2 ">
						<Card>
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
						<Card>
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
					<div className="flex justify-between">
						<div className="flex items-center gap-2 rounded-sm bg-secondary px-1 py-[1px]">
							{allTimePeriods.map((period, i) => (
								<NavLink
									key={i}
									className={({ isActive }) =>
										cn(
											'flex h-7 w-[5rem] items-center justify-center rounded-sm text-sm font-semibold',
											isActive && periodParam === period && 'bg-background',
										)
									}
									to={`/reports/?period=${period}`}
								>
									{timePeriodNames[period]}
								</NavLink>
							))}
						</div>
						<div className="flex gap-4">
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="outline"
										size="sm"
										className="h-7 gap-1 text-sm"
									>
										<Icon name="filter" className="h-3.5 w-3.5" />
										<span className="sr-only sm:not-sr-only">Filtrar</span>
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuLabel>Filter by</DropdownMenuLabel>
									<DropdownMenuSeparator />
									<DropdownMenuCheckboxItem checked>
										Fulfilled
									</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem>Declined</DropdownMenuCheckboxItem>
									<DropdownMenuCheckboxItem>Refunded</DropdownMenuCheckboxItem>
								</DropdownMenuContent>
							</DropdownMenu>
							<Button variant="outline" size="sm" className="h-7 gap-1 text-sm">
								<Icon name="file-text" className="h-3.5 w-3.5" />
								<span className="sr-only sm:not-sr-only">Exportar</span>
							</Button>
						</div>
					</div>
					<TransactionReportsTable transactions={transactions} />
				</div>
				<div className="">
					<Outlet />
				</div>
			</div>
		</main>
	)
}

type TransactionWithSellerName = Pick<
	Transaction,
	'id' | 'createdAt' | 'status' | 'total'
> & {
	seller: {
		name: string | null
	}
}

function TransactionReportsTable({
	transactions,
}: {
	transactions: SerializeFrom<TransactionWithSellerName>[]
}) {
	const location = useLocation()

	return (
		<Card>
			<CardHeader className="px-7">
				<CardTitle>Transacciones</CardTitle>
				<CardDescription>
					Ultimas {transactions.length} transacciones ingresadas en sistema.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ScrollArea className="relative h-[25rem]  rounded-t-sm">
					<Table>
						<TableHeader className="sticky top-0 rounded-t-sm bg-secondary">
							<TableRow>
								<TableHead></TableHead>
								<TableHead>ID</TableHead>
								<TableHead className="hidden sm:table-cell">Vendedor</TableHead>
								<TableHead className="hidden sm:table-cell">
									Fecha Inicio
								</TableHead>
								<TableHead className="hidden md:table-cell">Estado</TableHead>
								<TableHead className="text-right">Total</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{transactions.map(transaction => (
								<TableRow
									key={transaction.id}
									className={cn(
										'duration-0 hover:bg-secondary/30',
										location.pathname.includes(transaction.id) &&
											'bg-secondary/50 hover:bg-secondary/50',
									)}
								>
									<TableCell className="text-xs uppercase">
										<Button size={'sm'} className="h-7 w-7" asChild>
											<LinkWithParams
												className={''}
												preserveSearch
												to={transaction.id}
											>
												<span className="sr-only">Detalles transacción</span>
												<Icon className="shrink-0" name="file-text" />
											</LinkWithParams>
										</Button>
									</TableCell>
									<TableCell className="text-xs uppercase">
										{transaction.id}
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{transaction.seller.name}
									</TableCell>
									<TableCell className="hidden sm:table-cell">
										{format(new Date(transaction.createdAt), "dd'/'MM'/'yyyy", {
											locale: es,
										})}
									</TableCell>
									<TableCell className="hidden md:table-cell">
										<Badge
											className={cn(
												'text-xs',
												transaction.status === TransactionStatus.DISCARDED &&
													'text-destructive',
												transaction.status === TransactionStatus.PENDING &&
													'text-orange-400',
											)}
											variant="outline"
										>
											{transaction.status}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										{formatCurrency(transaction.total)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</ScrollArea>
			</CardContent>
		</Card>
	)
}
