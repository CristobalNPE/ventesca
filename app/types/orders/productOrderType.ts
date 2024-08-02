import { z } from 'zod'

export enum ProductOrderType {
	SELL = 'Venta',
	RETURN = 'Devolución',
	PROMO = 'Promoción',
}

export const allProductOrderTypes = [
	ProductOrderType.SELL,
	ProductOrderType.RETURN,
	ProductOrderType.PROMO,
] as const

export const ProductOrderTypeSchema = z.enum(allProductOrderTypes)
