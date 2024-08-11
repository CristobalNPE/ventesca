import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Progress } from '#app/components/ui/progress.tsx'
import { Icon, IconName } from '../ui/icon'

export function TopSellerCard() {
	//TODO: RENAME TO TOP BUSINESS SELLER
	return (
		<Card>
			<CardHeader className="flex flex-row  justify-between gap-4 pb-9">
				<div>
					<CardDescription>Vendedor con mejor desempeño esta semana</CardDescription>
					<CardTitle className="text-4xl">Don Sunito Sunero</CardTitle>
				</div>
				<div className="h-14 w-14 rounded-sm bg-secondary ">
					<img src="unsplash.com/random/200x200" alt="Seller" />
				</div>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6 sm:grid-cols-3">
					<StatDisplay
						icon="cash-register"
						title="Transacciones Completadas"
						value="100"
					/>
					<StatDisplay
						icon="moneybag"
						title="Ganancias recaudadas"
						value="100"
					/>
					<StatDisplay
						icon="clock-up"
						title="Tiempo promedio por transacción"
						value="100"
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
