import { DataTable } from '#app/components/data-table.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { z } from 'zod'

export const DISCOUNT_TYPE_PERCENTAGE = 'PERCENTAGE'
export const DISCOUNT_TYPE_FIXED = 'FIXED'
const discountTypes = [DISCOUNT_TYPE_PERCENTAGE, DISCOUNT_TYPE_FIXED] as const
export const DiscountTypeSchema = z.enum(discountTypes)
export type DiscountType = z.infer<typeof DiscountTypeSchema>

export const DISCOUNT_TARGET_UNIT = 'BY-UNIT'
export const DISCOUNT_TARGET_TOTAL = 'BY-TOTAL'
const discountTargets = [DISCOUNT_TARGET_UNIT, DISCOUNT_TARGET_TOTAL] as const
export const DiscountTargetSchema = z.enum(discountTargets)
export type DiscountTarget = z.infer<typeof DiscountTargetSchema>

export const DISCOUNT_REACH_ITEM = 'BY-ITEM'
export const DISCOUNT_REACH_CATEGORY = 'BY-CATEGORY'
const discountReaches = [DISCOUNT_REACH_ITEM, DISCOUNT_REACH_CATEGORY] as const
export const DiscountReachSchema = z.enum(discountReaches)
export type DiscountReach = z.infer<typeof DiscountReachSchema>

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	const discounts = await prisma.discount.findMany({
		select: {
			id: true,
			createdAt: true,
			description: true,

			validFrom: true,
			validUntil: true,
		},
	})

	const now = new Date()
	const totalActiveDiscounts = await prisma.discount.count({
		where: { validFrom: { lte: now }, validUntil: { gte: now } },
	})

	type FetchedDiscount = (typeof discounts)[0]

	const discountIsValid = (discount: FetchedDiscount) => {
		const now = new Date()
		if (discount.validFrom && discount.validUntil) {
			return discount.validFrom <= now && discount.validUntil >= now
		}
		return false
	}
	const checkedDiscounts = discounts.map(discount => ({
		...discount,
		isActive: discountIsValid(discount),
	}))

	return json({ discounts: checkedDiscounts, totalActiveDiscounts })
}

type DiscountColumns = {
	id: string
	description: string
	isActive: boolean
	validFrom: Date | null
	validUntil: Date | null
}
const columns: ColumnDef<DiscountColumns>[] = [
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
					Descripción
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			return (
				<div className="font-bold uppercase tracking-tight">
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
					Fecha Creación
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
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
				>
					Estado
					<Icon name="arrow-up-down" className="ml-2 h-4 w-4" />
				</Button>
			)
		},
		cell: ({ row }) => {
			const isActive = row.getValue('isActive')
			const status = isActive ? 'Activo' : 'Inactivo'
			return (
				<div className="font-bold tracking-wider  text-foreground">
					{status}
				</div>
			)
		},

		accessorKey: 'isActive',
	},
]

export default function DiscountsPage() {
	const { discounts, totalActiveDiscounts } = useLoaderData<typeof loader>()
	const isAdmin = true

	return (
		<>
			<div className="flex justify-between border-b-2 border-secondary pb-4">
				<div className="flex items-center gap-4">
					<h1 className="text-2xl">Promociones y Descuentos</h1>
					<h1 className="text-xl text-foreground/70">
						[{totalActiveDiscounts}{' '}
						{totalActiveDiscounts === 1
							? 'promoción activa'
							: 'promociones activas'}
						]
					</h1>
				</div>
				{isAdmin && (
					<div className="flex items-center gap-6">
						<Button asChild>
							<Link to="new">
								<Icon name="plus" className="mr-2" />
								Ingresar Promoción
							</Link>
						</Button>
					</div>
				)}
			</div>
			<DataTable
				withItemSearch={false}
				columns={columns}
				data={discounts as any}
				searchFilter={{
					description: 'ID',
					key: 'id',
				}}
			/>
		</>
	)
}
