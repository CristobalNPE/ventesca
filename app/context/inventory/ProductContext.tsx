import { Product } from '@prisma/client'
import { createContext, useContext } from 'react'

type ProductContextType = {
	product: Pick<
		Product,
		| 'id'
		| 'sellingPrice'
		| 'stock'
		| 'isActive'
		| 'price'
		| 'categoryId'
		| 'supplierId'
	>
	isAdmin: boolean
}
export const ProductContext = createContext<ProductContextType | null>(null)

export function useProductContext() {
	const context = useContext(ProductContext)
	if (!context) {
		throw new Error(
			'useProductContext must be used within a ProductContextProvider',
		)
	}
	return context
}
