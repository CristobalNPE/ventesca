import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

import { Label as FormLabel } from '#app/components/ui/label.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { Category } from '@prisma/client'
import { useNavigate, useSearchParams } from '@remix-run/react'
import { useState } from 'react'

import { SortDirection } from '#app/types/SortDirection.ts'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { LOW_STOCK_CHANGE_FOR_CONFIG } from '#app/routes/_inventory+/inventory.tsx'

export function InventoryFilters({
	categories,
}: {
	categories: Pick<Category, 'id' | 'description'>[]
}) {
	const navigate = useNavigate()

	const [searchParams, setSearchParams] = useSearchParams()
	const [sortDirection, setSortDirection] = useState<SortDirection>(
		SortDirection.DESC,
	)

	return (
		<div className="flex flex-wrap gap-4">
			<div className="relative w-full sm:w-[180px]">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground">
					Filtrar por stock
				</FormLabel>
				<Select
					onValueChange={value => {
						const newSearchParams = new URLSearchParams(searchParams)
						if (value === 'all') {
							newSearchParams.delete(FILTER_PARAMS.STOCK)
						} else {
							newSearchParams.set(FILTER_PARAMS.STOCK, value)
						}
						navigate(`/inventory?${newSearchParams}`, {
							unstable_viewTransition: true,
						})
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Sin Filtros" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Sin Filtros</SelectItem>
						<SelectItem value={LOW_STOCK_CHANGE_FOR_CONFIG}>
							Bajo Stock
						</SelectItem>
						<SelectItem value="0">Sin Stock</SelectItem>
					</SelectContent>
				</Select>
			</div>
			<div className="relative w-full sm:w-[180px]">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
					Filtrar por categoría
				</FormLabel>
				<Select
					onValueChange={value => {
						const newSearchParams = new URLSearchParams(searchParams)
						if (value === 'all') {
							newSearchParams.delete(FILTER_PARAMS.CATEGORY)
						} else {
							newSearchParams.set(FILTER_PARAMS.CATEGORY, value)
						}

						navigate(`/inventory?${newSearchParams}`, {
							unstable_viewTransition: true,
						})
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Sin Filtros" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Sin Filtros</SelectItem>
						{categories.map(category => (
							<SelectItem key={category.id} value={category.id}>
								{category.description}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="relative flex w-full gap-1 sm:w-[250px] ">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
					Ordenar por
				</FormLabel>
				<Select
					onValueChange={value => {
						const newSearchParams = new URLSearchParams(searchParams)
						if (value === 'default') {
							newSearchParams.delete(FILTER_PARAMS.SORT_BY)
						} else {
							newSearchParams.set(FILTER_PARAMS.SORT_BY, value)
						}
						navigate(`/inventory?${newSearchParams}`, {
							unstable_viewTransition: true,
						})
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Por Defecto" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="default">Por Defecto</SelectItem>
						<SelectItem value="name">Nombre</SelectItem>
						<SelectItem value="stock">Stock</SelectItem>
						<SelectItem value="code">Código</SelectItem>
						<SelectItem value="selling-price">Precio de venta</SelectItem>
					</SelectContent>
				</Select>
				{sortDirection === SortDirection.DESC ? (
					<Button
						onClick={() => {
							setSortDirection(SortDirection.ASC)
							const newSearchParams = new URLSearchParams(searchParams)
							if (!newSearchParams.get('sort')) {
								newSearchParams.set(FILTER_PARAMS.SORT_BY, 'name')
							}
							newSearchParams.set(FILTER_PARAMS.SORT_DIRECTION, sortDirection)
							navigate(`/inventory?${newSearchParams}`)
						}}
						variant={'outline'}
						size={'icon'}
					>
						<Icon size="sm" name="double-arrow-down" />
						<span className="sr-only">Cambiar dirección de orden</span>
					</Button>
				) : (
					<Button
						onClick={() => {
							setSortDirection(SortDirection.DESC)
							const newSearchParams = new URLSearchParams(searchParams)
							if (!newSearchParams.get('sort')) {
								newSearchParams.set(FILTER_PARAMS.SORT_BY, 'name')
							}
							newSearchParams.set(FILTER_PARAMS.SORT_DIRECTION, sortDirection)
							navigate(`/inventory?${newSearchParams}`)
						}}
						variant={'outline'}
						size={'icon'}
					>
						<Icon size="sm" name="double-arrow-up" />
						<span className="sr-only">Cambiar dirección de orden</span>
					</Button>
				)}
			</div>
		</div>
	)
}
