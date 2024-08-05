import { useState } from 'react'
import { useUrlParams } from './useUrlParams'

/**
 * @description Custom hook to handle a filter
 * @param paramName - The name of the param
 * @param defaultValue - The default value for the param
 * @returns - The value of the filter and a function to update it
 */
export const useFilter = (paramName: string, defaultValue: string) => {
	const { searchParams, updateUrlParams } = useUrlParams(defaultValue)
	const [value, setValue] = useState(
		searchParams.get(paramName) || defaultValue,
	)

	const setFilter = (newValue: string) => {
		setValue(newValue)
		updateUrlParams(paramName, newValue)
	}

	return [value, setFilter] as const
}
