import { type SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
import { type loader } from '#app/routes/pos+/index.tsx'
type LoaderData = SerializeFrom<typeof loader>
const CurrentPendingOrderContext = createContext<LoaderData | null>(null)
export function CurrentPendingOrderProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return (
		<CurrentPendingOrderContext.Provider value={data}>
			{children}
		</CurrentPendingOrderContext.Provider>
	)
}
export function useCurrentPendingOrder() {
	const context = useContext(CurrentPendingOrderContext)
	if (!context) {
		throw new Error(
			'useCurrentPendingOrder must be used within an CurrentPendingOrderProvider',
		)
	}
	return context
}
