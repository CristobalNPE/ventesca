import { VerifyOrderDialog } from '#app/routes/_orders+/orders_.verify-order.tsx'
import { RouteHeader } from '../route-header'

export function OrdersHeader() {
	return (
		<RouteHeader title="Reportes de Transacción">
			<VerifyOrderDialog />
		</RouteHeader>
	)
}
