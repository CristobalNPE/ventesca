import { getFormProps, useForm } from '@conform-to/react'

import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'

import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/inventory_+/edit.js'
import {
	type SelectedSupplier,
	SupplierSelectBox,
} from '#app/routes/resources+/suppliers.tsx'
import { Editor } from '../../../components/editor.tsx'

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
		constraint: getZodConstraint(SupplierEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SupplierEditorSchema })
		},
	})

	const [targetValue, setTargetValue] = useState<SelectedSupplier | null>(null)

	const renderedForm = (
		<fetcher.Form
			method="POST"
			{...getFormProps(form)}
			action={'/inventory/edit'}
		>
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
			status={isPending ? 'pending' : form.status ?? 'idle'}
			disabled={isPending || !targetValue}
		>
			<div className="flex items-center gap-1 ">
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
