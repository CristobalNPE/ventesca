import { Card } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'

export function TotalOrders() {
	const { numberOfCompletedOrders, totalProfits } = useAnalytics()

	const averageProfitPerOrder =
		numberOfCompletedOrders > 0 ? totalProfits / numberOfCompletedOrders : 0
	return (
		<Card className="group grid   w-full gap-6 p-6">
			<div className="flex items-center gap-6">
				<div className="flex items-center justify-center rounded-md bg-primary p-3">
					<Icon
						name="circle-check"
						className="h-7 w-7 text-primary-foreground transition-all duration-300 group-hover:scale-110"
					/>
				</div>
				<div className="grid gap-1">
					<h3 className="text-3xl font-semibold leading-none">
						{numberOfCompletedOrders}{' '}
						<span className="text-base font-thin leading-none">
							transacciones completadas
						</span>
					</h3>
					<p className="text-sm text-muted-foreground ">
						{numberOfCompletedOrders > 0
							? `Ingresos promedio de ${formatCurrency(averageProfitPerOrder)} por transacción.`
							: ''}
					</p>
				</div>
			</div>
		</Card>
	)
}
