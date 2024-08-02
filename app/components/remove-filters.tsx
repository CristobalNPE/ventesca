import { Link, useLocation } from '@remix-run/react'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip'

export function RemoveFiltersButton({
	resetSelectValues,
}: {
	resetSelectValues?: () => void
}) {
	const location = useLocation()

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className={''}
						variant={'outline'}
						size={'icon'}
						asChild
						onClick={resetSelectValues}
					>
						<Link
							to={location.pathname}
							unstable_viewTransition
							prefetch="intent"
						>
							<Icon name="filter-off" size={'sm'} />
							<span className="sr-only">Limpiar filtros</span>
						</Link>
					</Button>
				</TooltipTrigger>
				<TooltipContent>
					<p>Limpiar filtros</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
