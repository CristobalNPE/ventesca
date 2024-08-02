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
import { type action } from '#app/routes/_categories+/categories.$categoryId.tsx'
import { useIsPending } from '#app/utils/misc.tsx'

export const deleteOrderActionIntent = 'delete-order'

export const DeleteOrderSchema = z.object({
	intent: z.literal(deleteOrderActionIntent),
	orderId: z.string(),
})

export function DeleteOrder({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: `/orders/${id}`,
	})
	const [form] = useForm({
		id: deleteOrderActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size="sm" variant="outline" className="h-8 gap-1">
					<Icon name="trash" className="h-3.5 w-3.5" />
					<span>Eliminar transacción</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Confirmar eliminación de transacción
					</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea eliminar la transacción. Se restaurará
						el stock de los artículos asociados. Esta acción no se puede
						deshacer.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form method="POST" action={`/orders/${id}`} {...getFormProps(form)}>
						<input type="hidden" name="orderId" value={id} />
						<StatusButton
							type="submit"
							name="intent"
							value={deleteOrderActionIntent}
							variant="destructive"
							status={isPending ? 'pending' : form.status ?? 'idle'}
							disabled={isPending}
						>
							<div className="flex items-center gap-2 ">
								<Icon name="trash" />
								<span>Eliminar Transacción</span>
							</div>
						</StatusButton>
						<ErrorList errors={form.errors} id={form.errorId} />
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
