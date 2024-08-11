import { loader } from '#app/routes/analytics+/index.tsx'
import { SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
type LoaderData = SerializeFrom<typeof loader>
const AnalyticsContext = createContext<LoaderData | null>(null)
export function AnalyticsProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return (
		<AnalyticsContext.Provider value={data}>
			{children}
		</AnalyticsContext.Provider>
	)
}
export function useAnalytics() {
	const context = useContext(AnalyticsContext)
	if (!context) {
		throw new Error('useAnalytics must be used within an AnalyticsProvider')
	}
	return context
}
