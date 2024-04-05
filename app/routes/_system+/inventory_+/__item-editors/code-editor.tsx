import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { ErrorList, Field } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_system+/inventory_+/edit.tsx'
import { Editor } from './editor.tsx'

//Exported constants for consistency on item-creation
export const CODE_MAX = 999999
export const CODE_MIN = 0

export const UPDATE_CODE_KEY = 'update-code'

export const CodeEditorSchema = z.object({
	itemId: z.string().optional(),
	code: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(CODE_MIN, { message: 'El código no puede ser negativo.' })
		.max(CODE_MAX, { message: `El código no puede ser mayor a ${CODE_MAX}.` }),
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
	const fetcher = useFetcher<typeof action>({ key: UPDATE_CODE_KEY })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_CODE_KEY,
		constraint: getFieldsetConstraint(CodeEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: CodeEditorSchema })
		},

		defaultValue: {
			code: value,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	//Double check that the value is within the limits to avoid layout issues
	useEffect(() => {
		const targetValueAsNumber = Number(targetValue)
		if (targetValueAsNumber > CODE_MAX) setTargetValue(CODE_MAX.toString())
		if (targetValueAsNumber < CODE_MIN) setTargetValue(CODE_MIN.toString())
	}, [targetValue])

	const renderedForm = (
		<fetcher.Form method="POST" {...form.props} action={'/inventory/edit'}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<Field
				labelProps={{ children: `Nuevo ${label}`, hidden: true }}
				inputProps={{
					...conform.input(fields.code, {
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
			value={UPDATE_CODE_KEY}
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
			fetcherKey={UPDATE_CODE_KEY}
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
