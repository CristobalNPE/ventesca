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
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from './ui/drawer'

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
					{options.map((option) => (
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

export function ResponsiveFilterWrapper({
	children,
}: {
	children: React.ReactNode
}) {
	return (
		<>
			<div className="hidden w-fit flex-wrap items-center justify-center gap-4 rounded-md bg-secondary/40 p-1 shadow-sm sm:flex">
				{children}
			</div>
			<Drawer>
				<DrawerTrigger className="my-2 block sm:hidden" asChild>
					<Button className={'w-full'} variant={'secondary'} size={'sm'}>
						<Icon name="filter" size={'sm'} />
						<span className="sr-only">Mostrar filtros</span>
					</Button>
				</DrawerTrigger>
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Filtros de búsqueda</DrawerTitle>
						{/* <DrawerDescription>This action cannot be undone.</DrawerDescription> */}
					</DrawerHeader>
					<div className="flex flex-col items-center gap-4 p-6">{children}</div>
					<DrawerFooter>
						<DrawerClose>
							<Button variant="secondary" className="w-full">
								Aplicar filtros
							</Button>
						</DrawerClose>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</>
	)
}
