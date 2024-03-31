import { ErrorList, Field } from '#app/components/forms.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { action } from '#app/routes/_system+/inventory_+/edit.tsx'
import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useActionData, useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { Editor } from './editor.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'

const SELLING_PRICE_MAX = 9999999
const SELLING_PRICE_MIN = 0

export const SellingPriceEditorSchema = z.object({
	itemId: z.string().optional(),
	sellingPrice: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(SELLING_PRICE_MIN, {
			message: 'El precio de venta no puede ser negativo.',
		})
		.max(SELLING_PRICE_MAX, {
			message: 'El precio de venta no puede ser mayor a 9999999.',
		}),
})

export function SellingPriceEditModal({
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
	const actionData = useActionData<typeof action>()
	const editorId = `update-sellingPrice`
	const fetcher = useFetcher({ key: editorId })
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)
	const [form, fields] = useForm({
		id: editorId,
		constraint: getFieldsetConstraint(SellingPriceEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: SellingPriceEditorSchema })
		},
		defaultValue: {
			sellingPrice: value,
		},
	})

	const [targetValue, setTargetValue] = useState<string  | number>(value)

	//Double check that the value is within the limits to avoid layout issues
	useEffect(() => {
		const targetValueAsNumber = Number(targetValue)
		if (targetValueAsNumber > SELLING_PRICE_MAX)
			setTargetValue(SELLING_PRICE_MAX.toString())
		if (targetValueAsNumber < SELLING_PRICE_MIN)
			setTargetValue(SELLING_PRICE_MIN.toString())
	}, [targetValue])

	const renderedForm = (
		<fetcher.Form method="POST" {...form.props} action={'/inventory/edit'}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<Field
				labelProps={{ children: `Nuevo ${label}`, hidden: true }}
				inputProps={{
					...conform.input(fields.sellingPrice, {
						ariaAttributes: true,
						type: 'number',
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.sellingPrice.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={editorId}
			variant="default"
			status={isPending ? 'pending' : actionData?.status ?? 'idle'}
			disabled={isPending}
		>
			<div className="flex items-center gap-1 ">
				<Icon name="checks" />
				<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
			</div>
		</StatusButton>
	)

	return (
		<Editor
			formatFn={formatCurrency}
			fetcherKey={editorId}
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
