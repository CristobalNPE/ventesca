import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { useAnalytics } from '#app/context/analytics/AnalyticsContext.js'
import { formatCurrency, getUserImgSrc } from '#app/utils/misc.tsx'
import { Icon, IconName } from '../ui/icon'

export function TopSellerCard() {
	const { sellerStatsForWeek } = useAnalytics()

	if (!sellerStatsForWeek) return null

	const sellerDisplayName =
		sellerStatsForWeek.sellerData.name ?? sellerStatsForWeek.sellerData.username

	const averageTransactionTimeInSeconds =
		sellerStatsForWeek.averageTransactionTime
	const averageTransactionTimeInMinutes =
		sellerStatsForWeek.averageTransactionTime > 0
			? sellerStatsForWeek.averageTransactionTime / 60
			: 0

	return (
		<Card>
			<CardHeader className="flex flex-row  justify-between gap-4 pb-9">
				<div>
					<CardDescription>
						Vendedor con mejor desempeño esta semana
					</CardDescription>
					<CardTitle className="text-4xl">{sellerDisplayName}</CardTitle>
				</div>
				<div className="h-16 w-16 overflow-clip rounded-full border-4 border-secondary bg-secondary shadow-md">
					<img
						src={getUserImgSrc(sellerStatsForWeek.sellerData.image?.id)}
						alt="Foto perfil vendedor"
					/>
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6 sm:grid-cols-3">
					<StatDisplay
						icon="cash-register"
						title="Transacciones Completadas"
						value={sellerStatsForWeek.totalTransactions.toString()}
					/>
					<StatDisplay
						icon="moneybag"
						title="Ganancias recaudadas"
						value={formatCurrency(sellerStatsForWeek.profitGenerated)}
					/>
					<StatDisplay
						icon="clock-up"
						title="Tiempo promedio por transacción"
						value={
							averageTransactionTimeInMinutes >= 1
								? `${averageTransactionTimeInMinutes.toFixed(0)} min.`
								: `${averageTransactionTimeInSeconds.toFixed(0)} seg.`
						}
					/>
				</div>
			</CardContent>
		</Card>
	)
}

function StatDisplay({
	title,
	value,
	icon,
}: {
	title: string
	value: string
	icon: IconName
}) {
	return (
		<div className="group relative flex animate-slide-top flex-col items-center justify-between gap-2 text-balance rounded-md border  p-4 pt-5 text-center text-foreground">
			<div className="absolute -top-4 left-1/2 h-7 w-7  -translate-x-1/2 rounded-full bg-primary transition-all duration-300 group-hover:scale-110">
				<Icon name={icon} className="z-20 shrink-0 text-primary-foreground" />
			</div>
			<div className=" text-sm leading-none">{title}</div>
			<div className="text-3xl font-bold">{value}</div>
		</div>
	)
}
