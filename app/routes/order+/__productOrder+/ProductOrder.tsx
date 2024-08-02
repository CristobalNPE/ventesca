import { Icon } from '#app/components/ui/icon.tsx'
import { cn } from '#app/utils/misc.tsx'
import {
	type Discount,
	type ProductOrder as ProductOrderModel,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Key } from 'ts-key-enum'

import { formatCurrency } from '#app/utils/misc.tsx'
import { useFetcher, useFetchers } from '@remix-run/react'
import { useSpinDelay } from 'spin-delay'
import { productOrderTypeBorderColors } from '../_constants/productOrderTypesColors.ts'
import {
	ProductOrderType,
	ProductOrderTypeSchema,
} from '../../../types/orders/productOrderType.ts'
import {
	DeleteProductOrder,
	deleteProductOrderActionIntent,
} from './__product-order-delete.tsx'
import {
	changeProductOrderQuantityActionIntent,
	decreaseProductOrderQuantityActionIntent,
	increaseProductOrderQuantityActionIntent,
	ProductOrderQuantitySelector,
} from './__product-order-quantity.tsx'
import {
	ProductOrderTypeToggle,
	updateProductOrderTypeActionIntent,
} from './__product-order-type.tsx'

export type ProductProps = {
	id: string
	code: string
	name: string
	sellingPrice: number
	stock: number
	discounts: Discount[]
}

type ProductOrderProps = SerializeFrom<
	Pick<
		ProductOrderModel,
		'id' | 'quantity' | 'type' | 'totalPrice' | 'totalDiscount'
	>
> & {
	productDetails: SerializeFrom<ProductProps>
}

