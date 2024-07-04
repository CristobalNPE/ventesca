import { getFormProps, useForm } from '@conform-to/react'

import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'

import { z } from 'zod'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '../edit.tsx'

export const updateProductStatusActionIntent = 'update-product-status'
export const STATUS_DISABLED = 'active'
export const STATUS_ENABLED = 'inactive'

export const StatusEditorSchema = z.object({
	intent: z.literal(updateProductStatusActionIntent),
	productId: z.string().optional(),
	status: z.string(),
})
export function EditStatus({
	isActive,
	disabled,
	productId,
}: {
	isActive: boolean
	disabled: boolean
	productId: string
}) {
	const itemStatusFetcher = useFetcher<typeof action>({
		key: `${updateProductStatusActionIntent}-product${productId}`,
	})
	const actionData = itemStatusFetcher.data
	const isPending = itemStatusFetcher.state !== 'idle'

	const [form] = useForm({
		id: updateProductStatusActionIntent,
		constraint: getZodConstraint(StatusEditorSchema),
		lastResult: actionData?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: StatusEditorSchema })
		},
	})

	if (isActive) {
		return (
			<itemStatusFetcher.Form
				method="POST"
				{...getFormProps(form)}
				action={'/inventory/edit'}
			>
				<input type="hidden" name="productId" value={productId} />
				<input type="hidden" name="status" value={STATUS_DISABLED} />
				<StatusButton
					form={form.id}
					iconName="exclamation-circle"
					type="submit"
					name="intent"
					value={updateProductStatusActionIntent}
					variant="outline"
					status={isPending ? 'pending' : form.status ?? 'idle'}
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
			{...getFormProps(form)}
			action={'/inventory/edit'}
		>
			<input type="hidden" name="productId" value={productId} />
			<input type="hidden" name="status" value={STATUS_ENABLED} />
			<StatusButton
				form={form.id}
				iconName="checks"
				type="submit"
				name="intent"
				value={updateProductStatusActionIntent}
				variant="outline"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending || disabled}
			>
				<div className="flex items-center gap-1 ">
					<span>{isPending ? 'Activando...' : 'Activar'}</span>
				</div>
			</StatusButton>
		</itemStatusFetcher.Form>
	)
}
