import { getFormProps } from '@conform-to/react'
import { useFetcher } from '@remix-run/react'
import { action } from '../inventory.edit'

import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'

import { EditableMetricCard } from '#app/components/metric-card.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { z } from 'zod'
import { useProductContext } from '../context/ProductContext'
import { ErrorList } from '#app/components/forms.tsx'
import { getProductStatus } from '#app/utils/product-status.ts'

export const updateProductStatusActionIntent = 'update-product-status'

export const StatusEditorSchema = z.object({
	intent: z.literal(updateProductStatusActionIntent),
	productId: z.string().optional(),
})
const icon: IconName = 'activity'

export function ModifyStatusDialog() {
	const { product, isAdmin } = useProductContext()
	const { isActive, alerts, canActivate } = getProductStatus(product)

	const fetcher = useFetcher<typeof action>({
		key: `${updateProductStatusActionIntent}-product${product.id}`,
	})
	const isPending = fetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: updateProductStatusActionIntent,
		constraint: getZodConstraint(StatusEditorSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: StatusEditorSchema })
		},
	})

	const shouldClose = fetcher.data?.result.status === 'success' && !isPending

	return (
		<EditableMetricCard
			shouldClose={shouldClose}
			isAdmin={isAdmin}
			title={'Estado'}
			description="Estado del producto"
			value={product.isActive ? 'Activo' : 'Inactivo'}
			icon={icon}
			isNegative={!product.isActive}
		>
			{product.isActive ? (
				<p className="text-muted-foreground">
					Puede desactivar temporalmente el producto para evitar su
					comercialización.
				</p>
			) : (
				<div className="flex flex-col gap-1">
					{canActivate ? (
						<p className="mb-2 text-muted-foreground">
							Puede activar el producto para que esté disponible para
							transacciones comerciales.
						</p>
					) : (
						<p className="mb-2 text-muted-foreground">
							Para activar el producto, primero debe solucionar los siguientes
							conflictos:
						</p>
					)}
					{alerts.map((alert, i) => (
						<div
							key={i}
							className="flex items-center gap-2 rounded-md bg-destructive/40 p-1 text-sm text-destructive-foreground"
						>
							<Icon name="alert-triangle" />
							<span>{alert.title}</span>
						</div>
					))}
				</div>
			)}
			<fetcher.Form
				method="POST"
				{...getFormProps(form)}
				action={'/inventory/edit'}
				className=""
			>
				<input type="hidden" name="productId" value={product.id} />
				<ErrorList errors={form.errors} id={form.errorId} />
			</fetcher.Form>
			<StatusButton
				form={form.id}
				type="submit"
				name="intent"
				value={updateProductStatusActionIntent}
				variant="default"
				status={isPending ? 'pending' : form.status ?? 'idle'}
				disabled={isPending || !canActivate}
			>
				<div className="flex items-center gap-1 ">
					{product.isActive ? (
						<span>{isPending ? 'Desactivando...' : 'Desactivar Producto'}</span>
					) : (
						<span>{isPending ? 'Activando...' : 'Activar Producto'}</span>
					)}
				</div>
			</StatusButton>
		</EditableMetricCard>
	)
}
