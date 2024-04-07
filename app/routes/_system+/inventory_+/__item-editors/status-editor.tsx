import { useForm } from '@conform-to/react'
import { getFieldsetConstraint, parse } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '../edit.tsx'

export const UPDATE_STATUS_KEY = 'update-status'
export const STATUS_DISABLED = 'active'
export const STATUS_ENABLED = 'inactive'

export const StatusEditorSchema = z.object({
	itemId: z.string().optional(),
	status: z.string(),
})
export function EditStatus({
	isActive,
	disabled,
	itemId,
}: {
	isActive: boolean
	disabled: boolean
	itemId: string
}) {
	const itemStatusFetcher = useFetcher<typeof action>({
		key: UPDATE_STATUS_KEY,
	})
	const actionData = itemStatusFetcher.data
	const isPending = itemStatusFetcher.state !== 'idle'

	const [form] = useForm({
		id: UPDATE_STATUS_KEY,
		constraint: getFieldsetConstraint(StatusEditorSchema),
		lastSubmission: actionData?.submission,
		onValidate({ formData }) {
			return parse(formData, { schema: StatusEditorSchema })
		},
	})

	if (isActive) {
		return (
			<itemStatusFetcher.Form
				method="POST"
				{...form.props}
				action={'/inventory/edit'}
			>
				<AuthenticityTokenInput />
				<input type="hidden" name="itemId" value={itemId} />
				<input type="hidden" name="status" value={STATUS_DISABLED} />
				<StatusButton
					form={form.id}
					iconName="exclamation-circle"
					type="submit"
					name="intent"
					value={UPDATE_STATUS_KEY}
					variant="outline"
					status={isPending ? 'pending' : actionData?.status ?? 'idle'}
					disabled={isPending}
				>
					<div className="flex items-center gap-1 ">
						<span>{isPending ? 'Desactivando...' : 'Desactivar'}</span>
					</div>
				</StatusButton>
			</itemStatusFetcher.Form>
		)
	}

	return (
		<itemStatusFetcher.Form
			method="POST"
			{...form.props}
			action={'/inventory/edit'}
		>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={itemId} />
			<input type="hidden" name="status" value={STATUS_ENABLED} />
			<StatusButton
				form={form.id}
				iconName="checks"
				type="submit"
				name="intent"
				value={UPDATE_STATUS_KEY}
				variant="outline"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
				disabled={isPending || disabled}
			>
				<div className="flex items-center gap-1 ">
					<span>{isPending ? 'Activando...' : 'Activar'}</span>
				</div>
			</StatusButton>
		</itemStatusFetcher.Form>
	)
}
