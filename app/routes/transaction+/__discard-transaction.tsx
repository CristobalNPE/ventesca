import { getFormProps, useForm } from '@conform-to/react'

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
import { action } from '#app/routes/transaction+/index.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'

export const DISCARD_TRANSACTION_KEY = 'discard-transaction'

export const DiscardTransactionSchema = z.object({
	intent: z.literal(DISCARD_TRANSACTION_KEY),
	transactionId: z.string(),
})

export function DiscardTransaction({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: '/transaction',
	})
	const [form] = useForm({
		id: DISCARD_TRANSACTION_KEY,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant={'destructive'}
					className="flex aspect-square h-[5.5rem] w-full flex-col items-center justify-center gap-1 px-5 text-center text-wrap"
				>
					<Icon name="trash" className="flex-none text-2xl" />{' '}
					<span className="leading-tight">Descartar Transacción</span>
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
					<Form
						method="POST"
						action="/transaction"
						{...getFormProps(form)}
					>
						<input type="hidden" name="transactionId" value={id} />
						<StatusButton
							type="submit"
							name="intent"
							value={DISCARD_TRANSACTION_KEY}
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
