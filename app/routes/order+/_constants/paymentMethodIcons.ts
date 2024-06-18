import { type IconName } from '#app/components/ui/icon.tsx'
import { PaymentMethod } from '../_types/payment-method.ts'

export const paymentMethodIcons: Record<PaymentMethod, IconName> = {
	[PaymentMethod.CASH]: 'cash',
	[PaymentMethod.CREDIT]: 'credit-card',
	[PaymentMethod.DEBIT]: 'credit-card',
}
