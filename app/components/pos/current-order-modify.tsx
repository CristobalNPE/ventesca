import { getFormProps, useForm } from '@conform-to/react'

import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/pos+/index.tsx'
import { useIsPending } from '#app/utils/misc.tsx'

export const modifyOrderActionIntent = 'modify-order'

export const ModifyOrderSchema = z.object({
	intent: z.literal(modifyOrderActionIntent),
	orderId: z.string(),
})

export function ModifyOrder({ orderId }: { orderId: string }) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: '/pos',
	})
	const [form] = useForm({
		id: modifyOrderActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" action="/pos" {...getFormProps(form)}>
			<input type="hidden" name="orderId" value={orderId} />
			<StatusButton
				type="submit"
				name="intent"
				className="flex w-fit items-center gap-2 text-lg"
				value={modifyOrderActionIntent}
				variant="outline"
				size="wide"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending}
				iconName="pencil-2"
			>
				Modificar y Reingresar
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}
