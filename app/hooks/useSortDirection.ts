import { useState } from 'react'

import { SortDirection } from '#app/types/SortDirection.ts'
import { useUrlParams } from './useUrlParams'
import { FILTER_PARAMS } from '#app/utils/params.ts'

/**
 * @description Custom hook to handle the sort direction
 * @returns - The sort direction and a function to update it
 */
export const useSortDirection = () => {
	const { searchParams, updateUrlParams } = useUrlParams(SortDirection.ASC)
	const [sortDirection, setSortDirection] = useState(
		(searchParams.get(FILTER_PARAMS.SORT_DIRECTION) as SortDirection) ||
			SortDirection.ASC,
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