export function ProductOrder({
	index,
	focus,
	setFocus,
	productOrder,
	globalDiscounts,
}: {
	index: number
	focus: boolean
	setFocus: (index: number) => void
	productOrder: ProductOrderProps
	globalDiscounts: SerializeFrom<
		Pick<
			Discount,
			| 'id'
			| 'name'
			| 'description'
			| 'applicationMethod'
			| 'type'
			| 'minimumQuantity'
			| 'validFrom'
			| 'validUntil'
			| 'value'
			| 'isActive'
		>
	>[]
}) {
	const quantity = productOrder.quantity

	const currentProductOrderType = ProductOrderTypeSchema.parse(
		productOrder.type,
	)

	//!RECHECK THIS!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
	const [productOrderType, setProductOrderType] = useState<ProductOrderType>(
		currentProductOrderType,
	)

	const productDiscounts = [
		...productOrder.productDetails.discounts.filter(
			discount => quantity >= discount.minimumQuantity,
		),
		...globalDiscounts.filter(discount => quantity >= discount.minimumQuantity),
	]

	const applicableProductDiscounts = productDiscounts.filter(
		discount => discount.isActive,
	)

	const isAnyProductDiscountApplicable = applicableProductDiscounts.length > 0

	// Check the status of submissions that modify the item transaction to know when to show the spinner.
	const updateFetchersKeys = [
		`${updateProductOrderTypeActionIntent}-${productOrder.id}`,
		`${increaseProductOrderQuantityActionIntent}-${productOrder.id}`,
		`${decreaseProductOrderQuantityActionIntent}-${productOrder.id}`,
		`${changeProductOrderQuantityActionIntent}-${productOrder.id}`,
	]
	const allFetchers = useFetchers()

	const updateFetchers = allFetchers.filter(fetcher =>
		updateFetchersKeys.includes(fetcher.key),
	)
	const isProductOrderUpdating = updateFetchers.some(
		fetcher => fetcher.state !== 'idle',
	)
	const showUpdateSpinner = useSpinDelay(isProductOrderUpdating, {
		delay: 150,
		minDuration: 500,
	})

	const deleteProductOrderFetcher = useFetcher({
		key: `${deleteProductOrderActionIntent}-${productOrder.id}`,
	})
	const focusRef = useHotkeys<HTMLDivElement>(
		[Key.Delete, 'v', 'V', 'p', 'P', 'd', 'D'],
		event => {
			switch (event.key) {
				case 'v':
				case 'V': {
					setProductOrderType(ProductOrderType.SELL)
					break
				}
				case 'p':
				case 'P': {
					setProductOrderType(ProductOrderType.PROMO)
					break
				}
				case 'd':
				case 'D': {
					setProductOrderType(ProductOrderType.RETURN)
					break
				}
				case Key.Delete: {
					deleteProductOrderFetcher.submit(
						{
							intent: deleteProductOrderActionIntent,
							productOrderId: productOrder.id,
						},
						{
							method: 'POST',
							action: '/order/product-order',
						},
					)
					break
				}
			}
		},
		{ preventDefault: true },
	)

	useEffect(() => {
		if (focus && focusRef?.current) {
			focusRef?.current.focus()
		}
	}, [focus])

	const handleKeyDown = () => {
		setFocus(index)
	}

	return (
		<div
			onKeyDown={handleKeyDown}
			tabIndex={index}
			ref={focusRef}
			className={cn(
				'relative  flex flex-col gap-4 rounded border bg-accent px-6 pb-6  pt-12 shadow-sm outline-none transition-all  lg:flex-row lg:items-center lg:gap-8 lg:pb-4 lg:pt-8',
				productOrderType === ProductOrderType.SELL &&
					productOrderTypeBorderColors[ProductOrderType.SELL],
				productOrderType === ProductOrderType.RETURN &&
					productOrderTypeBorderColors[ProductOrderType.RETURN],
				productOrderType === ProductOrderType.PROMO &&
					productOrderTypeBorderColors[ProductOrderType.PROMO],
			)}
		>
			<ProductOrderTypeToggle
				className="absolute left-0 top-0 p-2 lg:p-1  "
				productOrderId={productOrder.id}
				isPromoApplicable={isAnyProductDiscountApplicable}
				productOrderType={productOrderType}
				setProductOrderType={setProductOrderType}
			/>
			<div className="absolute right-0 top-0 ">
				{showUpdateSpinner ? (
					<div className="p-[5px] ">
						<Icon name="update" className="animate-spin" />
					</div>
				) : (
					<DeleteProductOrder id={productOrder.id} />
				)}
			</div>

			<div className="flex flex-col gap-1 lg:flex-1">
				<div className="flex justify-between gap-2">
					<span className="text-lg  tracking-tight">
						{productOrder.productDetails.name}
					</span>
				</div>
				<div className="flex w-fit items-center gap-1 rounded bg-muted-foreground/20 px-1 font-normal">
					<Icon name="scan-barcode" />
					<span className="text-sm">{productOrder.productDetails.code}</span>
				</div>
			</div>

			<div className="flex items-center justify-between gap-4  justify-self-start  lg:w-64">
				<div className="flex flex-col">
					<span>
						{formatCurrency(productOrder.productDetails.sellingPrice)}
					</span>
					<span className="font text-xs leading-none tracking-tight text-muted-foreground lg:text-sm">
						Precio unitario
					</span>
				</div>
				<ProductOrderQuantitySelector
					productOrderId={productOrder.id}
					quantity={quantity}
				/>
			</div>

			<div className="flex flex-1 items-center text-xs lg:text-sm ">
				<div className="">
					{productOrderType === ProductOrderType.PROMO ? (
						<div
							className={cn(
								'flex  flex-col-reverse   text-muted-foreground',
								isAnyProductDiscountApplicable && 'text-foreground',
							)}
						>
							<span className=" leading-none text-muted-foreground">
								Descuentos ({applicableProductDiscounts.length})
							</span>
							<span className="text-base">
								{formatCurrency(productOrder.totalDiscount)}
							</span>
						</div>
					) : (
						<div
							className={cn(
								'flex   flex-col   text-muted-foreground',
								isAnyProductDiscountApplicable && 'text-foreground',
							)}
						>
							{applicableProductDiscounts.length !== 0 && (
								<span className=" text-muted-foreground">
									<span className="font-semibold text-foreground">
										{applicableProductDiscounts.length}
									</span>{' '}
									{applicableProductDiscounts.length === 1
										? 'descuento disponible.'
										: 'descuentos disponibles.'}
								</span>
							)}
						</div>
					)}
				</div>
				<div className="ml-auto flex gap-2 text-right text-lg font-bold lg:flex-col lg:gap-0  lg:leading-tight">
					<span className="font-light lg:text-sm">Total:</span>
					<span className="max-w-24">
						{formatCurrency(productOrder.totalPrice)}
					</span>
				</div>
			</div>
		</div>
	)
}

//?Should we give an option to apply all promos automatically?
