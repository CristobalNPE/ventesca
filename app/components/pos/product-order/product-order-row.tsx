import { Icon } from '#app/components/ui/icon.tsx'
import { TableCell, TableRow } from '#app/components/ui/table.tsx'
import { cn } from '#app/utils/misc.tsx'
import {
	type Discount,
	type ProductOrder as ProductOrderModel,
} from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { useCallback, useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Key } from 'ts-key-enum'

import { productOrderTypeBgFocusColors } from '#app/constants/productOrderTypesColors.ts'
import { ProductOrderType } from '#app/types/orders/productOrderType.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { useFetcher, useFetchers } from '@remix-run/react'
import { useSpinDelay } from 'spin-delay'
import {
	DeleteProductOrder,
	deleteProductOrderActionIntent,
} from './product-order-delete.tsx'
import {
	changeProductOrderQuantityActionIntent,
	decreaseProductOrderQuantityActionIntent,
	increaseProductOrderQuantityActionIntent,
	ProductOrderQuantitySelector,
} from './product-order-quantity.tsx'
import {
	ProductOrderTypeToggle,
	updateProductOrderTypeActionIntent,
} from './product-order-type.tsx'

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

export function ProductOrderRow({
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
	const [productOrderType, setProductOrderType] = useState<ProductOrderType>(
		productOrder.type as ProductOrderType,
	)

	const applicableDiscounts = getApplicableDiscounts(
		productOrder.productDetails.discounts,
		globalDiscounts,
		productOrder.quantity,
	)

	const isAnyProductDiscountApplicable = applicableDiscounts.length > 0

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

	// Hotkeys
	const handleHotkey = useCallback(
		(event: KeyboardEvent) => {
			switch (event.key.toLowerCase()) {
				case 'v':
					setProductOrderType(ProductOrderType.SELL)
					break
				case 'p':
					setProductOrderType(ProductOrderType.PROMO)
					break
				case 'd':
					setProductOrderType(ProductOrderType.RETURN)
					break
				case Key.Delete.toLowerCase():
					deleteProductOrderFetcher.submit(
						{
							intent: deleteProductOrderActionIntent,
							productOrderId: productOrder.id,
						},
						{
							method: 'POST',
							action: '/pos/product-order-actions',
						},
					)
					break
			}
		},
		[deleteProductOrderFetcher, productOrder.id, setProductOrderType],
	)

	const focusRef = useHotkeys<HTMLTableRowElement>(
		[Key.Delete, 'v', 'p', 'd'],
		handleHotkey,
		{ preventDefault: true },
	)

	useEffect(() => {
		if (focus && focusRef?.current) {
			focusRef.current.focus()
		}
	}, [focus, focusRef])

	return (
		<TableRow
			onKeyDown={() => setFocus(index)}
			tabIndex={index}
			ref={focusRef}
			className={cn(
				'group focus:outline-none',
				productOrderTypeBgFocusColors[productOrderType],
			)}
		>
			<TableCell className="w-[5rem]">
				<ProductOrderTypeToggle
					className=""
					productOrderId={productOrder.id}
					isPromoApplicable={isAnyProductDiscountApplicable}
					productOrderType={productOrderType}
					setProductOrderType={setProductOrderType}
				/>
			</TableCell>
			<TableCell className="">
				<ProductDescription
					code={productOrder.productDetails.code}
					name={productOrder.productDetails.name}
				/>
			</TableCell>
			<TableCell className="w-[7.8rem]  text-base">
				{formatCurrency(productOrder.productDetails.sellingPrice)}
			</TableCell>
			<TableCell className=" ">
				<ProductOrderQuantitySelector
					productOrderId={productOrder.id}
					quantity={productOrder.quantity}
					className="mx-auto"
				/>
			</TableCell>
			<TableCell className="w-[12rem] text-sm">
				<ProductAvailableDiscounts
					productOrderType={productOrderType}
					isAnyProductDiscountApplicable={isAnyProductDiscountApplicable}
					numberOfApplicableProductDiscounts={applicableDiscounts.length}
					totalDiscount={productOrder.totalDiscount}
				/>
			</TableCell>
			<TableCell className="w-[7.8rem] text-right text-base font-bold ">
				{formatCurrency(productOrder.totalPrice)}
			</TableCell>
			<TableCell className="w-[4rem] ">
				<div className="">
					{showUpdateSpinner ? (
						<div className="p-[5px] ">
							<Icon name="update" className="animate-spin" />
						</div>
					) : (
						<DeleteProductOrder
							id={productOrder.id}
							className="group-hover:text-destructive "
						/>
					)}
				</div>
			</TableCell>
		</TableRow>
	)
}

function ProductDescription({ code, name }: { code: string; name: string }) {
	return (
		<div className="flex flex-col gap-1 lg:flex-1">
			<div className="flex justify-between gap-2">
				<span className="text-base  tracking-tight">{name}</span>
			</div>
			<div className="flex w-fit items-center gap-1 rounded bg-muted-foreground/20 px-1 font-normal">
				<Icon name="scan-barcode" />
				<span className="text-sm">{code}</span>
			</div>
		</div>
	)
}
function ProductAvailableDiscounts({
	productOrderType,
	isAnyProductDiscountApplicable,
	numberOfApplicableProductDiscounts,
	totalDiscount,
}: {
	productOrderType: ProductOrderType
	isAnyProductDiscountApplicable: boolean
	numberOfApplicableProductDiscounts: number
	totalDiscount: number
}) {
	return (
		<div className="">
			{productOrderType === ProductOrderType.PROMO ? (
				<div
					className={cn(
						'flex  flex-col-reverse   text-muted-foreground',
						isAnyProductDiscountApplicable && 'text-foreground',
					)}
				>
					<span className="text-base">{formatCurrency(totalDiscount)}</span>
				</div>
			) : (
				<div
					className={cn(
						'flex   flex-col   text-muted-foreground',
						isAnyProductDiscountApplicable && 'text-foreground',
					)}
				>
					{numberOfApplicableProductDiscounts !== 0 && (
						<span className=" text-muted-foreground">
							<span className="font-semibold text-foreground">
								{numberOfApplicableProductDiscounts}
							</span>{' '}
							{numberOfApplicableProductDiscounts === 1
								? 'descuento disponible.'
								: 'descuentos disponibles.'}
						</span>
					)}
				</div>
			)}
		</div>
	)
}

const getApplicableDiscounts = (
	productDiscounts: SerializeFrom<
		Pick<Discount, 'isActive' | 'minimumQuantity'>
	>[],
	globalDiscounts: SerializeFrom<
		Pick<Discount, 'isActive' | 'minimumQuantity'>
	>[],
	quantity: number,
) => {
	const allDiscounts = [...productDiscounts, ...globalDiscounts]
	return allDiscounts.filter(
		discount => discount.isActive && quantity >= discount.minimumQuantity,
	)
}
