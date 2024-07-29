import { getFormProps, getInputProps } from '@conform-to/react'
import { useFetcher } from '@remix-run/react'
import { action } from '../inventory.edit'

import { useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'

import { ErrorList, StyledField } from '#app/components/forms.tsx'
import { EditableMetricCard } from '#app/components/metric-card.tsx'
import { IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { cn } from '#app/utils/misc.tsx'
import { z } from 'zod'
import { useProductContext } from '../context/ProductContext'

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

const icon: IconName = 'package'

export function ModifyStockDialog() {
	const { product, isAdmin } = useProductContext()

	const fetcher = useFetcher<typeof action>({
		key: `${updateProductStockActionIntent}-product${product.id}`,
	})
	const isPending = fetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: updateProductStockActionIntent,
		constraint: getZodConstraint(StockEditorSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: StockEditorSchema })
		},

		defaultValue: {
			stock: product.stock,
		},
	})

	const newStock = Number(fields.stock.value) || undefined
	const shouldClose = fetcher.data?.result.status === 'success' && !isPending

	return (
		<EditableMetricCard
			shouldClose={shouldClose}
			isAdmin={isAdmin}
			title={'Stock'}
			description={
				product.stock <= 0
					? 'Sin existencias disponibles'
					: 'Existencias disponibles'
			}
			value={product.stock}
			subText={product.stock === 1 ? 'unidad' : 'unidades'}
			icon={icon}
			isNegative={product.stock <= 0}
		>
			<fetcher.Form
				method="POST"
				{...getFormProps(form)}
				action={'/inventory/edit'}
				className="mt-4 p-4"
			>
				<input type="hidden" name="productId" value={product.id} />

				<StyledField
				className='items-center'
					icon={icon}
					labelProps={{
						children: `Nuevo stock`,
						hidden: true,
					}}
					inputProps={{
						...getInputProps(fields.stock, {
							ariaAttributes: true,
							type: 'number',
						}),

						autoComplete: 'off',
					}}
					errors={fields.stock.errors}
				/>
				<ErrorList errors={form.errors} id={form.errorId} />
				<div className="min-h-10">
					{newStock ? (
						<p
							className={cn(
								'text-center',
								newStock > product.stock ? 'text-green-500' : 'text-red-500',
							)}
						>
							{newStock > product.stock
								? `Se agregarán ${newStock - product.stock} unidades al inventario.`
								: newStock < product.stock
									? `Se restarán ${product.stock - newStock} unidades al inventario.`
									: ''}
						</p>
					) : null}
				</div>
			</fetcher.Form>
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
		</EditableMetricCard>
	)
}
