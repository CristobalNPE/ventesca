import { type IconName } from '#app/components/ui/icon.tsx'
import { PaymentMethod } from '../../../types/orders/payment-method.ts'

export const paymentMethodIcons: Record<PaymentMethod, IconName> = {
	[PaymentMethod.CASH]: 'cash',
	[PaymentMethod.CREDIT]: 'credit-card',
	[PaymentMethod.DEBIT]: 'credit-card',
}
