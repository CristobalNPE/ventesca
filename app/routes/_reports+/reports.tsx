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
import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { useUser, userHasRole } from '#app/utils/user.ts'

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
	const $top = Number(url.searchParams.get('$top')) || 10
	const $skip = Number(url.searchParams.get('$skip')) || 0
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

	const { roles: userRoles } = await prisma.user.findFirstOrThrow({
		where: { id: userId },
		select: { roles: true },
	})

	const isAdmin = userRoles.map(role => role.name).includes('Administrador')

	const numberOfTransactionsPromise = prisma.transaction.count({
		where: {
			businessId,
			...(!isAdmin && { sellerId: userId }),
			// Add date filter if startDate and endDate are defined
			...(startDate &&
				endDate && { createdAt: { gte: startDate, lte: endDate } }),
		},
	})

	const transactionsPromise = prisma.transaction.findMany({
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
		where: {
			businessId,
			...(!isAdmin && { sellerId: userId }),
			// Add date filter if startDate and endDate are defined
			...(startDate &&
				endDate && { createdAt: { gte: startDate, lte: endDate } }),
		},
		orderBy: { completedAt: 'desc' },
	})

	const [numberOfTransactions, transactions] = await Promise.all([
		numberOfTransactionsPromise,
		transactionsPromise,
	])

	return json({ transactions, numberOfTransactions })
}

export default function TransactionReportsRoute() {
	const { transactions, numberOfTransactions } = useLoaderData<typeof loader>()
	const { search } = useLocation()
	const periodParam = new URLSearchParams(search).get('period')

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Reportes de Transacción</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="flex xl:h-[85dvh] flex-col gap-4 xl:flex-row ">
				<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
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
					<div className="flex justify-between">
						<div className="flex h-fit items-center gap-2 rounded-sm bg-secondary px-1 py-[1px]">
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
					<TransactionReportsTable
						transactions={transactions}
						totalTransactions={numberOfTransactions}
					/>
				</div>
				<div className="w-full xl:w-[30rem]">
					<Outlet />
				</div>
			</div>
		</main>
	)
}

type TransactionWithSellerName = Pick<
	Transaction,
	'id' | 'completedAt' | 'status' | 'total'
> & {
	seller: {
		name: string | null
	}
}

function TransactionReportsTable({
	transactions,
	totalTransactions,
}: {
	transactions: SerializeFrom<TransactionWithSellerName>[]
	totalTransactions: number
}) {
	const location = useLocation()
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	if (transactions.length === 0) {
		return (
			<div className="flex h-full items-center justify-center rounded-sm bg-card text-muted-foreground">
				<p>Sin transacciones durante este periodo.</p>
			</div>
		)
	}

	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 justify-between bg-card px-7 md:flex-row">
				<div className="w-fit">
					<CardTitle>Transacciones</CardTitle>
					{transactions.length > 1 ? (
						<CardDescription>
							Mostrando {transactions.length} de {totalTransactions}{' '}
							transacciones.
						</CardDescription>
					) : null}
				</div>
				<PaginationBar top={10} total={totalTransactions} />
			</CardHeader>
			<CardContent>
				<Table className="relative rounded-sm">
					<TableHeader className="sticky top-[5.7rem] rounded-t-sm bg-secondary">
						<TableRow>
							<TableHead></TableHead>
							<TableHead>ID</TableHead>
							{isAdmin ? (
								<TableHead className="hidden sm:table-cell">Vendedor</TableHead>
							) : null}
							<TableHead className="hidden sm:table-cell">
								Fecha Ingreso
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
											prefetch={'intent'}
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
								{isAdmin ? (
									<TableCell className="hidden sm:table-cell">
										{transaction.seller.name}
									</TableCell>
								) : null}
								<TableCell className="hidden sm:table-cell">
									{format(new Date(transaction.completedAt), "dd'/'MM'/'yyyy", {
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
								<TableCell className="text-right font-bold">
									{formatCurrency(transaction.total)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
