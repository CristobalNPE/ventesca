import { ErrorList } from '#app/components/forms.tsx'
import { type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/_system+/inventory_+/edit.tsx'
import {
	CategorySelectBox,
	SelectedCategory,
} from '#app/routes/resources+/categories.tsx'
import { useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { Editor } from './editor.tsx'

export const UPDATE_CATEGORY_KEY = 'update-category'

export const CategoryEditorSchema = z.object({
	itemId: z.string().optional(),
	categoryId: z.string(),
})

export function CategoryEditModal({
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
	const fetcher = useFetcher<typeof action>({ key: UPDATE_CATEGORY_KEY })
	const actionData = fetcher.data
	const isPending = fetcher.state !== 'idle'
	const [open, setOpen] = useState(false)

	const [form] = useForm({
		id: UPDATE_CATEGORY_KEY,
		constraint: getFieldsetConstraint(CategoryEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: CategoryEditorSchema })
		},
	})

	const [targetValue, setTargetValue] = useState<SelectedCategory | null>(null)

	const renderedForm = (
		<fetcher.Form method="POST" {...form.props} action={'/inventory/edit'}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			{targetValue && (
				<input type="hidden" name="categoryId" value={targetValue.id} />
			)}

			<CategorySelectBox
				newSelectedCategory={targetValue}
				setNewSelectedCategory={setTargetValue}
			/>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)

	const renderedSubmitButton = (
		<StatusButton
			form={form.id}
			type="submit"
			name="intent"
			value={UPDATE_CATEGORY_KEY}
			variant="default"
			status={isPending ? 'pending' : actionData?.status ?? 'idle'}
			disabled={isPending || !targetValue}
		>
			<div className="flex items-center gap-1 ">
				<span>{isPending ? 'Actualizando...' : 'Confirmar'}</span>
			</div>
		</StatusButton>
	)

	return (
		<Editor
			fetcherKey={UPDATE_CATEGORY_KEY}
			targetValue={targetValue?.description ?? 'Sin Definir'}
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
