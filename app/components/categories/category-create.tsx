import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { Form, useActionData } from '@remix-run/react'
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
import { type action } from '#app/routes/_categories+/categories.tsx'
import { useIsPending } from '#app/utils/misc.tsx'

export const createCategoryActionIntent = 'create-category'

export const CATEGORY_NAME_MIN = 3
export const CATEGORY_NAME_MAX = 20
export const CATEGORY_CODE_MIN = 1
export const CATEGORY_CODE_MAX = 999

export const CreateCategorySchema = z.object({
	intent: z.literal(createCategoryActionIntent),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(CATEGORY_NAME_MIN, {
			message: 'El nombre debe contener al menos 3 caracteres.',
		})
		.max(CATEGORY_NAME_MAX, {
			message: `El nombre no puede contener mas de ${CATEGORY_NAME_MAX} caracteres.`,
		}),
	code: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(CATEGORY_CODE_MIN, { message: 'El código no puede ser negativo.' })
		.max(CATEGORY_CODE_MAX, { message: 'El código no puede ser mayor a 999.' }),
})

export function CreateCategoryDialog() {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()

	const [form, fields] = useForm({
		id: createCategoryActionIntent,
		constraint: getZodConstraint(CreateCategorySchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CreateCategorySchema })
		},
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button size={"sm"} className="flex w-full items-center gap-2">
					<Icon name="plus" />
					<span>Registrar Nueva Categoría</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Agregar Categoría</AlertDialogTitle>
					<AlertDialogDescription>
						Complete la información para registrar la nueva categoría.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<Form method="POST" action="/categories" {...getFormProps(form)}>
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
							labelProps={{ children: 'Nombre categoría' }}
							inputProps={{
								...getInputProps(fields.name, {
									type: 'text',
									ariaAttributes: true,
								}),
							}}
							errors={fields.name.errors}
						/>
					</div>
					<ErrorList id={form.errorId} errors={form.errors} />
				</Form>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>

					<StatusButton
						form={form.id}
						type="submit"
						name="intent"
						value={createCategoryActionIntent}
						disabled={isPending}
						status={isPending ? 'pending' : 'idle'}
						iconName="check"
					>
						Registrar Categoría
					</StatusButton>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
