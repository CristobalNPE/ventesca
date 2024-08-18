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
import { type action } from '#app/routes/_categories+/categories_.$categoryId.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { Form, useActionData } from '@remix-run/react'
import { z } from 'zod'
import { useCategory } from '#app/context/categories/CategoryContext.js'
import { useSupplier } from '#app/context/suppliers/SupplierContext.tsx'

export const deleteSupplierActionIntent = 'delete-supplier'

export const DeleteSupplierSchema = z.object({
	intent: z.literal(deleteSupplierActionIntent),
	supplierId: z.string(),
})
export function DeleteSupplier() {
	const { supplier } = useSupplier()

	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: `/suppliers/${supplier.id}`,
	})
	const [form] = useForm({
		id: deleteSupplierActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button className="w-full" size="sm" variant="destructive">
					<Icon name="trash" className="h-3.5 w-3.5">
						Eliminar proveedor
					</Icon>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Confirmar eliminación de proveedor '{supplier.name}'
					</AlertDialogTitle>
					<AlertDialogDescription>
						<p>Confirme que desea eliminar el proveedor.</p>

						<div className="my-4">
							{supplier.products.length === 1 ? (
								<Icon name="exclamation-circle" size="md" className="shrink-0">
									El producto '{supplier.products[0]?.name}' asociado a este
									proveedor será vinculado al proveedor por defecto 'Proveedor
									Propio'.
								</Icon>
							) : supplier.products.length === 0 ? (
								<Icon name="exclamation-circle" size="md" className="shrink-0">
									Este proveedor no tiene productos asociados que pudieran verse
									afectados.
								</Icon>
							) : (
								<Icon name="exclamation-circle" size="md" className="shrink-0">
									Los {supplier.products.length} productos asociados a este
									proveedor serán vinculados al proveedor por defecto 'Proveedor
									Propio'.
								</Icon>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form
						method="POST"
						action={`/suppliers/${supplier.id}`}
						{...getFormProps(form)}
					>
						<input type="hidden" name="supplierId" value={supplier.id} />
						<StatusButton
							type="submit"
							name="intent"
							value={deleteSupplierActionIntent}
							variant="destructive"
							status={isPending ? 'pending' : (form.status ?? 'idle')}
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
