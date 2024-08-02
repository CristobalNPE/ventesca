import { Label as FormLabel } from '#app/components/ui/label.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { SortDirection } from '#app/types/SortDirection.ts'
import { allOrderStatuses } from '#app/types/orders/order-status.ts'
import { allTimePeriods, timePeriodNames } from '#app/utils/time-periods.ts'
import { User } from '@prisma/client'
import { useNavigate, useSearchParams } from '@remix-run/react'
import { useState } from 'react'

import { RemoveFiltersButton } from '../remove-filters'
import { SortDirectionButton } from '../sort-direction'

export function OrdersFilters({
	sellers,
}: {
	sellers: Pick<User, 'id' | 'name' | 'username'>[]
}) {
	const navigate = useNavigate()

	const [searchParams] = useSearchParams()

	const defaultValue = 'default'

	const [statusFilter, setStatusFilter] = useState(
		searchParams.get(FILTER_PARAMS.STATUS) || defaultValue,
	)
	const [periodFilter, setPeriodFilter] = useState(
		searchParams.get(FILTER_PARAMS.TIME_PERIOD) || allTimePeriods[0],
	)
	const [sellerFilter, setSellerFilter] = useState(
		searchParams.get(FILTER_PARAMS.SELLER) || defaultValue,
	)
	const [sortBy, setSortBy] = useState(
		searchParams.get(FILTER_PARAMS.SORT_BY) || 'completed-at',
	)
	const [sortDirection, setSortDirection] = useState<SortDirection>(
		(searchParams.get(FILTER_PARAMS.SORT_DIRECTION) as SortDirection) ||
			SortDirection.DESC,
	)

	const updateUrlAndNavigate = (paramName: string, value: string) => {
		const newSearchParams = new URLSearchParams(searchParams)
		if (value === defaultValue) {
			newSearchParams.delete(paramName)
		} else {
			newSearchParams.set(paramName, value)
		}
		navigate(`/orders?${newSearchParams}`, {
			unstable_viewTransition: true,
		})
	}

	const handleSortDirectionChange = (newDirection: SortDirection) => {
		setSortDirection(newDirection)
		const newSearchParams = new URLSearchParams(searchParams)
		if (!newSearchParams.get(FILTER_PARAMS.SORT_BY)) {
			newSearchParams.set(FILTER_PARAMS.SORT_BY, 'completed-at')
		}
		newSearchParams.set(FILTER_PARAMS.SORT_DIRECTION, newDirection)
		navigate(`/orders?${newSearchParams}`, {
			unstable_viewTransition: true,
		})
	}

	const resetSelectValues = () => {
		setStatusFilter(defaultValue)
		setPeriodFilter(allTimePeriods[0])
		setSellerFilter(defaultValue)
		setSortBy(defaultValue)
		setSortDirection(SortDirection.DESC)
	}

	return (
		<div className="flex w-fit flex-wrap gap-4 rounded-md bg-secondary/40 p-1 shadow-sm">
			<RemoveFiltersButton resetSelectValues={resetSelectValues} />
			<div className="relative w-full sm:w-[180px]">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground">
					Estado
				</FormLabel>
				<Select
					value={statusFilter}
					onValueChange={value => {
						setStatusFilter(value)
						updateUrlAndNavigate(FILTER_PARAMS.STATUS, value)
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Todos" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={defaultValue}>Todos</SelectItem>
						{allOrderStatuses.map(status => (
							<SelectItem key={status} value={status}>
								{status}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="relative w-full sm:w-[180px]">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground">
					Periodo
				</FormLabel>
				<Select
					value={periodFilter}
					onValueChange={value => {
						setPeriodFilter(value)
						updateUrlAndNavigate(FILTER_PARAMS.TIME_PERIOD, value)
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder={timePeriodNames[allTimePeriods[0]]} />
					</SelectTrigger>
					<SelectContent>
						{allTimePeriods.map(period => (
							<SelectItem key={period} value={period}>
								{timePeriodNames[period]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="relative w-full sm:w-[180px]">
				<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground ">
					Vendedor
				</FormLabel>
				<Select
					value={sellerFilter}
					onValueChange={value => {
						setSellerFilter(value)
						updateUrlAndNavigate(FILTER_PARAMS.SELLER, value)
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Todos" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value={defaultValue}>Todos</SelectItem>
						{sellers.map(seller => (
							<SelectItem key={seller.id} value={seller.id}>
								{seller.name}
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
					value={sortBy}
					onValueChange={value => {
						setSortBy(value)
						updateUrlAndNavigate(FILTER_PARAMS.SORT_BY, value)
					}}
				>
					<SelectTrigger className="">
						<SelectValue placeholder="Por Defecto" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="completed-at">Fecha de ingreso</SelectItem>
						<SelectItem value="status">Estado</SelectItem>
						<SelectItem value="seller">Vendedor</SelectItem>
						<SelectItem value="total">Total</SelectItem>
					</SelectContent>
				</Select>
				<SortDirectionButton
					sortDirection={sortDirection}
					onChange={handleSortDirectionChange}
				/>
			</div>
		</div>
	)
}
