import { getFormProps, getInputProps, useForm } from '@conform-to/react'

import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher, useLoaderData } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
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
import {
	type action,
	type loader,
} from '#app/routes/_categories+/categories.$categoryId.tsx'
import {
	CATEGORY_DESC_MAX,
	CATEGORY_DESC_MIN,
	CODE_MIN,
} from './__new-category.tsx'

export const editCategoryActionIntent = 'edit-category'

export const EditCategorySchema = z.object({
	intent: z.literal(editCategoryActionIntent),
	description: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(CATEGORY_DESC_MIN, {
			message: 'La descripción debe contener al menos 3 caracteres.',
		})
		.max(CATEGORY_DESC_MAX, {
			message: `La descripción no puede ser mayor a ${CATEGORY_DESC_MAX} caracteres.`,
		}),
	code: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(CODE_MIN, { message: 'El código no puede ser negativo.' }),
	categoryId: z.string(),
})

export function EditCategory({ id }: { id: string }) {
	const fetcher = useFetcher<typeof action>({ key: editCategoryActionIntent })
	const { category: categoryData } = useLoaderData<typeof loader>()
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: editCategoryActionIntent,
		constraint: getZodConstraint(EditCategorySchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: EditCategorySchema })
		},
		defaultValue: {
			code: categoryData?.code,
			description: categoryData?.description,
		},
	})

	//We close the modal after the submission is successful.
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.result.status === 'success') {
			setOpen(false)
		}
		 
	}, [fetcher])

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button size="sm" variant="ghost" className="h-8 gap-1">
					<Icon name="update" className="h-3.5 w-3.5" />
					<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
						Editar categoría
					</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Editar detalles Categoría</AlertDialogTitle>
					<AlertDialogDescription>
						Ingrese los nuevos datos para la categoría.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<fetcher.Form
					method="POST"
					action={`/categories/${id}`}
					{...getFormProps(form)}
				>
					<input type="hidden" name="categoryId" value={id} />
					<div className="flex flex-col gap-4 sm:flex-row">
						<Field
							labelProps={{ children: 'Código único' }}
							inputProps={{
								autoFocus: true,

								...getInputProps(fields.code, {
									type: 'number',
									ariaAttributes: true,
								}),
							}}
							errors={fields.code.errors}
						/>
						<Field
							className="grow"
							labelProps={{ children: 'Descripción categoría' }}
							inputProps={{
								...getInputProps(fields.description, {
									type: 'text',
									ariaAttributes: true,
								}),
							}}
							errors={fields.description.errors}
						/>
					</div>
					<ErrorList id={form.errorId} errors={form.errors} />
				</fetcher.Form>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<StatusButton
						form={form.id}
						type="submit"
						name="intent"
						value={editCategoryActionIntent}
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
						iconName="check"
					>
						Editar registro
					</StatusButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
