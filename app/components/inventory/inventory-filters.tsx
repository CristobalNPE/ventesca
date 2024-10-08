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

import { useFilter } from '#app/hooks/useFilter.ts'
import { useSortDirection } from '#app/hooks/useSortDirection.ts'
import { LOW_STOCK_CHANGE_FOR_CONFIG } from '#app/routes/_inventory+/inventory.tsx'
import { SortDirection } from '#app/types/SortDirection.ts'
import {
	FilterSelect,
	RemoveFiltersButton,
	ResponsiveFilterWrapper,
	SortDirectionButton,
} from '../filters'
import { FILTER_PARAMS } from '#app/utils/params.ts'

export function InventoryFilters({
	categories,
	suppliers,
}: {
	categories: Pick<Category, 'id' | 'name'>[]
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
	const [statusFilter, setStatusFilter] = useFilter(FILTER_PARAMS.STATUS, 'all')
	const [sortBy, setSortBy] = useFilter(FILTER_PARAMS.SORT_BY, 'name')
	const [sortDirection, setSortDirection] = useSortDirection()
	const resetSelectValues = () => {
		setStockFilter('all')
		setCategoryFilter('all')
		setSupplierFilter('all')
		setStatusFilter('all')
		setSortBy('name')
		setSortDirection(SortDirection.ASC)
	}

	return (
		<ResponsiveFilterWrapper>
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
				options={categories.map((category) => ({
					value: category.id,
					label: category.name,
				}))}
				topOption={{ value: 'all', label: 'Sin Filtros' }}
			/>
			<FilterSelect
				label="Proveedor"
				filter={supplierFilter}
				setFilter={setSupplierFilter}
				options={suppliers.map((supplier) => ({
					value: supplier.id,
					label: supplier.fantasyName,
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
		</ResponsiveFilterWrapper>
	)
}
