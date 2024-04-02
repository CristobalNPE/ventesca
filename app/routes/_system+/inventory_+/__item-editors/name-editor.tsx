import { ErrorList, Field } from '#app/components/forms.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { action } from '#app/routes/_system+/inventory_+/edit.tsx'
import { conform, useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { Editor } from './editor.tsx'

const NAME_MAX = 30
const NAME_MIN = 3
export const UPDATE_NAME_KEY = 'update-name'

export const NameEditorSchema = z.object({
	itemId: z.string().optional(),
	name: z
		.string({
			required_error: 'Campo obligatorio',
		})
		.min(NAME_MIN, {
			message: 'El nombre debe contener al menos 3 caracteres.',
		})
		.max(NAME_MAX, {
			message: `El nombre no puede ser mayor a ${NAME_MAX} caracteres.`,
		}),
})

export function NameEditModal({
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
	const fetcher = useFetcher<typeof action>({ key: UPDATE_NAME_KEY })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)

	const [form, fields] = useForm({
		id: UPDATE_NAME_KEY,
		constraint: getFieldsetConstraint(NameEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: NameEditorSchema })
		},

		defaultValue: {
			name: value,
		},
	})

	const [targetValue, setTargetValue] = useState<string | number>(value)

	const renderedForm = (
		<fetcher.Form method="POST" {...form.props} action={'/inventory/edit'}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<Field
				labelProps={{ children: `Nuevo ${label}`, hidden: true }}
				inputProps={{
					...conform.input(fields.name, {
						ariaAttributes: true,
					}),
					onChange: e => setTargetValue(e.target.value),
					value: targetValue,
					autoComplete: 'off',
				}}
				errors={fields.name.errors}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_NAME_KEY}
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
			fetcherKey={UPDATE_NAME_KEY}
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
