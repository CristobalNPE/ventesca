import { useFetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { z } from 'zod'
import { cn } from '#app/utils/misc.tsx'
import { productOrderTypeColors } from '../_constants/productOrderTypesColors.ts'
import {
	ProductOrderType,
	ProductOrderTypeSchema,
} from '../_types/productOrderType.ts'

export const updateProductOrderTypeActionIntent = 'update-po-type'

export const UpdateProductOrderTypeSchema = z.object({
	intent: z.literal(updateProductOrderTypeActionIntent),
	productOrderId: z.string(),
	productOrderType: ProductOrderTypeSchema,
})

export const ProductOrderTypeToggle = ({
	productOrderId,
	productOrderType,
	setProductOrderType,
	isPromoApplicable,
}: {
	productOrderId: string
	productOrderType: ProductOrderType
	setProductOrderType: (value: ProductOrderType) => void
	isPromoApplicable: boolean
}) => {
	const productOrderTypeFetcher = useFetcher({
		key: `${updateProductOrderTypeActionIntent}-${productOrderId}`,
	})

	const cycleState = () => {
		let nextState: ProductOrderType

		if (productOrderType === ProductOrderType.SELL) {
			nextState = ProductOrderType.RETURN
		} else if (productOrderType === ProductOrderType.RETURN) {
			nextState = isPromoApplicable
				? ProductOrderType.PROMO
				: ProductOrderType.SELL
		} else {
			nextState = isPromoApplicable
				? ProductOrderType.SELL
				: ProductOrderType.RETURN
		}

		setProductOrderType(nextState)
	}

	//When the promo stops being applicable, it changes back to TYPE_SELL
	useEffect(() => {
		if (productOrderType === ProductOrderType.PROMO && !isPromoApplicable) {
			setProductOrderType(ProductOrderType.SELL)
		}
	}, [isPromoApplicable, productOrderType])

	//Apply update on change
	useEffect(() => {
		productOrderTypeFetcher.submit(
			{
				productOrderType,
				productOrderId,
				intent: updateProductOrderTypeActionIntent,
			},
			{
				method: 'post',
				action: '/order/product-order',
			},
		)
	}, [productOrderType])

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-sm p-1 text-xs font-bold uppercase tracking-wider text-background',
				productOrderType === ProductOrderType.SELL &&
					productOrderTypeColors[ProductOrderType.SELL],
				productOrderType === ProductOrderType.RETURN &&
					productOrderTypeColors[ProductOrderType.RETURN],
				productOrderType === ProductOrderType.PROMO &&
					productOrderTypeColors[ProductOrderType.PROMO],
			)}
			onClick={cycleState}
			tabIndex={-1}
		>
			{productOrderType.substring(0, 5)}
		</div>
	)
}
