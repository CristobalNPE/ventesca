import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useSpinDelay } from 'spin-delay'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import { type action } from '#app/routes/transaction+/index.tsx'
import { cn } from '#app/utils/misc.tsx'
import { paymentMethodIcons } from './_constants/paymentMethodIcons.ts'
import {
	PaymentMethodSchema,
	allPaymentMethods,
	type PaymentMethod,
} from './_types/payment-method.ts'
import { PanelCard } from './transaction-panel.tsx'

export const SET_TRANSACTION_PAYMENT_METHOD_KEY = 'set-payment-method'

export const SetPaymentMethodSchema = z.object({
	intent: z.literal(SET_TRANSACTION_PAYMENT_METHOD_KEY),
	transactionId: z.string(),
	paymentMethod: PaymentMethodSchema,
})

export const PaymentMethodPanel = ({
	currentPaymentMethod,
	transactionId,
}: {
	transactionId: string
	currentPaymentMethod: PaymentMethod
}) => {
	const fetcher = useFetcher<typeof action>({
		key: SET_TRANSACTION_PAYMENT_METHOD_KEY,
	})
	const isSubmitting = fetcher.state === 'submitting'
	const actionData = fetcher.data

	const [form, fields] = useForm({
		id: SET_TRANSACTION_PAYMENT_METHOD_KEY,
		constraint: getZodConstraint(SetPaymentMethodSchema),
		lastResult: actionData?.result,

		defaultValue: {
			paymentMethod: currentPaymentMethod,
		},
	})

	const showSpinner = useSpinDelay(isSubmitting, {
		delay: 150,
		minDuration: 500,
	})

	return (
		<PanelCard className="relative">
			{showSpinner && (
				<div className="absolute inset-0 z-20 flex animate-spin  items-center justify-center ">
					<Icon className="text-2xl" name="update" />
				</div>
			)}
			<fetcher.Form
				{...getFormProps(form)}
				action="/transaction"
				method="post"
				className={cn(
					'flex justify-between',
					showSpinner && 'opacity-50 blur-sm brightness-50',
				)}
			>
				<input type="hidden" name="transactionId" value={transactionId} />
				<input type="hidden" name="intent" value="set-payment-method" />
				{allPaymentMethods.map((paymentMethodType, index) => (
					<label
						className={`flex w-[5rem] cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-md bg-card p-2 transition-colors duration-150 hover:bg-primary/20 has-[:checked]:bg-primary/90 has-[:checked]:text-background  has-[:disabled]:hover:bg-card `}
						key={index}
						htmlFor={`${fields.paymentMethod.id}-${paymentMethodType}`}
					>
						<input
							{...getInputProps(fields.paymentMethod, {
								type: 'radio',
								ariaAttributes: true,
							})}
							id={`${fields.paymentMethod.id}-${paymentMethodType}`}
							disabled={isSubmitting}
							defaultChecked={
								fields.paymentMethod.initialValue === paymentMethodType
							}
							className="appearance-none"
							value={paymentMethodType}
							onChange={e => fetcher.submit(e.currentTarget.form)}
						/>
						<Icon
							className="text-xl"
							name={paymentMethodIcons[paymentMethodType]}
						/>
						<span className="text-sm">{paymentMethodType}</span>
					</label>
				))}
			</fetcher.Form>
		</PanelCard>
	)
}
