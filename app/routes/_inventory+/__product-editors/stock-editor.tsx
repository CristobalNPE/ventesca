import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useActionData, useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_inventory+/edit.js'
import { Editor } from '../../../components/editor.tsx'

const STOCK_MAX = 9999
const STOCK_MIN = 0
export const updateProductStockActionIntent = 'update-product-stock'

export const StockEditorSchema = z.object({
	intent: z.literal(updateProductStockActionIntent),
	productId: z.string().optional(),
	stock: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(STOCK_MIN, { message: 'El stock no puede ser negativo.' })
		.max(STOCK_MAX, { message: `El stock no puede ser mayor a ${STOCK_MAX}.` }),
})

export function StockEditModal({
	icon,
	label,
	value,
	id,
}: {
	icon: IconName
	label: string
	value: string
	id?: string
}) {
	const actionData = useActionData<typeof action>()
	const fetcher = useFetcher({
		key: `${updateProductStockActionIntent}-product${id}`,
	})
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)
	const [form, fields] = useForm({
		id: updateProductStockActionIntent,
		constraint: getZodConstraint(StockEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: StockEditorSchema })
		},

		defaultValue: {
			stock: value,
		},
	})

	const [targetValue, setTargetValue] = useState<string>(value)

	//Double check that the value is within the limits to avoid layout issues
	useEffect(() => {
		const targetValueAsNumber = Number(targetValue)
		if (targetValueAsNumber > STOCK_MAX) setTargetValue(STOCK_MAX.toString())
		if (targetValueAsNumber < STOCK_MIN) setTargetValue(STOCK_MIN.toString())
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
					...getInputProps(fields.stock, {
						ariaAttributes: true,
						type: 'number',
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.stock.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={updateProductStockActionIntent}
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
			fetcherKey={`${updateProductStockActionIntent}-product${id}`}
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
