import { getFormProps, getInputProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'

import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_inventory+/inventory.edit.js'
import { Editor } from '../../../components/editor.tsx'


export const updateProductCodeActionIntent = 'update-product-code'

export const CodeEditorSchema = z.object({
	intent: z.literal(updateProductCodeActionIntent),
	productId: z.string().optional(),
	code: z.string({
		required_error: 'Campo obligatorio',
	}),
})

export function CodeEditModal({
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
		key: updateProductCodeActionIntent,
	})
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: updateProductCodeActionIntent,
		constraint: getZodConstraint(CodeEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: CodeEditorSchema })
		},

		defaultValue: {
			code: value as string,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	//Double check that the value is within the limits to avoid layout issues
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
					...getInputProps(fields.code, {
						ariaAttributes: true,
						type: 'number',
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.code.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={updateProductCodeActionIntent}
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
			fetcherKey={`${updateProductCodeActionIntent}-product${id}`}
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
