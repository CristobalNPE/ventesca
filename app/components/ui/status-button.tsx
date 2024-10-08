import * as React from 'react'
import { useSpinDelay } from 'spin-delay'
import { cn } from '#app/utils/misc.tsx'
import { Button, type ButtonProps } from './button.tsx'
import { Icon, type IconName } from './icon.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './tooltip.tsx'

export const StatusButton = React.forwardRef<
	HTMLButtonElement,
	ButtonProps & {
		status: 'pending' | 'success' | 'error' | 'idle'
		message?: string | null
		spinDelay?: Parameters<typeof useSpinDelay>[1]
		iconName?: IconName
	}
>(
	(
		{ message, status, className, children, iconName, spinDelay, ...props },
		ref,
	) => {
		const delayedPending = useSpinDelay(status === 'pending', {
			delay: 400,
			minDuration: 300,
			...spinDelay,
		})
		const companion = {
			pending: delayedPending ? (
				<div
					role="status"
					className="inline-flex h-6 w-6 items-center justify-center"
				>
					<Icon name="update" className="animate-spin" title="cargando" />
				</div>
			) : null,
			success: (
				<div
					role="status"
					className="inline-flex h-6 w-6 items-center justify-center"
				>
					<Icon name="check" title="Éxito" />
				</div>
			),
			error: (
				<div
					role="status"
					className="inline-flex h-6 w-6 items-center justify-center  "
				>
					<Icon
						name="cross-1"
						size="sm"
						className="text-destructive"
						title="error"
					/>
				</div>
			),
			idle: iconName ? (
				<div
					role="status"
					className="inline-flex h-6 w-6 items-center justify-center  "
				>
					<Icon name={iconName} size="sm" title="Enviar" />
				</div>
			) : null,
		}[status]

		return (
			<Button
				ref={ref}
				className={cn('flex justify-center gap-2', className)}
				{...props}
			>
				<div>{children}</div>
				{message ? (
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger>{companion}</TooltipTrigger>
							<TooltipContent>{message}</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				) : (
					companion
				)}
			</Button>
		)
	},
)
StatusButton.displayName = 'Button'
