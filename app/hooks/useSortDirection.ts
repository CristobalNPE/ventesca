import { useState } from 'react'
import { FILTER_PARAMS } from '#app/constants/filterParams.ts'
import { SortDirection } from '#app/types/SortDirection.ts'
import { useUrlParams } from './useUrlParams'

/**
 * @description Custom hook to handle the sort direction
 * @returns - The sort direction and a function to update it
 */
export const useSortDirection = () => {
	const { searchParams, updateUrlParams } = useUrlParams(SortDirection.DESC)
	const [sortDirection, setSortDirection] = useState(
		(searchParams.get(FILTER_PARAMS.SORT_DIRECTION) as SortDirection) ||
			SortDirection.DESC,
	)

	const handleDirectionChange = (newDirection: SortDirection) => {
		setSortDirection(newDirection)
		const newSearchParams = new URLSearchParams(searchParams)
		if (!newSearchParams.get(FILTER_PARAMS.SORT_BY)) {
			newSearchParams.set(FILTER_PARAMS.SORT_BY, 'completed-at')
		}
		newSearchParams.set(FILTER_PARAMS.SORT_DIRECTION, newDirection)
		updateUrlParams(FILTER_PARAMS.SORT_DIRECTION, newDirection)
	}

	return [sortDirection, handleDirectionChange] as const
}
