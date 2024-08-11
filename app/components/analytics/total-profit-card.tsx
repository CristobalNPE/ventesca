import { Card } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'
import { Skeleton } from '../ui/skeleton'

export function TotalProfit() {
	const { totalProfits } = useAnalytics()

	return (
		<Card className="grid w-full   gap-6 p-6 group">
			<div className="flex items-center gap-6">
				<div className="flex items-center justify-center rounded-md bg-primary p-3">
					<Icon
						name="currency-dollar"
						className="h-7 w-7 text-primary-foreground transition-all duration-300 group-hover:scale-110 "
					/>
				</div>
				<div className="grid gap-1">
					<h3 className="text-3xl font-semibold">
						{formatCurrency(totalProfits)}
					</h3>
					<p className="text-sm text-muted-foreground ">
						Ganancias totales desde el registro de la empresa.
					</p>
				</div>
			</div>
		</Card>
	)
}

function TotalProfitCardSkeleton() {
	return (
		<Card className="grid w-full   gap-6 p-6">
			<div className="flex items-center gap-6">
				<Skeleton className="h-16 w-16 rounded-md  p-3 " />
				<div className="grid w-full gap-1">
					<Skeleton className="h-[2.25rem] w-[60%] " />
					<p className="text-sm text-muted-foreground ">
						Ganancias totales desde el registro de la empresa.
					</p>
				</div>
			</div>
		</Card>
	)
}
