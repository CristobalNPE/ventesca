import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_inventory+/edit.js'
import { formatCurrency } from '#app/utils/misc.tsx'
import { Editor } from '../../../components/editor.tsx'

const SELLING_PRICE_MAX = 9999999
const SELLING_PRICE_MIN = 0
export const updateProductSellingPriceActionIntent = 'update-product-sellingPrice'

export const SellingPriceEditorSchema = z.object({
	intent: z.literal(updateProductSellingPriceActionIntent),
	productId: z.string().optional(),
	sellingPrice: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(SELLING_PRICE_MIN, {
			message: 'El precio de venta no puede ser negativo.',
		})
		.max(SELLING_PRICE_MAX, {
			message: `El precio de venta no puede ser mayor a ${SELLING_PRICE_MAX}.`,
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
	const fetcher = useFetcher<typeof action>({ key: `${updateProductSellingPriceActionIntent}-product${id}` })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)
	const [form, fields] = useForm({
		id: updateProductSellingPriceActionIntent,
		constraint: getZodConstraint(SellingPriceEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SellingPriceEditorSchema })
		},
		defaultValue: {
			sellingPrice: value,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	//Double check that the value is within the limits to avoid layout issues
	useEffect(() => {
		const targetValueAsNumber = Number(targetValue)
		if (targetValueAsNumber > SELLING_PRICE_MAX)
			setTargetValue(SELLING_PRICE_MAX.toString())
		if (targetValueAsNumber < SELLING_PRICE_MIN)
			setTargetValue(SELLING_PRICE_MIN.toString())
	}, [targetValue])

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
					...getInputProps(fields.sellingPrice, {
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
			value={updateProductSellingPriceActionIntent}
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
			formatFn={formatCurrency}
			fetcherKey={`${updateProductSellingPriceActionIntent}-product${id}`}
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
