import { Icon, IconName } from "./ui/icon"

export function DetailsCard({
	icon,
	description,
	data,
}: {
	icon: IconName
	description: string
	data: string | number
}) {
	return (
		<div className="flex gap-4 p-2">
			<Icon className="text-3xl" name={icon} />
			<div>
				<div className="font-semibold text-muted-foreground">{description}</div>
				<div className="text-lg">{data}</div>
			</div>
		</div>
	)
}
