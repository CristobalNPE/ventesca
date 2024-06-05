import { cn } from '#app/utils/misc.tsx'
import { Icon, IconName } from './ui/icon.tsx'

export function DataRow({
	icon,
	label,
	value,
	isEditable,
	editModal,
	suffix,
	className,
}: {
	icon: IconName
	label: string
	value?: string | number
	isEditable?: boolean
	editModal?: JSX.Element
	suffix?: string
	className?: string
}) {
	const sanitizedValue = value ? value : 'Sin definir'

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-3 truncate rounded-md p-4 font-semibold uppercase tracking-wide text-muted-foreground transition-colors duration-150 hover:bg-accent ',
				className && className,
			)}
		>
			<div className="flex gap-6  overflow-x-clip">
				<Icon name={icon} className="shrink-0 text-3xl" />
				<div className="flex flex-col">
					<span className="capitalize tracking-normal">{label}</span>
					<span className="text-foreground ">
						{sanitizedValue}{' '}
						<span className="lowercase tracking-normal text-muted-foreground">
							{suffix}
						</span>
					</span>
				</div>
			</div>
			{isEditable && editModal}
		</div>
	)
}
