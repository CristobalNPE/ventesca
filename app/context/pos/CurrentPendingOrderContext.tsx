import { loader } from '#app/routes/pos+/index.tsx'
import { SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
type LoaderData = SerializeFrom<typeof loader>
const CurrentPendigOrderContext = createContext<LoaderData | null>(null)
export function CurrentPendingOrderProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return (
		<CurrentPendigOrderContext.Provider value={data}>
			{children}
		</CurrentPendigOrderContext.Provider>
	)
}
export function useCurrentPendingOrder() {
	const context = useContext(CurrentPendigOrderContext)
	if (!context) {
		throw new Error(
			'useCurrentPendingOrder must be used within an CurrentPendingOrderProvider',
		)
	}
	return context
}
