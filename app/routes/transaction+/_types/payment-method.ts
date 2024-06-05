import { z } from 'zod'

export enum PaymentMethod {
	CASH = 'Efectivo',
	CREDIT = 'Crédito',
	DEBIT = 'Débito',
}

export const allPaymentMethods = [
	PaymentMethod.CASH,
	PaymentMethod.CREDIT,
	PaymentMethod.DEBIT,
] as const

export const PaymentMethodSchema = z.enum(allPaymentMethods)
