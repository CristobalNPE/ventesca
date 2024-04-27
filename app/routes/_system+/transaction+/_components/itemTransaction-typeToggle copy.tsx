import { useRef } from 'react'
import { cn } from '#app/utils/misc.tsx'
import { itemTransactionTypeColors } from '../_constants/itemTransactionTypesColors.ts'
import {
	type ItemTransactionType,
	TYPE_PROMO,
	TYPE_RETURN,
	TYPE_SELL,
} from '../_types/item-transactionType.ts'

export const ItemTransactionTypeToggle = ({
	initialType,
	setType,
	isPromoApplicable,
}: {
	initialType: ItemTransactionType
	setType: (value: ItemTransactionType) => void
	isPromoApplicable: boolean
}) => {
	const componentRef = useRef<HTMLDivElement>(null)

	const cycleState = () => {
		let nextState: ItemTransactionType

		if (initialType === TYPE_SELL) {
			nextState = TYPE_RETURN
		} else if (initialType === TYPE_RETURN) {
			nextState = isPromoApplicable ? TYPE_PROMO : TYPE_SELL
		} else {
			nextState = isPromoApplicable ? TYPE_SELL : TYPE_RETURN
		}

		setType(nextState)
	}

	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-sm p-1 text-xs font-bold uppercase tracking-wider text-background',
				initialType === TYPE_SELL && itemTransactionTypeColors[TYPE_SELL],
				initialType === TYPE_RETURN && itemTransactionTypeColors[TYPE_RETURN],
				initialType === TYPE_PROMO && itemTransactionTypeColors[TYPE_PROMO],
			)}
			onClick={cycleState}
			tabIndex={-1}
			ref={componentRef}
		>
			{initialType.substring(0, 5)}
		</div>
	)
}
