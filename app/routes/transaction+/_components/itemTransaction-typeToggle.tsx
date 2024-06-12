import { useFetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { z } from 'zod'
import { cn } from '#app/utils/misc.tsx'
import { itemTransactionTypeColors } from '../_constants/itemTransactionTypesColors.ts'
import {
	ItemTransactionType,
	ItemTransactionTypeSchema,
} from '../_types/item-transactionType.ts'

export const UPDATE_IT_TYPE = 'update-it-type'

export const UpdateItemTransactionTypeSchema = z.object({
	itemTransactionId: z.string(),
	itemTransactionType: ItemTransactionTypeSchema,
})

export const ItemTransactionTypeToggle = ({
	itemTransactionId,
	itemTransactionType,
	setItemTransactionType,
	isPromoApplicable,
}: {
	itemTransactionId: string
	itemTransactionType: ItemTransactionType
	setItemTransactionType: (value: ItemTransactionType) => void
	isPromoApplicable: boolean
}) => {
	const itemTransactionTypeFetcher = useFetcher({
		key: `${UPDATE_IT_TYPE}-${itemTransactionId}`,
	})

	const cycleState = () => {
		let nextState: ItemTransactionType

		if (itemTransactionType === ItemTransactionType.SELL) {
			nextState = ItemTransactionType.RETURN
		} else if (itemTransactionType === ItemTransactionType.RETURN) {
			nextState = isPromoApplicable
				? ItemTransactionType.PROMO
				: ItemTransactionType.SELL
		} else {
			nextState = isPromoApplicable
				? ItemTransactionType.SELL
				: ItemTransactionType.RETURN
		}

		setItemTransactionType(nextState)
	}

	//When the promo stops being applicable, it changes back to TYPE_SELL
	useEffect(() => {
		if (
			itemTransactionType === ItemTransactionType.PROMO &&
			!isPromoApplicable
		) {
			setItemTransactionType(ItemTransactionType.SELL)
		}
	}, [isPromoApplicable, itemTransactionType])

	//Apply update on change
	useEffect(() => {
		itemTransactionTypeFetcher.submit(
			{
				itemTransactionType: itemTransactionType,
				itemTransactionId: itemTransactionId,
				intent: UPDATE_IT_TYPE,
			},
			{
				method: 'post',
				action: '/transaction/edit',
			},
		)
	}, [itemTransactionType])

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-sm p-1 text-xs font-bold uppercase tracking-wider text-background',
				itemTransactionType === ItemTransactionType.SELL &&
					itemTransactionTypeColors[ItemTransactionType.SELL],
				itemTransactionType === ItemTransactionType.RETURN &&
					itemTransactionTypeColors[ItemTransactionType.RETURN],
				itemTransactionType === ItemTransactionType.PROMO &&
					itemTransactionTypeColors[ItemTransactionType.PROMO],
			)}
			onClick={cycleState}
			tabIndex={-1}
		>
			{itemTransactionType.substring(0, 5)}
		</div>
	)
}
