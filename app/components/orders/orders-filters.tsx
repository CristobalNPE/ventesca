import { type User } from '@prisma/client'

import { useFilter } from '#app/hooks/useFilter.ts'
import { useSortDirection } from '#app/hooks/useSortDirection.ts'
import { allOrderStatuses } from '#app/types/orders/order-status.ts'
import { SortDirection } from '#app/types/SortDirection.ts'
import { allTimePeriods, timePeriodNames } from '#app/utils/time-periods.ts'


import {
	FilterSelect,
	RemoveFiltersButton,
	ResponsiveFilterWrapper,
	SortDirectionButton,
} from '../filters'
import { FILTER_PARAMS } from '#app/utils/params.ts'

export function OrdersFilters({
	sellers,
}: {
	sellers: Pick<User, 'id' | 'name' | 'username'>[]
}) {
	const [statusFilter, setStatusFilter] = useFilter(
		FILTER_PARAMS.STATUS,
		'default',
	)
	const [periodFilter, setPeriodFilter] = useFilter(
		FILTER_PARAMS.TIME_PERIOD,
		allTimePeriods[0],
	)
	const [sellerFilter, setSellerFilter] = useFilter(
		FILTER_PARAMS.SELLER,
		'default',
	)
	const [sortBy, setSortBy] = useFilter(FILTER_PARAMS.SORT_BY, 'completed-at')
	const [sortDirection, setSortDirection] = useSortDirection()

	const resetSelectValues = () => {
		setStatusFilter('default')
		setPeriodFilter(allTimePeriods[0])
		setSellerFilter('default')
		setSortBy('completed-at')
		setSortDirection(SortDirection.DESC)
	}

	return (
		<ResponsiveFilterWrapper>
			<RemoveFiltersButton resetSelectValues={resetSelectValues} />
			<FilterSelect
				label="Estado"
				filter={statusFilter}
				setFilter={setStatusFilter}
				options={allOrderStatuses.map(status => ({
					value: status,
					label: status,
				}))}
				topOption={{ value: 'default', label: 'Todos' }}
			/>
			<FilterSelect
				label="Periodo"
				filter={periodFilter}
				setFilter={setPeriodFilter}
				options={allTimePeriods.map(period => ({
					value: period,
					label: timePeriodNames[period],
				}))}
			/>

			<FilterSelect
				label="Vendedor"
				filter={sellerFilter}
				setFilter={setSellerFilter}
				options={sellers.map(seller => ({
					value: seller.id,
					label: seller.name ?? seller.username,
				}))}
				topOption={{ value: 'default', label: 'Todos' }}
			/>
			<FilterSelect
				label="Ordenar por"
				filter={sortBy}
				setFilter={setSortBy}
				options={[
					{ value: 'completed-at', label: 'Fecha de ingreso' },
					{ value: 'status', label: 'Estado' },
					{ value: 'total', label: 'Total' },
					{ value: 'seller', label: 'Vendedor' },
				]}
			/>
			<SortDirectionButton
				sortDirection={sortDirection}
				onChange={setSortDirection}
			/>
		</ResponsiveFilterWrapper>
	)
}
