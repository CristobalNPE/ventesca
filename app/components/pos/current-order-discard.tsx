import { getFormProps, useForm } from '@conform-to/react'

import { Form, useActionData } from '@remix-run/react'
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
import { useIsPending } from '#app/utils/misc.tsx'

export const discardOrderActionIntent = 'discard-order'

export const DiscardOrderSchema = z.object({
	intent: z.literal(discardOrderActionIntent),
	orderId: z.string(),
})

export function DiscardOrder({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: '/pos',
	})
	const [form] = useForm({
		id: discardOrderActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant={'destructive'}
					className="flex h-[3.5rem] w-full items-center gap-2 text-lg group"
				>
					<Icon name="trash" size="md" className="shrink-0 transition-transform group-hover:rotate-12" />
					Descartar Transacción
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar descarte de transacción</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea descartar esta transacción
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form method="POST" action="/pos" {...getFormProps(form)}>
						<input type="hidden" name="orderId" value={id} />
						<StatusButton
							type="submit"
							name="intent"
							value={discardOrderActionIntent}
							variant="destructive"
							status={isPending ? 'pending' : form.status ?? 'idle'}
							disabled={isPending}
						>
							<div className="flex items-center gap-2 ">
								<Icon name="trash" />
								<span>Descartar Transacción</span>
							</div>
						</StatusButton>
						<ErrorList errors={form.errors} id={form.errorId} />
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
