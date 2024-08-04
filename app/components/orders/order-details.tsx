import { useOrder } from '#app/context/orders/OrderContext.tsx'
import { OrderStatus } from '#app/types/orders/order-status.js'
import { format, formatRelative, subDays } from 'date-fns'
import { CardContentItem } from '../card-content-item'
import { MetricCard } from '../metric-card'
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '../ui/card'
import { Icon } from '../ui/icon'
import { es } from 'date-fns/locale'
import { formatCurrency } from '#app/utils/misc.tsx'

export function OrderDetails() {
	const { order } = useOrder()

	const orderIsPending = order.status === OrderStatus.PENDING

	return (
		<div className="flex flex-col gap-4">
			<MetricCard
				title={'Estado'}
				description="Estado de la transacción"
				value={order.status}
				icon={
					order.status === OrderStatus.PENDING
						? 'hourglass'
						: order.status === OrderStatus.DISCARDED
							? 'cross-1'
							: 'checks'
				}
			/>

			<Card>
				<CardHeader>
					<CardTitle>Detalles</CardTitle>
					<CardDescription>
						Detalles registrados de la transacción.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-6">
					<CardContentItem
						icon="id"
						title="ID Transacción"
						content={order.id.toUpperCase()}
					/>
					{!orderIsPending && (
						<CardContentItem
							icon="clock"
							title="Fecha ingreso"
							content={format(order.createdAt, 'dd/MM/yyyy hh:mm')}
						/>
					)}
					<CardContentItem
						icon="user-dollar"
						title="Vendedor"
						content={order.seller.name ?? order.seller.username}
					/>
					<CardContentItem
						icon="credit-card"
						title="Método de pago"
						content={order.paymentMethod}
					/>
					{order.directDiscount ? (
						<CardContentItem
							icon="tag"
							title="Descuento Directo"
							content={formatCurrency(order.directDiscount)}
						/>
					) : null}
					{order.totalDiscount ? (
						<CardContentItem
							icon="tag"
							title="Descuentos Asociados"
							content={formatCurrency(order.totalDiscount)}
						/>
					) : null}
					<CardContentItem
						icon="circle-dollar-sign"
						title="Total"
						content={formatCurrency(order.total)}
					/>
				</CardContent>
				<CardFooter className="flex justify-end border-t bg-muted/50 p-3  text-sm text-muted-foreground">
					<span className="flex items-center gap-1">
						<Icon size="sm" name="clock" /> Última modificación{' '}
						{formatRelative(subDays(order.updatedAt, 0), new Date(), {
							locale: es,
						})}
					</span>
				</CardFooter>
			</Card>
		</div>
	)
}
