type SelectTabOption = {
	label: string
	value: string
}

export const SelectTab = ({
	options,
	name,
	selected,
	setSelected,
}: {
	options: SelectTabOption[]
	name: string
	selected: string
	setSelected: (value: string) => void
}) => {
	return (
		<div className="flex w-full select-none  justify-between rounded-md bg-background p-1 text-sm">
			{options.map((option, index) => (
				<label
					key={option.value}
					className=" w-[50%]  cursor-pointer rounded-md bg-background p-2 text-center capitalize  transition-colors duration-200 has-[:checked]:bg-primary has-[:checked]:text-background"
					htmlFor={option.value}
				>
					<input
						defaultChecked={index === 0}
						className="appearance-none"
						type="radio"
						name={name}
						value={selected}
						onChange={() => setSelected(option.value)}
						id={option.value}
					/>
					{option.label}
				</label>
			))}
		</div>
	)
}
