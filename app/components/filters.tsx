import { Link, useLocation } from '@remix-run/react'
import { Label as FormLabel } from '#app/components/ui/label.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { SortDirection } from '#app/types/SortDirection.ts'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './ui/tooltip'


export function FilterSelect({
	label,
	filter,
	setFilter,
	options,
	topOption,
}: {
	label: string
	filter: string
	setFilter: (filter: string) => void
	options: { value: string; label: string }[]
	topOption?: { value: string; label: string }
}) {
	return (
		<div className="relative w-full sm:w-[180px]">
			<FormLabel className="absolute -top-2 left-2 z-30 rounded bg-background p-[1px] text-xs text-muted-foreground">
				{label}
			</FormLabel>
			<Select value={filter} onValueChange={setFilter}>
				<SelectTrigger className="">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{topOption && (
						<SelectItem value={topOption.value}>{topOption.label}</SelectItem>
					)}
					{options.map(option => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	)
}

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

interface SortDirectionButtonProps {
	sortDirection: SortDirection
	onChange: (newDirection: SortDirection) => void
}

export function SortDirectionButton({
	sortDirection,
	onChange,
}: SortDirectionButtonProps) {
	const toggleSortDirection = () => {
		const newDirection =
			sortDirection === SortDirection.DESC
				? SortDirection.ASC
				: SortDirection.DESC
		onChange(newDirection)
	}

	return (
		<Button onClick={toggleSortDirection} variant={'outline'} size={'icon'}>
			<Icon
				size="sm"
				name={
					sortDirection === SortDirection.DESC
						? 'double-arrow-down'
						: 'double-arrow-up'
				}
			/>
			<span className="sr-only">Cambiar dirección de orden</span>
		</Button>
	)
}
