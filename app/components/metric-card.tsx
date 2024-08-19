import { cn } from '#app/utils/misc.tsx'
import { type PropsWithChildren, useEffect, useState } from 'react'

import { Card } from './ui/card'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from './ui/dialog'
import { Icon, type IconName } from './ui/icon'

// Base component props
type MetricCardProps = {
	title?: string
	description?: string
	subText?: string
	value: string | number
	icon: IconName
	isNegative?: boolean
	className?: string
}

// Base component
export function MetricCard({
	title,
	description,
	value,
	subText,
	icon,
	isNegative,
	className,
}: MetricCardProps) {
	return (
		<Card className={cn("grid h-fit rounded-lg bg-background p-6 shadow-sm", className)}>
			<div
				className={cn(
					'flex items-center justify-between gap-4 md:gap-2',
					!title && !description && 'justify-center',
				)}
			>
				<div className="flex items-center gap-4">
					<div
						className={cn(
							'flex items-center justify-center rounded-full bg-primary p-3',
							isNegative && 'animate-pulse',
						)}
					>
						<Icon
							name={icon}
							className={cn(
								'h-5 w-5 text-primary-foreground',
								isNegative && 'text-destructive',
							)}
						/>
					</div>
					<div>
						<h3 className="text-xl font-semibold">{title}</h3>
						<p className="hidden text-sm text-muted-foreground sm:block">
							{description}
						</p>
					</div>
				</div>
				<div
					className={cn(
						'flex flex-col items-center text-3xl font-bold leading-none',
						isNegative && 'text-destructive',
						!title && !description && 'text-xl',
					)}
				>
					<span>{value}</span>
					<span
						className={cn(
							'text-center text-xs font-normal text-muted-foreground',
							isNegative && '',
						)}
					>
						{subText}
					</span>
				</div>
			</div>
		</Card>
	)
}

// Interactive component props
type EditableMetricCardProps = MetricCardProps &
	PropsWithChildren & {
		isAdmin: boolean
		shouldClose: boolean
	}

// Interactive component
export function EditableMetricCard({
	isAdmin,
	shouldClose,
	children,
	...baseProps
}: EditableMetricCardProps) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (shouldClose) {
			setOpen(false)
		}
	}, [shouldClose])

	if (!isAdmin) {
		return <MetricCard {...baseProps} />
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Card
					className={cn(
						'group relative cursor-pointer rounded-lg bg-background transition-all duration-300 hover:-translate-y-1 hover:border-primary ',
					)}
					onClick={undefined}
				>
					<div className="absolute -top-2 right-1/2 z-10 translate-x-1/2 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100">
						Modificar{' '}
						<span className="font-bold lowercase">{baseProps.title}</span>
					</div>
					<MetricCard {...baseProps} />
				</Card>
			</DialogTrigger>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Modificar {baseProps.title}</DialogTitle>
					<DialogDescription></DialogDescription>
				</DialogHeader>
				{children}
			</DialogContent>
		</Dialog>
	)
}
