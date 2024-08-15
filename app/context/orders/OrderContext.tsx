import { type SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
import { type loader } from '#app/routes/_orders+/orders_.$orderId.js'
type LoaderData = SerializeFrom<typeof loader>
const OrderContext = createContext<LoaderData | null>(null)
export function OrderProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return <OrderContext.Provider value={data}>{children}</OrderContext.Provider>
}
export function useOrder() {
	const context = useContext(OrderContext)
	if (!context) {
		throw new Error('useOrder must be used within an OrderProvider')
	}
	return context
}
