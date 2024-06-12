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

export const DELETE_SUPPLIER_KEY = 'delete-supplier'

export const DeleteSupplierSchema = z.object({
	intent: z.literal(DELETE_SUPPLIER_KEY),
	supplierId: z.string(),
})

export function DeleteSupplier({
	id,
	numberOfItems,
}: {
	id: string
	numberOfItems: number
}) {
	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: `/suppliers/${id}`,
	})
	const [form] = useForm({
		id: DELETE_SUPPLIER_KEY,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size="sm" variant="outline" className="h-8 gap-1">
					<Icon name="trash" className="h-3.5 w-3.5" />
					<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
						Eliminar proveedor
					</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Confirmar eliminación de proveedor
					</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea eliminar la categoría, esta acción no
						se puede deshacer.
						<div className="my-2 flex w-full items-center justify-center gap-1 rounded-sm bg-destructive/50 p-1 text-foreground">
							<Icon name="exclamation-circle" />
							<span>
								Eliminar el proveedor también eliminara sus{' '}
								<span className="font-bold">{numberOfItems}</span> artículos
								asociados.
							</span>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form
						method="POST"
						action={`/suppliers/${id}`}
						{...getFormProps(form)}
					>
						<input type="hidden" name="supplierId" value={id} />
						<StatusButton
							type="submit"
							name="intent"
							value={DELETE_SUPPLIER_KEY}
							variant="destructive"
							status={isPending ? 'pending' : form.status ?? 'idle'}
							disabled={isPending}
						>
							<div className="flex items-center gap-2 ">
								<Icon name="trash" />
								<span>Eliminar Proveedor</span>
							</div>
						</StatusButton>
						<ErrorList errors={form.errors} id={form.errorId} />
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
