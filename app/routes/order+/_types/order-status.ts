import { z } from 'zod'

export enum OrderStatus {
	PENDING = 'Pendiente',
	FINISHED = 'Finalizada',
	DISCARDED = 'Cancelada',
}

export const allOrderStatuses = [
	OrderStatus.PENDING,
	OrderStatus.FINISHED,
	OrderStatus.DISCARDED,
] as const

export const OrderStatusSchema = z.enum(allOrderStatuses)
