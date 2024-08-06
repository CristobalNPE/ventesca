import { useLocation, useNavigate, useSearchParams } from '@remix-run/react'

/**
 * @description Custom hook to handle url params
 * @param defaultValue - The default value for the param, will check against the param value and remove the param if its the same
 * @returns - The search params and a function to update them
 */
export const useUrlParams = (defaultValue: string) => {
	const location = useLocation()
	const path = location.pathname

	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const updateUrlParams = (paramName: string, value: string) => {
		const newSearchParams = new URLSearchParams(searchParams)
		if (value === defaultValue) {
			newSearchParams.delete(paramName)
		} else {
			newSearchParams.set(paramName, value)
		}
		navigate(`${path}?${newSearchParams}`, {
			unstable_viewTransition: true,
		})
	}
	return { searchParams, updateUrlParams }
}
