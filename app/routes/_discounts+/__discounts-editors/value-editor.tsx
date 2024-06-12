import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { Editor } from '#app/components/editor.tsx'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'

export const DISCOUNT_FIXED_VALUE_MAX = 1_000_000
export const DISCOUNT_PORCENTUAL_VALUE_MAX = 100
export const DISCOUNT_FIXED_VALUE_MIN = 100
export const DISCOUNT_PORCENTUAL_VALUE_MIN = 1
export const UPDATE_DISCOUNT_VALUE_KEY = 'update-discount-value'

export const DiscountValueEditorSchema = z.object({
	discountId: z.string(),
	value: z.number({
		required_error: 'Campo obligatorio',
		invalid_type_error: 'Debe ser un número',
	}),
})
//TODO: Refine it so if its porcentual the max is 100, else is 1_000_000
//TODO: When we change the type of the discount, the value should be reset to 0

export function DiscountValueEditModal({
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
		key: UPDATE_DISCOUNT_VALUE_KEY,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_VALUE_KEY,
		constraint: getZodConstraint(DiscountValueEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountValueEditorSchema })
		},

		defaultValue: {
			value: value,
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
					...getInputProps(fields.value, {
						type: 'number',
						ariaAttributes: true,
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.value.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_DISCOUNT_VALUE_KEY}
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
			fetcherKey={UPDATE_DISCOUNT_VALUE_KEY}
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
