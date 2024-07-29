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
import { action } from '#app/routes/_inventory+/inventory_.$productId.tsx'
import { useIsPending } from '#app/utils/misc.tsx'
import { getFormProps, useForm } from '@conform-to/react'
import { Form, useActionData } from '@remix-run/react'
import { useProductContext } from '../../context/inventory/ProductContext'

export function DeleteProductConfirmationModal() {
	const { product } = useProductContext()

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'outline'} className="flex  items-center gap-2">
					<Icon name="trash" />
					<span>Eliminar Producto</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar eliminación de articulo</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede deshacer. Por favor confirme que desea
						eliminar el articulo.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<DeleteProduct id={product.id} />
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

function DeleteProduct({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-product',
		lastResult: actionData?.result,
	})

	return (
		<Form method="POST" {...getFormProps(form)}>
			<input type="hidden" name="productId" value={id} />
			<StatusButton
				iconName="trash"
				className="flex w-full items-center gap-1"
				type="submit"
				name="intent"
				value="delete-product"
				variant="destructive"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending}
			>
				Eliminar
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}
