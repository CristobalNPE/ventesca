import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_inventory+/edit.js'
import { Editor } from '../../../components/editor.tsx'

//Exported constants for consistency on item-creation
export const PRODUCT_NAME_MAX = 45
export const PRODUCT_NAME_MIN = 3
export const updateProductNameActionIntent = 'update-product-name'

export const ProductNameEditorSchema = z.object({
	intent: z.literal(updateProductNameActionIntent),
	productId: z.string().optional(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(PRODUCT_NAME_MIN, {
			message: 'El nombre debe contener al menos 3 caracteres.',
		})
		.max(PRODUCT_NAME_MAX, {
			message: `El nombre no puede ser mayor a ${PRODUCT_NAME_MAX} caracteres.`,
		}),
})

export function ItemNameEditModal({
	icon,
	label,
	value,
	id,
}: {
	icon: IconName
	label: string
	value: string | number
	id?: string
}) {
	const fetcher = useFetcher<typeof action>({
		key: updateProductNameActionIntent,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: updateProductNameActionIntent,
		constraint: getZodConstraint(ProductNameEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: ProductNameEditorSchema })
		},

		defaultValue: {
			name: value as string,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/inventory/edit'}
		>
			<input type="hidden" name="productId" value={id} />
			<Field
				labelProps={{ children: `Nuevo ${label}`, hidden: true }}
				inputProps={{
					...getInputProps(fields.name, {
						type: 'text',
						ariaAttributes: true,
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.name.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={updateProductNameActionIntent}
			variant="default"
			status={isPending ? 'pending' : form.status ?? 'idle'}
			disabled={isPending}
		>
			<div className="flex items-center gap-1 ">
				<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
			</div>
		</StatusButton>
	)

	return (
		<Editor
			fetcherKey={`${updateProductNameActionIntent}-product${id}`}
			targetValue={targetValue}
			open={open}
			setOpen={setOpen}
			icon={icon}
			label={label}
			value={value}
			form={renderedForm}
			submitButton={renderedSubmitButton}
		/>
	)
}
