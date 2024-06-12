import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { z } from 'zod'
import { Editor } from '#app/components/editor.tsx'
import { ErrorList } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_discounts+/discounts.edit.tsx'
import { discountAppmethodNames } from '../_constants/discountAppmethodNames.ts'
import {
	type DiscountApplicationMethod,
	DiscountApplicationMethodSchema,
	allDiscountApplicationMethods,
} from '../_types/discount-applicationMethod.ts'

export const UPDATE_DISCOUNT_APPMETHOD_KEY = 'update-discount-appmethod'

export const DiscountAppmethodEditorSchema = z.object({
	discountId: z.string(),
	applicationMethod: DiscountApplicationMethodSchema,
})

export function DiscountAppmethodEditModal({
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
		key: UPDATE_DISCOUNT_APPMETHOD_KEY,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'

	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_DISCOUNT_APPMETHOD_KEY,
		constraint: getZodConstraint(DiscountAppmethodEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DiscountAppmethodEditorSchema })
		},
	})
	const applicationMethod = useInputControl(fields.applicationMethod)

	const targetValue = applicationMethod.value
		? discountAppmethodNames[
				applicationMethod.value as DiscountApplicationMethod
		  ]
		: discountAppmethodNames[value as DiscountApplicationMethod]

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/discounts/edit'}
		>
			<input type="hidden" name="discountId" value={id} />

			<Select
				defaultValue={value as string}
				name={fields.applicationMethod.name}
				value={applicationMethod.value}
				onValueChange={applicationMethod.change}
			>
				<SelectTrigger>
					<SelectValue className="uppercase" placeholder={label} />
				</SelectTrigger>
				<SelectContent>
					{allDiscountApplicationMethods.map((discountApplicationMethod, i) => (
						<SelectItem
							className="uppercase"
							key={i}
							value={discountApplicationMethod}
						>
							{discountAppmethodNames[discountApplicationMethod]}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_DISCOUNT_APPMETHOD_KEY}
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
			fetcherKey={UPDATE_DISCOUNT_APPMETHOD_KEY}
			targetValue={targetValue}
			open={open}
			setOpen={setOpen}
			icon={icon}
			label={label}
			value={discountAppmethodNames[value as DiscountApplicationMethod]}
			form={renderedForm}
			submitButton={renderedSubmitButton}
		/>
	)
}
