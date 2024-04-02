import { ErrorList } from '#app/components/forms.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { action } from '#app/routes/_system+/inventory_+/edit.tsx'
import {
	SelectedSupplier,
	SupplierSelectBox,
} from '#app/routes/resources+/suppliers.tsx'
import { useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { Editor } from './editor.tsx'

// const NAME_MIN = 3
export const UPDATE_SUPPLIER_KEY = 'update-supplier'

export const SupplierEditorSchema = z.object({
	itemId: z.string().optional(),

	supplierId: z.string(),
})

export function SupplierEditModal({
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
	const fetcher = useFetcher<typeof action>({ key: UPDATE_SUPPLIER_KEY })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)

	const [form] = useForm({
		id: UPDATE_SUPPLIER_KEY,
		constraint: getFieldsetConstraint(SupplierEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: SupplierEditorSchema })
		},

		defaultValue: {
			name: value,
		},
	})

	const [targetValue, setTargetValue] = useState<SelectedSupplier | null>(null)

	const renderedForm = (
		<fetcher.Form method="POST" {...form.props} action={'/inventory/edit'}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			{targetValue && (
				<input type="hidden" name="supplierId" value={targetValue.id} />
			)}

			<SupplierSelectBox
				newSelectedSupplier={targetValue}
				setNewSelectedSupplier={setTargetValue}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_SUPPLIER_KEY}
			variant="default"
			status={isPending ? 'pending' : actionData?.status ?? 'idle'}
			disabled={isPending || !targetValue}
		>
			<div className="flex items-center gap-1 ">
				<Icon name="checks" />
				<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
			</div>
		</StatusButton>
	)

	return (
		<Editor
			fetcherKey={UPDATE_SUPPLIER_KEY}
			targetValue={targetValue?.fantasyName ?? 'Sin Definir'}
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
