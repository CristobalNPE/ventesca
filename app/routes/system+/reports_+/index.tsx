import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
import { formatRelative } from 'date-fns'
import {
	TRANSACTION_STATUS_COMPLETED,
	TRANSACTION_STATUS_DISCARDED,
	TRANSACTION_STATUS_PENDING,
} from '../sell.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	//If user is admin, gets all, otherwise only gets their own

	const transactions = await prisma.transaction.findMany({
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			seller: { select: { name: true } },
		},
		// where: { sellerId: userId },
		orderBy: { createdAt: 'desc' },
	})

	return json({ transactions })
}

export default function ReportsRoute() {
	const isAdmin = true
	const { transactions } = useLoaderData<typeof loader>()
	const navigate = useNavigate()

	// Seller should only see their own transactions
	// Admin should see all transactions

	return (
		<>
			<div className="flex justify-between border-b-2 border-secondary pb-4">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl">Reportes de Transacciones</h1>
					{/* <h1 className="text-xl text-foreground/70">
						[{totalItems} artículos]
					</h1> */}
				</div>
				<div className="flex items-center gap-6">
					{/* possible buttons here */}
				</div>
			</div>
			<Table>
				<TableHeader className="bg-secondary ">
					<TableRow>
						<TableHead>ID</TableHead>
						<TableHead>Creado en</TableHead>
						{isAdmin && <TableHead>Vendedor</TableHead>}
						<TableHead>Total</TableHead>
						<TableHead>Estado</TableHead>
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
								{formatRelative(new Date(transaction.createdAt), new Date())}
							</TableCell>
							{isAdmin && (
								<TableCell>
									{transaction.seller ? transaction.seller.name : 'Desconocido'}
								</TableCell>
							)}
							<TableCell>{formatCurrency(transaction.total)}</TableCell>
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
		</>
	)
}
