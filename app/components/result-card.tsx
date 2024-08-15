import { cva, type VariantProps } from 'class-variance-authority'
import { Badge } from '#app/components/ui/badge.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { cn } from '#app/utils/misc.tsx'

const cardVariants = cva('text-base font-semibold text-foreground', {
	variants: {
		variant: {
			default: '',
			success: 'bg-green-600',
			warning: 'bg-orange-400',
			error: 'bg-destructive',
		},
	},
	defaultVariants: {
		variant: 'default',
	},
})

type ResultCardProps = {
	title: string
	badgeCount: number
	description?: string
	icon: IconName
	variant?: VariantProps<typeof cardVariants>['variant']
}

export function ResultCard({
	title,
	badgeCount,
	description,
	icon,
	variant = 'default',
}: ResultCardProps) {
	return (
		<div
			className={cn(
				'flex w-full cursor-pointer select-none items-center justify-between rounded-md   p-2 hover:bg-secondary',
			)}
		>
			<div className="w-2/3 ">
				<div className="flex items-center gap-2 text-foreground">
					<Icon className="shrink-0" name={icon} size="sm" />
					<h2 className="text-left text-lg font-semibold">{title}</h2>
				</div>
				<p className=" text-left">{description && description}</p>
			</div>
			<Badge variant={'outline'} className={cn(cardVariants({ variant }))}>
				{badgeCount}
			</Badge>
		</div>
	)
}
