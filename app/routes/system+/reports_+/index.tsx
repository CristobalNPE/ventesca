import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
	NavLink,
	useLoaderData,
	useLocation,
	useNavigate,
} from '@remix-run/react'
import { format } from 'date-fns'
import {
	TRANSACTION_STATUS_COMPLETED,
	TRANSACTION_STATUS_DISCARDED,
	TRANSACTION_STATUS_PENDING,
} from '../sell.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const url = new URL(request.url)
	let since = url.searchParams.get('since')

	if (!since) {
		since = 'today'
	}

	// map since to date
	let sinceDate = new Date()
	switch (since) {
		case 'today':
			sinceDate = new Date(new Date().setDate(new Date().getDate() - 1))
			break
		case 'last-week':
			sinceDate = new Date(new Date().setDate(new Date().getDate() - 7))
			break
		case 'last-month':
			sinceDate = new Date(new Date().setMonth(new Date().getMonth() - 1))
			break
		case 'all':
			sinceDate = new Date(0)
			break
		default:
			sinceDate = new Date(new Date().setDate(new Date().getDate() - 1))
			break
	}

	//If user is admin, gets all, otherwise only gets their own

	const transactions = await prisma.transaction.findMany({
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			seller: { select: { name: true } },
		},
		where: { createdAt: { gte: sinceDate } },

		//order by completedAt if not null, else by createdAt
		orderBy: { completedAt: 'desc' },
	})

	const totalTransactions = await prisma.transaction.count({
		where: { createdAt: { gte: sinceDate } },
	})

	return json({ transactions, totalTransactions })
}

export default function ReportsRoute() {
	const isAdmin = true
	const { transactions, totalTransactions } = useLoaderData<typeof loader>()
	const navigate = useNavigate()

	// Seller should only see their own transactions
	// Admin should see all transactions

	const filters = [
		{
			label: 'Ultimas 24 hrs.',
			query: 'today',
		},
		{
			label: 'Ultima Semana',
			query: 'last-week',
		},
		{
			label: 'Ultimo Mes',
			query: 'last-month',
		},
		{
			label: 'Todas',
			query: 'all',
		},
	]

	const { search } = useLocation()
	const since = new URLSearchParams(search).get('since')

	return (
		<div className="max-w-[90rem]">
			<div className="flex justify-between border-b-2 border-secondary pb-4">
				<div className="flex flex-col ">
					<h1 className="text-2xl">Reportes de Transacciones</h1>
					<h1 className="text-lg text-foreground/70">
						Mostrando {totalTransactions}{' '}
						{totalTransactions !== 1 ? 'transacciones' : 'transacción'}
					</h1>
				</div>
				<div className="flex items-center gap-6">
					{filters.map(filter => (
						<NavLink
							key={filter.query}
							className={({ isActive }) =>
								cn(
									'rounded-md px-2 py-1 text-foreground/70 hover:text-foreground/100 ',
									isActive &&
										since === filter.query &&
										'bg-primary/70 text-foreground ',
								)
							}
							to={`?since=${filter.query}`}
						>
							{filter.label}
						</NavLink>
					))}
				</div>
			</div>
			<Table>
				<TableHeader className="bg-secondary ">
					<TableRow>
						<TableHead className="w-[20rem]">ID</TableHead>
						<TableHead className="w-[10rem]">Fecha Inicio</TableHead>
						{isAdmin && <TableHead className='w-[20rem]'>Vendedor</TableHead>}
						<TableHead className="w-[10rem]">Total</TableHead>
						<TableHead className="w-[12rem]">Estado</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactions.map(transaction => (
						<TableRow key={transaction.id}>
							<TableCell
								className="cursor-pointer uppercase hover:bg-secondary"
								onClick={() => navigate(transaction.id)}
							>
								{transaction.id}
							</TableCell>
							<TableCell>
								{format(
									new Date(transaction.createdAt),
									"dd/MM/yyyy",
								)}
							</TableCell>
							{isAdmin && (
								<TableCell className='text-ellipsis overflow-hidden'>
									{transaction.seller ? transaction.seller.name : 'Desconocido'}
								</TableCell>
							)}
							<TableCell className="font-bold">
								{transaction.status === TRANSACTION_STATUS_COMPLETED
									? formatCurrency(transaction.total)
									: null}
							</TableCell>
							<TableCell
								className={cn(
									'',
									transaction.status === TRANSACTION_STATUS_PENDING &&
										'bg-orange-400/10',
									transaction.status === TRANSACTION_STATUS_COMPLETED &&
										'bg-primary/10',
									transaction.status === TRANSACTION_STATUS_DISCARDED &&
										'bg-destructive/10',
								)}
							>
								{transaction.status}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
