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
import { Category, Supplier } from '@prisma/client'
import { useNavigate, useSearchParams } from '@remix-run/react'
import { useState } from 'react'

import { SortDirection } from '#app/types/SortDirection.ts'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { LOW_STOCK_CHANGE_FOR_CONFIG } from '#app/routes/_inventory+/inventory.tsx'
import {
	FilterSelect,
	RemoveFiltersButton,
	SortDirectionButton,
} from '../filters'
import { useFilter } from '#app/hooks/useFilter.ts'
import { useSortDirection } from '#app/hooks/useSortDirection.ts'

export function InventoryFilters({
	categories,
	suppliers,
}: {
	categories: Pick<Category, 'id' | 'description'>[]
	suppliers: Pick<Supplier, 'id' | 'fantasyName'>[]
}) {
	const [stockFilter, setStockFilter] = useFilter(FILTER_PARAMS.STOCK, 'all')
	const [categoryFilter, setCategoryFilter] = useFilter(
		FILTER_PARAMS.CATEGORY,
		'all',
	)
	const [supplierFilter, setSupplierFilter] = useFilter(
		FILTER_PARAMS.SUPPLIER,
		'all',
	)
	const [sortBy, setSortBy] = useFilter(FILTER_PARAMS.SORT_BY, 'name')
	const [sortDirection, setSortDirection] = useSortDirection()
	const resetSelectValues = () => {
		setStockFilter('all')
		setCategoryFilter('all')
		setSupplierFilter('all')
		setSortBy('name')
		setSortDirection(SortDirection.ASC)
	}

	return (
		<div className="flex w-fit items-center justify-center flex-wrap gap-4 rounded-md bg-secondary/40 p-1 shadow-sm">
			<RemoveFiltersButton resetSelectValues={resetSelectValues} />
			<FilterSelect
				label="Stock"
				filter={stockFilter}
				setFilter={setStockFilter}
				options={[
					{ value: 'all', label: 'Sin Filtros' },
					{ value: LOW_STOCK_CHANGE_FOR_CONFIG, label: 'Bajo Stock' },
					{ value: '0', label: 'Sin Stock' },
				]}
			/>
			<FilterSelect
				label="Categoría"
				filter={categoryFilter}
				setFilter={setCategoryFilter}
				options={categories.map(category => ({
					value: category.id,
					label: category.description,
				}))}
				topOption={{ value: 'all', label: 'Sin Filtros' }}
			/>
			<FilterSelect
				label="Proveedor"
				filter={supplierFilter}
				setFilter={setSupplierFilter}
				options={suppliers.map(supplier => ({
					value: supplier.id,
					label: supplier.fantasyName,
				}))}
				topOption={{ value: 'all', label: 'Sin Filtros' }}
			/>
			<FilterSelect
				label="Ordenar por"
				filter={sortBy}
				setFilter={setSortBy}
				options={[
					{ value: 'name', label: 'Nombre' },
					{ value: 'stock', label: 'Stock' },
					{ value: 'code', label: 'Código' },
					{ value: 'selling-price', label: 'Precio de venta' },
				]}
			/>
			<SortDirectionButton
				sortDirection={sortDirection}
				onChange={setSortDirection}
			/>
		</div>
	)

	// return (
	// 	<div className="flex flex-wrap gap-4">
	// 		<div className="relative w-full sm:w-[180px]">
	// 			<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground">
	// 				Filtrar por stock
	// 			</FormLabel>
	// 			<Select
	// 				onValueChange={value => {
	// 					const newSearchParams = new URLSearchParams(searchParams)
	// 					if (value === 'all') {
	// 						newSearchParams.delete(FILTER_PARAMS.STOCK)
	// 					} else {
	// 						newSearchParams.set(FILTER_PARAMS.STOCK, value)
	// 					}
	// 					navigate(`/inventory?${newSearchParams}`, {
	// 						unstable_viewTransition: true,
	// 					})
	// 				}}
	// 			>
	// 				<SelectTrigger className="">
	// 					<SelectValue placeholder="Sin Filtros" />
	// 				</SelectTrigger>
	// 				<SelectContent>
	// 					<SelectItem value="all">Sin Filtros</SelectItem>
	// 					<SelectItem value={LOW_STOCK_CHANGE_FOR_CONFIG}>
	// 						Bajo Stock
	// 					</SelectItem>
	// 					<SelectItem value="0">Sin Stock</SelectItem>
	// 				</SelectContent>
	// 			</Select>
	// 		</div>
	// 		<div className="relative w-full sm:w-[180px]">
	// 			<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
	// 				Filtrar por categoría
	// 			</FormLabel>
	// 			<Select
	// 				onValueChange={value => {
	// 					const newSearchParams = new URLSearchParams(searchParams)
	// 					if (value === 'all') {
	// 						newSearchParams.delete(FILTER_PARAMS.CATEGORY)
	// 					} else {
	// 						newSearchParams.set(FILTER_PARAMS.CATEGORY, value)
	// 					}

	// 					navigate(`/inventory?${newSearchParams}`, {
	// 						unstable_viewTransition: true,
	// 					})
	// 				}}
	// 			>
	// 				<SelectTrigger className="">
	// 					<SelectValue placeholder="Sin Filtros" />
	// 				</SelectTrigger>
	// 				<SelectContent>
	// 					<SelectItem value="all">Sin Filtros</SelectItem>
	// 					{categories.map(category => (
	// 						<SelectItem key={category.id} value={category.id}>
	// 							{category.description}
	// 						</SelectItem>
	// 					))}
	// 				</SelectContent>
	// 			</Select>
	// 		</div>
	// 		<div className="relative flex w-full gap-1 sm:w-[250px] ">
	// 			<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
	// 				Ordenar por
	// 			</FormLabel>
	// 			<Select
	// 				onValueChange={value => {
	// 					const newSearchParams = new URLSearchParams(searchParams)
	// 					if (value === 'default') {
	// 						newSearchParams.delete(FILTER_PARAMS.SORT_BY)
	// 					} else {
	// 						newSearchParams.set(FILTER_PARAMS.SORT_BY, value)
	// 					}
	// 					navigate(`/inventory?${newSearchParams}`, {
	// 						unstable_viewTransition: true,
	// 					})
	// 				}}
	// 			>
	// 				<SelectTrigger className="">
	// 					<SelectValue placeholder="Por Defecto" />
	// 				</SelectTrigger>
	// 				<SelectContent>
	// 					<SelectItem value="default">Por Defecto</SelectItem>
	// 					<SelectItem value="name">Nombre</SelectItem>
	// 					<SelectItem value="stock">Stock</SelectItem>
	// 					<SelectItem value="code">Código</SelectItem>
	// 					<SelectItem value="selling-price">Precio de venta</SelectItem>
	// 				</SelectContent>
	// 			</Select>
	// 			{sortDirection === SortDirection.DESC ? (
	// 				<Button
	// 					onClick={() => {
	// 						setSortDirection(SortDirection.ASC)
	// 						const newSearchParams = new URLSearchParams(searchParams)
	// 						if (!newSearchParams.get('sort')) {
	// 							newSearchParams.set(FILTER_PARAMS.SORT_BY, 'name')
	// 						}
	// 						newSearchParams.set(FILTER_PARAMS.SORT_DIRECTION, sortDirection)
	// 						navigate(`/inventory?${newSearchParams}`)
	// 					}}
	// 					variant={'outline'}
	// 					size={'icon'}
	// 				>
	// 					<Icon size="sm" name="double-arrow-down" />
	// 					<span className="sr-only">Cambiar dirección de orden</span>
	// 				</Button>
	// 			) : (
	// 				<Button
	// 					onClick={() => {
	// 						setSortDirection(SortDirection.DESC)
	// 						const newSearchParams = new URLSearchParams(searchParams)
	// 						if (!newSearchParams.get('sort')) {
	// 							newSearchParams.set(FILTER_PARAMS.SORT_BY, 'name')
	// 						}
	// 						newSearchParams.set(FILTER_PARAMS.SORT_DIRECTION, sortDirection)
	// 						navigate(`/inventory?${newSearchParams}`)
	// 					}}
	// 					variant={'outline'}
	// 					size={'icon'}
	// 				>
	// 					<Icon size="sm" name="double-arrow-up" />
	// 					<span className="sr-only">Cambiar dirección de orden</span>
	// 				</Button>
	// 			)}
	// 		</div>
	// 	</div>
	// )
}
