import { IconName } from '#app/components/ui/icon.tsx'
import { useFetcher } from '@remix-run/react'
import { z } from 'zod'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'
import { useState } from 'react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Editor } from '#app/components/editor.tsx'

export const DISCOUNT_NAME_MAX = 30
export const DISCOUNT_NAME_MIN = 3
export const UPDATE_DISCOUNT_NAME_KEY = 'update-discount-name'

export const DiscountNameEditorSchema = z.object({
	discountId: z.string(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(DISCOUNT_NAME_MIN, {
			message: `El nombre debe contener al menos ${DISCOUNT_NAME_MIN} caracteres.`,
		})
		.max(DISCOUNT_NAME_MAX, {
			message: `El nombre no puede ser mayor a ${DISCOUNT_NAME_MAX} caracteres.`,
		}),
})

export function DiscountNameEditModal({
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
	const fetcher = useFetcher<typeof action>({ key: UPDATE_DISCOUNT_NAME_KEY })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_NAME_KEY,
		constraint: getZodConstraint(DiscountNameEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountNameEditorSchema })
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
			action={'/discounts/edit'}
		>
			<input type="hidden" name="discountId" value={id} />
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
			value={UPDATE_DISCOUNT_NAME_KEY}
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
			fetcherKey={UPDATE_DISCOUNT_NAME_KEY}
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
