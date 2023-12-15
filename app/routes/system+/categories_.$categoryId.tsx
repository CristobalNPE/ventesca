import { DataTable } from '#app/components/data-table.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Checkbox } from '#app/components/ui/checkbox.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { ColumnDef } from '@tanstack/react-table'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const category = await prisma.family.findUnique({
		where: { id: params.categoryId },
		select: {
			code: true,
			description: true,
			items: {
				select: {
					id: true,
					code: true,
					name: true,
				},
			},
			_count: { select: { items: true } },
		},
	})

	invariantResponse(category, 'Not found', { status: 404 })

	return json({ category })
}

const columns: ColumnDef<{}>[] = [
	{
		id: 'select',
		header: ({ table }) => (
			<Checkbox
				
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && 'indeterminate')
				}
				onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
				aria-label="Select all"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={value => row.toggleSelected(!!value)}
				aria-label="Select row"
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},

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
				<div className="font-bold tracking-wider  text-foreground">
					{row.getValue('name')}
				</div>
			)
		},

		accessorKey: 'name',
	},
]

export default function CategoryRoute() {
	const { category } = useLoaderData<typeof loader>()

	return (
		<>
			<div className="my-4 flex flex-col text-2xl">
				<div className="flex items-baseline gap-4">
					<span className="font-semibold">{category.description}</span>
					<span className="text-lg text-foreground/80">
						{category._count.items} artículos en esta categoría.
					</span>
				</div>
				<div className="mt-2 flex items-center gap-5 text-foreground/70">
					<span>Código: [{category.code}]</span>
				</div>
			</div>

			<DataTable
		
				withItemSearch={false}
				columns={columns}
				data={category.items}
				searchFilter={{ description: 'nombre', key: 'name' }}
		
			/>
		</>
	)
}
