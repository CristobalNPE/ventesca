import { useOrder } from '#app/context/orders/OrderContext.tsx'
import { OrderStatus } from '#app/types/orders/order-status.ts'
import { useIsUserAdmin, useUser } from '#app/utils/user.ts'
import { DeleteOrder } from '../pos/current-order-delete'
import { FinishOrder } from '../pos/current-order-finish'
import { ModifyOrder } from '../pos/current-order-modify'

export function OrderActions() {
	const { order } = useOrder()
	const isOrderPending = order.status === OrderStatus.PENDING
	const user = useUser()
	const isAdmin = useIsUserAdmin()
	const canCallAction = order.seller.id === user.id || isAdmin


	return (
		<div className="flex flex-col items-center justify-end gap-4 lg:flex-row">
			{canCallAction && (
				<ModifyOrder orderId={order.id}/>
			)}
			{isOrderPending ? (
				canCallAction && <FinishOrder orderId={order.id} />
			) : (
				isAdmin && <DeleteOrder orderId={order.id} />
			)}
		</div>
	)
}
