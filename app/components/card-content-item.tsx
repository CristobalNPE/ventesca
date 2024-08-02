import { Icon, IconName } from './ui/icon'

export function CardContentItem({
	icon,
	content,
	title,
}: {
	icon: IconName
	title: string
	content: string | number
}) {
	return (
		<div className="flex gap-3   ">
			<div className="shrink-0 flex aspect-square w-12 items-center justify-center rounded-md border">
				<Icon name={icon} size="lg" className="text-muted-foreground" />
			</div>
			<div>
				<div className="text-muted-foreground">{title}</div>
				<div>{content}</div>
			</div>
		</div>
	)
}
