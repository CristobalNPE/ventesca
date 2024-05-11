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

export const DISCOUNT_MINQUANTITY_MAX = 100
export const DISCOUNT_MINQUANTITY_MIN = 1
export const UPDATE_DISCOUNT_MINQUANTITY_KEY = 'update-discount-minquantity'

export const DiscountMinquantityEditorSchema = z.object({
	discountId: z.string(),
	minQuantity: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(DISCOUNT_MINQUANTITY_MIN, {
			message: `El valor no puede ser menor a ${DISCOUNT_MINQUANTITY_MIN}.`,
		})
		.max(DISCOUNT_MINQUANTITY_MAX, {
			message: `El valor no puede ser mayor a ${DISCOUNT_MINQUANTITY_MAX}.`,
		}),
})

export function DiscountMinquantityEditModal({
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
		key: UPDATE_DISCOUNT_MINQUANTITY_KEY,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_MINQUANTITY_KEY,
		constraint: getZodConstraint(DiscountMinquantityEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountMinquantityEditorSchema })
		},

		defaultValue: {
			minQuantity: value,
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
					...getInputProps(fields.minQuantity, {
						type: 'number',
						ariaAttributes: true,
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.minQuantity.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_DISCOUNT_MINQUANTITY_KEY}
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
			fetcherKey={UPDATE_DISCOUNT_MINQUANTITY_KEY}
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
