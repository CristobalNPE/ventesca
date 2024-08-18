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

export const deleteCategoryActionIntent = 'delete-category'

export const DeleteCategorySchema = z.object({
	intent: z.literal(deleteCategoryActionIntent),
	categoryId: z.string(),
})

export function DeleteCategory() {
	const { category } = useCategory()

	const actionData = useActionData<typeof action>()

	const isPending = useIsPending({
		formAction: `/categories/${category.id}`,
	})
	const [form] = useForm({
		id: deleteCategoryActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size="sm" variant="destructive" className="h-8 gap-1">
					<Icon name="trash" className="h-3.5 w-3.5" />
					<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
						Eliminar categoría
					</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Confirmar eliminación de categoría '{category.name}'
					</AlertDialogTitle>
					<AlertDialogDescription>
						<p>Confirme que desea eliminar la categoría.</p>

						<div className="my-4">
							{category.products.length === 1 ? (
								<Icon name="exclamation-circle" size="md" className="shrink-0">
									El producto '{category.products[0]?.name}' asociado a esta
									categoría será vinculado a la categoría por defecto 'General'.
								</Icon>
							) : category.products.length === 0 ? (
								<Icon name="exclamation-circle" size="md" className="shrink-0">
									Esta categoría no tiene productos asociados que pudieran verse
									afectados.
								</Icon>
							) : (
								<Icon name="exclamation-circle" size="md" className="shrink-0">
									Los {category.products.length} productos asociados a esta
									categoría serán vinculados a la categoría por defecto
									'General'.
								</Icon>
							)}
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form
						method="POST"
						action={`/categories/${category.id}`}
						{...getFormProps(form)}
					>
						<input type="hidden" name="categoryId" value={category.id} />
						<StatusButton
							type="submit"
							name="intent"
							value={deleteCategoryActionIntent}
							variant="destructive"
							status={isPending ? 'pending' : (form.status ?? 'idle')}
							disabled={isPending}
						>
							<div className="flex items-center gap-2 ">
								<Icon name="trash" />
								<span>Eliminar Categoría</span>
							</div>
						</StatusButton>
						<ErrorList errors={form.errors} id={form.errorId} />
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
