import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'

export function DataCard({
	title,
	value,
	icon,
	subtext,
}: {
	title: string
	value: string
	icon: IconName
	subtext: string
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<Icon className="text-xl text-foreground/80" name={icon} />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-xs text-muted-foreground">{subtext}</p>
			</CardContent>
		</Card>
	)
}
