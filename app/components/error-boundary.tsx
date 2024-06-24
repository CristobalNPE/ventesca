import {
	type ErrorResponse,
	isRouteErrorResponse,
	useParams,
	useRouteError,
} from '@remix-run/react'
import { captureRemixErrorBoundaryError } from '@sentry/remix'
import { getErrorMessage } from '#app/utils/misc.tsx'

type StatusHandler = (info: {
	error: ErrorResponse
	params: Record<string, string | undefined>
}) => JSX.Element | null

export function GeneralErrorBoundary({
	defaultStatusHandler = ({ error }) => (
		<p>
			{error.status} {error.data}
		</p>
	),
	statusHandlers,
	unexpectedErrorHandler = error => <p>{getErrorMessage(error)}</p>,
}: {
	defaultStatusHandler?: StatusHandler
	statusHandlers?: Record<number, StatusHandler>
	unexpectedErrorHandler?: (error: unknown) => JSX.Element | null
}) {
	const error = useRouteError()
	captureRemixErrorBoundaryError(error)
	const params = useParams()

	// console.log(`Status handlers: ${statusHandlers}`)
	// console.log(`Default handlers: ${defaultStatusHandler}`)
	// console.log(`Unexpected handlers: ${unexpectedErrorHandler}`)

	if (typeof document !== 'undefined') {
		console.error(error)
	}

	return (
		<div className="container flex items-center justify-center p-20 text-h5 text-center ">
			{isRouteErrorResponse(error)
				? (statusHandlers?.[error.status] ?? defaultStatusHandler)({
						error,
						params,
					})
				: unexpectedErrorHandler(error)}

			{/* {isRouteErrorResponse(error)?"true":"false"}
				{JSON.stringify(error)} */}
		</div>
	)
}
