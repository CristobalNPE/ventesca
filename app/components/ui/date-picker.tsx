import { addDays, format } from 'date-fns'
import { es } from 'date-fns/locale'
import { type DateRange } from 'react-day-picker'
import { Button } from '#app/components/ui/button.tsx'
import { Calendar } from '#app/components/ui/calendar.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '#app/components/ui/select.tsx'
import { cn } from '#app/utils/misc.tsx'
import { Label } from './label.tsx'

export function DatePickerWithRange({
	className,
	label,
	date,
	setDate,
}: {
	className?: React.HTMLAttributes<HTMLDivElement>
	label?: string
	date: DateRange | undefined
	setDate: (period: DateRange) => void
}) {
	return (
		<div className={cn('grid gap-1', className)}>
			{label && <Label>{label}</Label>}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						className={cn(
							'w-full justify-start text-left font-normal',
							!date && 'text-muted-foreground',
						)}
					>
						<Icon className="mr-2 h-4 w-4" name={'calendar'} />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'LLL dd, y', { locale: es })} -{' '}
									{format(date.to, 'LLL dd, y', { locale: es })}
								</>
							) : (
								format(date.from, 'LLL dd, y', { locale: es })
							)
						) : (
							<span>Defina duración de la promoción</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Select
						onValueChange={value =>
							setDate({
								...date,
								to: addDays(new Date(), parseInt(value)),
							} as DateRange)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Duración predefinida" />
						</SelectTrigger>
						<SelectContent position="popper">
							<SelectItem value="1">Un dia</SelectItem>
							<SelectItem value="3">3 días</SelectItem>
							<SelectItem value="7">Una Semana</SelectItem>
							<SelectItem value="15">15 días</SelectItem>
							<SelectItem value="30">30 días</SelectItem>
						</SelectContent>
					</Select>
					<Calendar
						locale={es}
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate as any}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	)
}
