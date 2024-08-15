import { type Category, Supplier } from '@prisma/client'
import { useNavigate, useSearchParams } from '@remix-run/react'
import { useState } from 'react'
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

import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { useFilter } from '#app/hooks/useFilter.ts'
import { useSortDirection } from '#app/hooks/useSortDirection.ts'
import { LOW_STOCK_CHANGE_FOR_CONFIG } from '#app/routes/_inventory+/inventory.tsx'
import { SortDirection } from '#app/types/SortDirection.ts'
import {
	FilterSelect,
	RemoveFiltersButton,
	SortDirectionButton,
} from '../filters'

export function InventoryFilters({
	categories,
}: {
	categories: Pick<Category, 'id' | 'description'>[]
}) {
	const [stockFilter, setStockFilter] = useFilter(FILTER_PARAMS.STOCK, 'all')
	const [categoryFilter, setCategoryFilter] = useFilter(
		FILTER_PARAMS.CATEGORY,
		'all',
	)
	const [statusFilter, setStatusFilter] = useFilter(FILTER_PARAMS.STATUS, 'all')
	const [sortBy, setSortBy] = useFilter(FILTER_PARAMS.SORT_BY, 'name')
	const [sortDirection, setSortDirection] = useSortDirection()
	const resetSelectValues = () => {
		setStockFilter('all')
		setCategoryFilter('all')
		setStatusFilter('all')
		setSortBy('name')
		setSortDirection(SortDirection.ASC)
	}

	return (
		<div className="flex w-fit flex-wrap items-center justify-center gap-4 rounded-md bg-secondary/40 p-1 shadow-sm">
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
				label="Estado"
				filter={statusFilter}
				setFilter={setStatusFilter}
				options={[
					{ value: 'all', label: 'Todos' },
					{ value: 'active', label: 'Activo' },
					{ value: 'inactive', label: 'Inactivo' },
				]}
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
}
