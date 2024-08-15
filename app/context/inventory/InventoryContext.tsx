import { type SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
import { type loader } from '../../routes/_inventory+/inventory'
type LoaderData = SerializeFrom<typeof loader>
const InventoryContext = createContext<LoaderData | null>(null)
export function InventoryProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return (
		<InventoryContext.Provider value={data}>
			{children}
		</InventoryContext.Provider>
	)
}
export function useInventory() {
	const context = useContext(InventoryContext)
	if (!context) {
		throw new Error('useInventory must be used within an InventoryProvider')
	}
	return context
}
