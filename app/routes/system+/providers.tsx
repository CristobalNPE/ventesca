import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '#app/components/data-table.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'

export async function loader() {
	const providers = await prisma.provider
		.findMany({
			orderBy: { name: 'asc' },
			select: {
				id: true,
				rut: true,
		
				name: true,
				fantasyName: true,
			},
		})
		.then(u => u)

	const totalProviders = await prisma.provider.count()

	

	return json({ providers, totalProviders })
}

export const providerColumns: ColumnDef<{}>[] = [
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					RUT
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},

		accessorKey: 'rut',
	},

	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Nombre Proveedor
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="font-bold tracking-wider  text-foreground">
					{row.getValue('name')}
				</div>
			)
		},

		accessorKey: 'name',
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Empresa
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="font-bold tracking-wider  text-foreground">
					{row.getValue('fantasyName')}
				</div>
			)
		},

		accessorKey: 'fantasyName',
	},
]

export default function ProvidersRoute() {
	const {  providers, totalProviders } = useLoaderData<typeof loader>()
	return (
		<>
			<div className="flex justify-between border-b-2 border-secondary pb-4">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl">Proveedores</h1>
					<h1 className="text-xl text-foreground/70">
						[{totalProviders} registrados]
					</h1>
				</div>
				<div className="flex items-center gap-6">
					<Button className="flex items-center gap-2">
						<Icon name="plus" size="md" />
						<span>Registrar proveedor</span>
					</Button>
				</div>
			</div>
			<DataTable
				withItemSearch={false}
				columns={providerColumns}
				data={providers}
				searchFilter={{
					description: 'RUT',
					key: 'rut',
				}}
			/>
		</>
	)
}
