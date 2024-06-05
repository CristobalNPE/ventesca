import { z } from 'zod'

export enum TransactionStatus {
	PENDING = 'Pendiente',
	FINISHED = 'Finalizada',
	DISCARDED = 'Cancelada',
}

export const allTransactionStatuses = [
	TransactionStatus.PENDING,
	TransactionStatus.FINISHED,
	TransactionStatus.DISCARDED,
] as const

export const TransactionStatusSchema = z.enum(allTransactionStatuses)
