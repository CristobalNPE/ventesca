import { Icon, IconName } from './icon.tsx'

type SelectTabOption = {
	icon?: IconName
	label: string
	value: string
}

export const SelectTab = ({
	label,
	options,
	name,
	selected,
	setSelected,
}: {
	label?: string
	options: SelectTabOption[]
	name: string
	selected: string
	setSelected: (value: any) => void
}) => {
	return (
		<div className="flex flex-col gap-1">
			{label && <div className=" text-body-xs text-muted-foreground">{label}</div>}
			<div className="flex w-full select-none  justify-between rounded-md bg-background p-1 text-sm shadow-sm border">
				{options.map((option, index) => (
					<label
						key={option.value}
						className=" flex w-[50%] cursor-pointer items-center justify-center gap-2 rounded-md bg-background p-2 text-center capitalize  transition-colors duration-200 has-[:checked]:border border-primary has-[:checked]:bg-card has-[:checked]:font-bold"
						htmlFor={option.value}
					>
						<input
							defaultChecked={selected === option.value }
							className="appearance-none"
							type="radio"
							name={name}
							value={selected}
							onChange={() => setSelected(option.value)}
							id={option.value}
						/>
						<span>{option.label}</span>
						{option.icon && <Icon name={option.icon} className='text-xl' />}
					</label>
				))}
			</div>
		</div>
	)
}
