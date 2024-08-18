import { type SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
import { type loader } from '#app/routes/_suppliers+/suppliers.$supplierId.js'
type LoaderData = SerializeFrom<typeof loader>
const SupplierContext = createContext<LoaderData | null>(null)
export function SupplierProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return (
		<SupplierContext.Provider value={data}>{children}</SupplierContext.Provider>
	)
}
export function useSupplier() {
	const context = useContext(SupplierContext)
	if (!context) {
		throw new Error('useSupplier must be used within an SupplierProvider')
	}
	return context
}
