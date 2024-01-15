import { DataTable, DataTableSkeleton } from '#app/components/data-table.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import {
	NavLink,
	useLoaderData,
	useLocation,
	useNavigation,
} from '@remix-run/react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import {
	TRANSACTION_STATUS_COMPLETED,
	TRANSACTION_STATUS_DISCARDED,
	TRANSACTION_STATUS_PENDING,
} from '../sell.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	console.log(userId)

	const url = new URL(request.url)
	let since = url.searchParams.get('since')

	if (!since) {
		throw redirect('/system/reports?since=today')
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

	const transactions = await prisma.transaction
		.findMany({
			select: {
				id: true,
				status: true,
				createdAt: true,
				total: true,
				seller: { select: { name: true } },
			},
			where: { completedAt: { gte: sinceDate } },

			//order by completedAt if not null, else by createdAt
			orderBy: { completedAt: 'desc' },
		})
		.then(u => u)

	const totalTransactions = await prisma.transaction.count({
		where: { createdAt: { gte: sinceDate } },
	})

	return json({ transactions, totalTransactions })
}

const columns: ColumnDef<{}>[] = [
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					ID
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return <div className="uppercase">{row.getValue('id')}</div>
		},

		accessorKey: 'id',
	},

	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Fecha creación
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="">
					{format(new Date(row.getValue('createdAt')), 'dd/MM/yyyy')}
				</div>
			)
		},

		accessorKey: 'createdAt',
	},

	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className=" text-right"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Vendedor
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},

		accessorKey: 'seller.name',
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className=" text-right"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Total
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			const shouldShowTotal =
				row.getValue('status') === TRANSACTION_STATUS_COMPLETED
			return (
				<div className="text-left font-bold">
					{shouldShowTotal && formatCurrency(row.getValue('total'))}
				</div>
			)
		},

		accessorKey: 'total',
	},

	//
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className="flex w-full justify-end px-2 text-right"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Estado
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},

		cell: ({ row }) => {
			return (
				<div
					className={cn(
						'',
						row.getValue('status') === TRANSACTION_STATUS_PENDING &&
							'text-orange-400',
						row.getValue('status') === TRANSACTION_STATUS_COMPLETED &&
							'text-primary',
						row.getValue('status') === TRANSACTION_STATUS_DISCARDED &&
							'text-destructive',
					)}
				>
					{row.getValue('status')}
				</div>
			)
		},

		accessorKey: 'status',
	},
	//
]

export default function ReportsRoute() {
	const isAdmin = false
	const { transactions, totalTransactions } = useLoaderData<typeof loader>()

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
	const navigation = useNavigation()
	const isLoadingAll = navigation.state === 'loading'

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
			{isLoadingAll ? (
				<DataTableSkeleton />
			) : (
				<DataTable
					withItemSearch={false}
					columns={columns}
					data={transactions}
					searchFilter={{
						description: 'ID',
						key: 'id',
					}}
				/>
			)}
		</div>
	)
}
