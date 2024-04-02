import { ErrorList, Field } from '#app/components/forms.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { action } from '#app/routes/_system+/inventory_+/edit.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'
import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { Editor } from './editor.tsx'

const PRICE_MAX = 9999999
const PRICE_MIN = 0
export const UPDATE_PRICE_KEY = 'update-price'

export const PriceEditorSchema = z.object({
	itemId: z.string().optional(),
	price: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(PRICE_MIN, { message: 'El valor no puede ser negativo.' })
		.max(PRICE_MAX, { message: `El valor no puede ser mayor a ${PRICE_MAX}.` }),
})

export function PriceEditModal({
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
	const fetcher = useFetcher<typeof action>({ key: UPDATE_PRICE_KEY })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)
	const [form, fields] = useForm({
		id: UPDATE_PRICE_KEY,
		constraint: getFieldsetConstraint(PriceEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: PriceEditorSchema })
		},
		defaultValue: {
			price: value,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	//Double check that the value is within the limits to avoid layout issues
	useEffect(() => {
		const targetValueAsNumber = Number(targetValue)
		if (targetValueAsNumber > PRICE_MAX) setTargetValue(PRICE_MAX.toString())
		if (targetValueAsNumber < PRICE_MIN) setTargetValue(PRICE_MIN.toString())
	}, [targetValue])

	const renderedForm = (
		<fetcher.Form method="POST" {...form.props} action={'/inventory/edit'}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<Field
				labelProps={{ children: `Nuevo ${label}`, hidden: true }}
				inputProps={{
					...conform.input(fields.price, {
						ariaAttributes: true,
						type: 'number',
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.price.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_PRICE_KEY}
			variant="default"
			status={isPending ? 'pending' : actionData?.status ?? 'idle'}
			disabled={isPending}
		>
			<div className="flex items-center gap-1 ">
				<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
			</div>
		</StatusButton>
	)

	return (
		<Editor
			formatFn={formatCurrency}
			fetcherKey={UPDATE_PRICE_KEY}
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
