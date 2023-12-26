import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const transactions = await prisma.transaction.findMany({
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			seller: { select: { name: true } },
		},
	})

	return json({ transactions })
}

export default function ReportsRoute() {
	const { transactions } = useLoaderData<typeof loader>()

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
			{JSON.stringify(transactions)}
		</>
	)
}
