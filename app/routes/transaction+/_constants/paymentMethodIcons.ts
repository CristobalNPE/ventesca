import { type IconName } from '#app/components/ui/icon.tsx'
import {
	PAYMENT_METHOD_CASH,
	PAYMENT_METHOD_CREDIT,
	PAYMENT_METHOD_DEBIT,
	type PaymentMethod,
} from '../_types/payment-method.ts'

export const paymentMethodIcons: Record<PaymentMethod, IconName> = {
	[PAYMENT_METHOD_CASH]: 'cash',
	[PAYMENT_METHOD_CREDIT]: 'credit-card',
	[PAYMENT_METHOD_DEBIT]: 'credit-card',
}
