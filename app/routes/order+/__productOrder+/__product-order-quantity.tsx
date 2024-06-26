import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { useFetcher } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { changeProductOrderQuantityActionType } from '../product-order'

export const increaseProductOrderQuantityActionIntent = 'increase-po-quantity'
export const decreaseProductOrderQuantityActionIntent = 'decrease-po-quantity'
export const changeProductOrderQuantityActionIntent = 'change-po-quantity'

export const IncreaseProductOrderQuantitySchema = z.object({
	intent: z.literal(increaseProductOrderQuantityActionIntent),
	productOrderId: z.string(),
})
export const DecreaseProductOrderQuantitySchema = z.object({
	intent: z.literal(decreaseProductOrderQuantityActionIntent),
	productOrderId: z.string(),
})

export const ChangeProductOrderQuantitySchema = z.object({
	intent: z.literal(changeProductOrderQuantityActionIntent),
	productOrderId: z.string(),
	productOrderQuantity: z.number().min(0),
})

export const ProductOrderQuantitySelector = ({
	productOrderId,
	quantity,
}: {
	productOrderId: string
	quantity: number
}) => {
	const increaseProductOrderQuantityFetcher = useFetcher({
		key: `${increaseProductOrderQuantityActionIntent}-${productOrderId}`,
	})

	const decreaseProductOrderQuantityFetcher = useFetcher({
		key: `${decreaseProductOrderQuantityActionIntent}-${productOrderId}`,
	})
	const changeProductOrderQuantityFetcher =
		useFetcher<changeProductOrderQuantityActionType>({
			key: `${changeProductOrderQuantityActionIntent}-${productOrderId}`,
		})

	const [showInput, setShowInput] = useState(false)
	const [shouldFocus, setShouldFocus] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (showInput && shouldFocus) {
			inputRef.current?.focus()
			inputRef.current?.select()
			setShouldFocus(false)
		}
	}, [showInput, shouldFocus])

	const isSubmitting = [
		increaseProductOrderQuantityFetcher,
		decreaseProductOrderQuantityFetcher,
		changeProductOrderQuantityFetcher,
	].some(fetcher => fetcher.state !== 'idle')

	return (
		<div className="flex  items-center rounded-sm border border-muted-foreground/10 p-0">
			<decreaseProductOrderQuantityFetcher.Form
				method="POST"
				action="/order/product-order"
				className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
			>
				<input type="hidden" name="productOrderId" value={productOrderId} />
				<Button
					tabIndex={-1}
					type="submit"
					name="intent"
					value={decreaseProductOrderQuantityActionIntent}
					variant={'ghost'}
					className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
					disabled={isSubmitting || quantity === 1}
				>
					<Icon size="lg" name="minus" />
				</Button>
			</decreaseProductOrderQuantityFetcher.Form>
			<changeProductOrderQuantityFetcher.Form
				className="appearance-none"
				method="POST"
				action="/order/product-order"
				onSubmit={() => setShowInput(false)}
				onBlur={() => setShowInput(false)}
			>
				<input type="hidden" name="productOrderId" value={productOrderId} />
				<input
					type="hidden"
					name="intent"
					value={changeProductOrderQuantityActionIntent}
				/>
				{showInput ? (
					<Input
						ref={inputRef}
						className="h-[1.6rem] w-[3rem] border-none p-0 text-center [&::-webkit-inner-spin-button]:appearance-none"
						tabIndex={-1}
						type="number"
						name="productOrderQuantity"
						defaultValue={quantity}
						disabled={isSubmitting}
					/>
				) : (
					<div
						className="flex h-[1.6rem] w-[3rem] cursor-pointer items-center justify-center rounded border-none p-0 text-center text-sm"
						onClick={() => {
							setShowInput(true)
							setShouldFocus(true)
						}}
					>
						{quantity}
					</div>
				)}
			</changeProductOrderQuantityFetcher.Form>
			<increaseProductOrderQuantityFetcher.Form
				method="POST"
				action="/order/product-order"
				className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
			>
				<input type="hidden" name="productOrderId" value={productOrderId} />
				<Button
					tabIndex={-1}
					variant={'ghost'}
					className="aspect-square h-[1.6rem] w-[2rem] rounded-sm p-0"
					type="submit"
					name="intent"
					value={increaseProductOrderQuantityActionIntent}
					disabled={isSubmitting}
				>
					<Icon size="lg" name="plus" />
				</Button>
			</increaseProductOrderQuantityFetcher.Form>
		</div>
	)
}
