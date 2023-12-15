import { useState } from 'react'
import { cn } from '#app/utils/misc.tsx'
import { Button } from './button.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from './command.tsx'
import { Icon } from './icon.tsx'
import { Popover, PopoverContent, PopoverTrigger } from './popover.tsx'

export function Combobox({
	data,
	itemNameProp, // key name for item name
	placeholder,
	emptyMsg,
}: {
	data: {
		[key: string]: string
	}[]
	itemNameProp: string

	placeholder: string
	emptyMsg: string
}) {
	const [open, setOpen] = useState(false)
	const [value, setValue] = useState('')

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="outline" role="combobox" aria-expanded={open}>
					{value
						? data.find(item => item[itemNameProp] === value)?.[itemNameProp]
						: placeholder}
					<Icon name="chevron-down" />
				</Button>
			</PopoverTrigger>

			<PopoverContent>
				<Command>
					<CommandInput placeholder={placeholder} />

					<CommandEmpty>{emptyMsg}</CommandEmpty>

					<CommandGroup>
						{data.map(item => (
							<CommandItem
								key={item[itemNameProp]}
								value={item[itemNameProp]}
								onSelect={setValue}
							>
								<Icon
									name="check"
									className={cn(
										value === item[itemNameProp] ? 'opacity-100' : 'opacity-0',
									)}
								/>
								{item[itemNameProp]}
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
