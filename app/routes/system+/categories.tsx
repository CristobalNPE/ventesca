import { type Family } from '@prisma/client'
import { type SerializeFrom, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { type ColumnDef } from '@tanstack/react-table'
import { DataTable } from '#app/components/data-table.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'

export async function loader() {
	const categories = await prisma.family.findMany({
		select: {
			id: true,
			code: true,
			description: true,
			_count: { select: { items: true } },
		},
	})

	const formatted = categories.map(category => ({
		...category,
		totalItems: category._count.items,
	}))

	const totalCategories = await prisma.family.count()

	return json({ categories: formatted, totalCategories })
}

const columns: ColumnDef<
	SerializeFrom<Pick<Family, 'code' | 'description' | 'id'>>
>[] = [
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
					Descripción
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="font-bold tracking-wider  text-foreground">
					{row.getValue('description')}
				</div>
			)
		},

		accessorKey: 'description',
	},
	{
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Artículos en categoría
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="font-bold tracking-wider  text-foreground">
					{row.getValue('totalItems')}
				</div>
			)
		},

		accessorKey: 'totalItems',
	},
]

export default function CategoriesRoute() {
	const { categories, totalCategories } = useLoaderData<typeof loader>()

	return (
		<>
			<div className="flex justify-between border-b-2 border-secondary pb-4">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl">Categorías</h1>
					<h1 className="text-xl text-foreground/70">
						[{totalCategories} registradas]
					</h1>
				</div>
				<div className="flex items-center gap-6">
					<Button className="flex items-center gap-2">
						<Icon name="plus" size="md" />
						<span>Ingresar categoría</span>
					</Button>
				</div>
			</div>
			<DataTable
				withItemSearch={false}
				columns={columns}
				data={categories}
				searchFilter={{
					description: 'descripción',
					key: 'description',
				}}
			/>
		</>
	)
}
