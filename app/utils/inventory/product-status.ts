// app/utils/product-status.ts

import { Product } from '@prisma/client'

export type ProductAlert = {
	condition: boolean
	title: string
	description: string
	enforce: boolean
}

export type ProductStatus = {
	isActive: boolean
	alerts: ProductAlert[]
	canActivate: boolean
}

export function getProductAlerts(
	product: Pick<Product, 'stock' | 'cost' | 'sellingPrice' | 'isActive'>,
): ProductAlert[] {
	return [
		{
			condition: product.stock <= 0,
			title: 'Sin stock registrado',
			description:
				'El producto no tiene existencias registradas en inventario.',
			enforce: false,
		},
		{
			condition: product.cost <= 0,
			title: 'Valor de costo inválido',
			description:
				'El costo del producto no es válido o se encuentra sin definir.',
			enforce: true,
		},
		{
			condition: product.sellingPrice <= 0,
			title: 'Precio de venta inválido',
			description:
				'El precio de venta del producto no es válido o se encuentra sin definir.',
			enforce: true,
		},
	]
}

export function getActiveProductAlerts(
	product: Pick<Product, 'stock' | 'cost' | 'sellingPrice' | 'isActive'>,
): ProductAlert[] {
	return getProductAlerts(product).filter(alert => alert.condition)
}

export function canActivateProduct(
	product: Pick<Product, 'stock' | 'cost' | 'sellingPrice' | 'isActive'>,
): boolean {
	const alerts = getProductAlerts(product)
	return alerts.every(alert => !alert.condition)
}

export function getProductStatus(
	product: Pick<Product, 'stock' | 'cost' | 'sellingPrice' | 'isActive'>,
): ProductStatus {
	const alerts = getActiveProductAlerts(product)
	const canActivate = canActivateProduct(product)

	return {
		isActive: product.isActive,
		alerts,
		canActivate,
	}
}

export function shouldDeactivateProduct(product: Product): boolean {
	const alerts = getProductAlerts(product)
	const hasEnforceableAlerts = alerts.some(
		alert => alert.condition && alert.enforce,
	)

	// Return true if there are any alerts and the product is currently active
	return hasEnforceableAlerts && product.isActive
}
