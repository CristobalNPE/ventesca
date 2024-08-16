import { type SerializeFrom } from '@remix-run/node'
import { createContext, useContext } from 'react'
import { type loader } from '#app/routes/_categories+/categories_.$categoryId.tsx'
type LoaderData = SerializeFrom<typeof loader>
const CategoryContext = createContext<LoaderData | null>(null)
export function CategoryProvider({
	children,
	data,
}: {
	children: React.ReactNode
	data: LoaderData
}) {
	return (
		<CategoryContext.Provider value={data}>{children}</CategoryContext.Provider>
	)
}
export function useCategory() {
	const context = useContext(CategoryContext)
	if (!context) {
		throw new Error('useCategory must be used within an CategoryProvider')
	}
	return context
}
