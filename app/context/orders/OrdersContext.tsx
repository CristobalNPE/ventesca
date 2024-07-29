import { loader } from '#app/routes/_orders+/orders'
import { SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
type LoaderData = SerializeFrom<typeof loader>
const OrderContext = createContext<LoaderData | null>(null)
export function OrdersProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return <OrderContext.Provider value={data}>{children}</OrderContext.Provider>
}
export function useOrders() {
	const context = useContext(OrderContext)
	if (!context) {
		throw new Error('useOrders must be used within an OrdersProvider')
	}
	return context
}
