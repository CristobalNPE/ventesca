import { type Provider } from '@prisma/client'
import { type SerializeFrom, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { type ColumnDef } from '@tanstack/react-table'
import { format } from '@validatecl/rut'
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

export const providerColumns: ColumnDef<
	SerializeFrom<Pick<Provider, 'id' | 'rut' | 'name' | 'fantasyName'>>
>[] = [
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
		cell: ({ row }) => {
			return (
				<div className="tracking-wider  text-foreground">
					{format(row.getValue('rut'))}
				</div>
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
				<div className="font-bold uppercase tracking-wider  text-foreground">
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
					Nombre Empresa
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
	const { providers, totalProviders } = useLoaderData<typeof loader>()
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
					<Button asChild className="flex items-center gap-2">
						<Link to={'new'}>
							<Icon name="plus" size="md" />
							<span>Registrar proveedor</span>
						</Link>
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
