import { cn } from '#app/utils/misc.tsx'
import { useFetcher } from '@remix-run/react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { itemTransactionTypeColors } from '../_constants/itemTransactionTypesColors.ts'
import {
	ItemTransactionTypeSchema,
	TYPE_PROMO,
	TYPE_RETURN,
	TYPE_SELL,
	type ItemTransactionType,
} from '../_types/item-transactionType.ts'

export const UPDATE_IT_TYPE = 'update-it-type'

export const UpdateItemTransactionTypeSchema = z.object({
	itemTransactionId: z.string(),
	itemTransactionType: ItemTransactionTypeSchema,
})

export const ItemTransactionTypeToggle = ({
	itemTransactionId,
	currentItemTransactionType,
	isPromoApplicable,
	cardRef,
}: {
	itemTransactionId: string
	currentItemTransactionType: ItemTransactionType
	isPromoApplicable: boolean
	cardRef: React.RefObject<HTMLDivElement>
}) => {
	const [itemTransactionType, setItemTransactionType] =
		useState<ItemTransactionType>(currentItemTransactionType)

	const itemTransactionTypeFetcher = useFetcher({ key: UPDATE_IT_TYPE })

	const cycleState = () => {
		let nextState: ItemTransactionType

		if (itemTransactionType === TYPE_SELL) {
			nextState = TYPE_RETURN
		} else if (itemTransactionType === TYPE_RETURN) {
			nextState = isPromoApplicable ? TYPE_PROMO : TYPE_SELL
		} else {
			nextState = isPromoApplicable ? TYPE_SELL : TYPE_RETURN
		}

		setItemTransactionType(nextState)
	}

	//When the promo stops being applicable, it changes back to TYPE_SELL
	useEffect(() => {
		if (itemTransactionType === TYPE_PROMO && !isPromoApplicable) {
			setItemTransactionType(TYPE_SELL)
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
				itemTransactionType === TYPE_SELL &&
					itemTransactionTypeColors[TYPE_SELL],
				itemTransactionType === TYPE_RETURN &&
					itemTransactionTypeColors[TYPE_RETURN],
				itemTransactionType === TYPE_PROMO &&
					itemTransactionTypeColors[TYPE_PROMO],
			)}
			onClick={cycleState}
			tabIndex={-1}
		>
			{itemTransactionType.substring(0, 5)}
		</div>
	)
}
