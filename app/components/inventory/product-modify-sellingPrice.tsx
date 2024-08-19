import { getFormProps, getInputProps , useForm } from '@conform-to/react'


import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useFetcher } from '@remix-run/react'

import { z } from 'zod'
import { ErrorList, StyledField } from '#app/components/forms.tsx'
import { EditableMetricCard } from '#app/components/metric-card.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	calculateMarkupPercentage,
	calculateProfitMargin,
} from '#app/utils/inventory/product-calculations.js'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { useProductContext } from '../../context/inventory/ProductContext'
import { type action } from '../../routes/_inventory+/inventory.edit'
import { useSuccessToast } from '#app/hooks/useSuccessToast.js'

export const updateProductSellingPriceActionIntent =
	'update-product-sellingPrice'

export const SellingPriceEditorSchema = z.object({
	intent: z.literal(updateProductSellingPriceActionIntent),
	productId: z.string().optional(),
	sellingPrice: z
		.number({
			required_error: 'Campo obligatorio',
			invalid_type_error: 'Debe ser un número',
		})
		.min(0, {
			message: 'El precio de venta no puede ser negativo.',
		}),
})
const icon: IconName = 'circle-dollar-sign'

export function ModifySellingPriceDialog() {
	const { product, isAdmin } = useProductContext()

	const fetcher = useFetcher<typeof action>({
		key: `${updateProductSellingPriceActionIntent}-product${product.id}`,
	})
	const isPending = fetcher.state !== 'idle'

	const [form, fields] = useForm({
		id: updateProductSellingPriceActionIntent,
		constraint: getZodConstraint(SellingPriceEditorSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: SellingPriceEditorSchema })
		},

		defaultValue: {
			sellingPrice: product.sellingPrice,
		},
	})

	const currentProfitMargin = calculateProfitMargin({
		sellingPrice: product.sellingPrice,
		cost: product.cost,
	})
	const currentMarkupPercentage = calculateMarkupPercentage({
		sellingPrice: product.sellingPrice,
		cost: product.cost,
	})

	const newSellingPrice = Number(fields.sellingPrice.value) ?? 0

	const newProfitMargin = calculateProfitMargin({
		sellingPrice: newSellingPrice,
		cost: product.cost,
	})

	const newMarkupPercentage = calculateMarkupPercentage({
		sellingPrice: newSellingPrice,
		cost: product.cost,
	})

	const profitMarginDifference = newProfitMargin - currentProfitMargin
	const markupPercentageDifference = Number(
		(newMarkupPercentage - currentMarkupPercentage).toFixed(2),
	)

	const shouldClose = fetcher.data?.result.status === 'success' && !isPending

	useSuccessToast({ fetcher, message: 'Precio de venta actualizado' })

	return (
		<EditableMetricCard
			shouldClose={shouldClose}
			isAdmin={isAdmin}
			title={'Precio de venta'}
			description={'Precio de venta actual'}
			value={formatCurrency(product.sellingPrice)}
			icon={icon}
			isNegative={product.sellingPrice <= 0}
		>
			<fetcher.Form
				method="POST"
				{...getFormProps(form)}
				action={'/inventory/edit'}
				className="mt-4 p-4"
			>
				<input type="hidden" name="productId" value={product.id} />

				<StyledField
					icon={icon}
					labelProps={{
						children: `Nuevo precio de venta`,
						hidden: true,
					}}
					inputProps={{
						...getInputProps(fields.sellingPrice, {
							ariaAttributes: true,
							type: 'number',
						}),

						autoComplete: 'off',
					}}
					errors={fields.sellingPrice.errors}
				/>
				<ErrorList errors={form.errors} id={form.errorId} />

				<div className="flex items-center justify-between gap-4 sm:grid">
					<div className="grid gap-4 sm:grid-cols-3">
						<div className="rounded-md  p-2 text-center">
							<div className="text-xl font-bold">
								{formatCurrency(product.cost)}
							</div>
							<span className="text-xs text-muted-foreground">
								Precio de costo
							</span>
						</div>
						<div className="rounded-md  p-2 text-center">
							<div
								className={cn(
									'text-xl font-bold',
									newProfitMargin > 0 ? 'text-green-500' : 'text-red-500',
								)}
							>
								{formatCurrency(newProfitMargin)}
							</div>
							<span className="text-xs text-muted-foreground">
								Margen de ganancia
							</span>
						</div>
						<div className="rounded-md  p-2 text-center">
							<div
								className={cn(
									'text-xl font-bold',
									newMarkupPercentage > 0 ? 'text-green-500' : 'text-red-500',
								)}
							>
								{newMarkupPercentage}%
							</div>
							<span className="text-xs text-muted-foreground">
								Porcentaje de margen
							</span>
						</div>
					</div>
					<div className="grid  gap-4 sm:grid-cols-3">
						<div></div>
						<div
							className={cn(
								'flex flex-col items-center justify-center  text-sm font-normal',
								profitMarginDifference > 0 ? 'text-green-500' : 'text-red-500',
							)}
						>
							<div className="flex">
								<Icon
									name={profitMarginDifference > 0 ? 'arrow-up' : 'arrow-down'}
								/>
								<span>({formatCurrency(profitMarginDifference)})</span>
							</div>
							<span className="text-xs text-muted-foreground">
								Cambio margen
							</span>
						</div>
						<div
							className={cn(
								'flex flex-col items-center justify-center  text-sm font-normal',
								markupPercentageDifference > 0
									? 'text-green-500'
									: 'text-red-500',
							)}
						>
							<div className="flex">
								<Icon
									name={
										markupPercentageDifference > 0 ? 'arrow-up' : 'arrow-down'
									}
								/>
								<span>({markupPercentageDifference}%)</span>
							</div>
							<span className="text-xs text-muted-foreground">
								Cambio porcentaje
							</span>
						</div>
					</div>
				</div>
			</fetcher.Form>
			<StatusButton
				form={form.id}
				type="submit"
				name="intent"
				value={updateProductSellingPriceActionIntent}
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
