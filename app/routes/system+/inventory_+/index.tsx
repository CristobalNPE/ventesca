import { defer, redirect, type LoaderFunctionArgs } from '@remix-run/node'
import { Await, Link, useLoaderData } from '@remix-run/react'
import { type ColumnDef } from '@tanstack/react-table'
import { Suspense } from 'react'
import { DataTable, DataTableSkeleton } from '#app/components/data-table.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const searchTerm = url.searchParams.get('search')

	const byProvider = url.searchParams.get('by-provider')

	if (byProvider) {
		const items = prisma.item
			.findMany({
				orderBy: { code: 'asc' },
				select: {
					id: true,
					code: true,
					name: true,
					sellingPrice: true,
					price: true,
					stock: true,
					family: { select: { description: true } },
				},
				where: {
					providerId: byProvider,
				},
			})
			.then(u => u)

		const totalItems = await prisma.item.count()

		return defer({ items, totalItems })
	}

	if (searchTerm === '') {
		return redirect('/system/inventory')
	}

	const items = prisma.item
		.findMany({
			orderBy: { code: 'asc' },
			select: {
				id: true,
				code: true,
				name: true,
				sellingPrice: true,
				price: true,
				stock: true,
				family: { select: { description: true } },
			},
			where: {
				code: searchTerm ? parseInt(searchTerm.toString()) : undefined,
			},
		})
		.then(u => u)

	const totalItems = await prisma.item.count()

	return defer({ items, totalItems })
}

const columns: ColumnDef<{}>[] = [
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Código
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},

		accessorKey: 'code',
	},

	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Nombre / Descripción
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="font-bold uppercase tracking-wider text-foreground">
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
					className=" text-right"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Categoría
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},

		accessorKey: 'family.description',
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					className=" text-right"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Stock
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return <div className="text-center">{row.getValue('stock')}</div>
		},

		accessorKey: 'stock',
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
					Valor
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			const formatted = formatCurrency(row.getValue('price'))
			return (
				<div className="text-right font-medium text-foreground/80">
					{formatted}
				</div>
			)
		},

		accessorKey: 'price',
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
					Precio Venta
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			const formatted = formatCurrency(row.getValue('sellingPrice'))
			return <div className="text-right font-bold">{formatted}</div>
		},

		accessorKey: 'sellingPrice',
	},
]

export default function InventoryRoute() {
	const isAdmin = true
	const { items, totalItems } = useLoaderData<typeof loader>()

	return (
		<>
			<div className="flex justify-between border-b-2 border-secondary pb-4">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl">Administración de Inventario</h1>
					<h1 className="text-xl text-foreground/70">
						[{totalItems} artículos]
					</h1>
				</div>
				{isAdmin && (
					<div className="flex items-center gap-6">
						<Button asChild className="flex items-center gap-2">
							<Link to="new">
								<Icon name="plus" size="md" />
								<span>Agregar articulo</span>
							</Link>
						</Button>
						<Button variant={'secondary'} className="flex items-center gap-2">
							<Icon name="file-text" size="md" />
							<span>Descargar reporte</span>
						</Button>
					</div>
				)}
			</div>
			<Suspense fallback={<DataTableSkeleton />}>
				<Await resolve={items}>
					{items => (
						<DataTable
							withItemSearch
							columns={columns}
							data={items}
							searchFilter={{ description: 'nombre', key: 'name' }}
						/>
					)}
				</Await>
			</Suspense>
		</>
	)
}
