import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
import { formatRelative } from 'date-fns'

export async function loader({ request }: LoaderFunctionArgs) {
	const transactions = await prisma.transaction.findMany({
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			seller: { select: { name: true } },
		},
		orderBy: { createdAt: 'desc' },
	})

	return json({ transactions })
}

export default function ReportsRoute() {
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
						<TableHead>Estado</TableHead>
						<TableHead>Total</TableHead>
						<TableHead>Vendedor</TableHead>
						<TableHead>Creado en</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{transactions.map(transaction => (
						<TableRow key={transaction.id}>
							<TableCell
								className="uppercase hover:bg-secondary"
								onClick={() => navigate(transaction.id)}
							>
								{transaction.id}
							</TableCell>
							<TableCell>{transaction.status}</TableCell>
							<TableCell>{transaction.total}</TableCell>
							<TableCell>
								{transaction.seller ? transaction.seller.name : 'Desconocido'}
							</TableCell>
							<TableCell>
								{formatRelative(new Date(transaction.createdAt), new Date())}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</>
	)
}
