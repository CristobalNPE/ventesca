import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { Editor } from '#app/components/editor.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'
import {
	type DiscountType,
	DiscountTypeSchema,
	allDiscountTypes,
} from '../../../types/discounts/discount-type.ts'
import { discountTypeNames } from '../_constants/discountTypeNames.ts'

export const updateDiscountTypeActionIntent = 'update-discount-type'

export const DiscountTypeEditorSchema = z.object({
	discountId: z.string(),
	type: DiscountTypeSchema,
})

export function DiscountTypeEditModal({
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
	const fetcher = useFetcher<typeof action>({ key: updateDiscountTypeActionIntent })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: updateDiscountTypeActionIntent,
		constraint: getZodConstraint(DiscountTypeEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountTypeEditorSchema })
		},
	})
	const type = useInputControl(fields.type)

	const targetValue = type.value
		? discountTypeNames[type.value as DiscountType]
		: discountTypeNames[value as DiscountType]

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/discounts/edit'}
		>
			<input type="hidden" name="discountId" value={id} />

			<Select
				defaultValue={value as string}
				name={fields.type.name}
				value={type.value}
				onValueChange={type.change}
			>
				<SelectTrigger>
					<SelectValue className="uppercase" placeholder={label} />
				</SelectTrigger>
				<SelectContent>
					{allDiscountTypes.map((discountType, i) => (
						<SelectItem className="uppercase" key={i} value={discountType}>
							{discountTypeNames[discountType]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			<div className="my-2 flex items-center gap-2 text-xs text-muted-foreground">
				<Icon name="exclamation-circle" />{' '}
				<span>Cambiar el tipo de descuento reiniciará su valor a 0.</span>
			</div>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={updateDiscountTypeActionIntent}
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
			fetcherKey={updateDiscountTypeActionIntent}
			targetValue={targetValue}
			open={open}
			setOpen={setOpen}
			icon={icon}
			label={label}
			value={discountTypeNames[value as DiscountType]}
			form={renderedForm}
			submitButton={renderedSubmitButton}
		/>
	)
}
