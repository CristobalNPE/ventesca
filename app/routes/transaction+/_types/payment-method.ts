import { z } from 'zod'

export const PAYMENT_METHOD_CASH = 'Efectivo'
export const PAYMENT_METHOD_CREDIT = 'Crédito'
export const PAYMENT_METHOD_DEBIT = 'Débito'

export const allPaymentMethods = [
	PAYMENT_METHOD_CASH,
	PAYMENT_METHOD_CREDIT,
	PAYMENT_METHOD_DEBIT,
] as const

export const PaymentMethodSchema = z.enum(allPaymentMethods)
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>
