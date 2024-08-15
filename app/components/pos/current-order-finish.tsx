import { getFormProps, useForm } from '@conform-to/react'
import { Form, useActionData } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useRef } from 'react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/pos+/index.tsx'
import { formatCurrency, useIsPending } from '#app/utils/misc.tsx'
import { type OrderDetails } from '../../types/orders/OrderData.ts'

export const finishOrderActionIntent = 'finish-order'

export const FinishTransactionSchema = z.object({
	intent: z.literal(finishOrderActionIntent),
	orderId: z.string(),
})

export const FinishOrder = ({ orderId }: { orderId: string }) => {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending({
		formAction: '/order',
	})
	const [form] = useForm({
		id: finishOrderActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" action="/pos" {...getFormProps(form)}>
			<input type="hidden" name="orderId" value={orderId} />
			<StatusButton
				iconName="circle-check"
				type="submit"
				size="wide"
				className="w-fit text-lg"
				name="intent"
				value={finishOrderActionIntent}
				variant="default"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending}
			>
				Confirmar y Finalizar
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />

		</Form>
	)
}
