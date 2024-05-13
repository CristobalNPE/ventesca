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
	initialValue,
}: {
	label?: string
	options: SelectTabOption[]
	name: string
	initialValue?: string
}) => {
	return (
		<div className="flex flex-col gap-1">
			{label && (
				<div className=" text-body-xs text-muted-foreground">{label}</div>
			)}
			<div className="flex w-full select-none  justify-between rounded-md border bg-background p-1 text-sm shadow-sm">
				{options.map((option, index) => (
					<label
						key={option.value}
						className="flex w-[50%] cursor-pointer items-center justify-center gap-2 rounded-md border-primary bg-background p-2 text-center  capitalize underline-offset-2 transition-colors duration-200 has-[:checked]:bg-accent  has-[:checked]:font-bold has-[:checked]:underline"
						htmlFor={option.value}
					>
						<input
							className="appearance-none"
							type="radio"
							name={name}
							value={option.value}
							id={option.value}
							defaultChecked={initialValue === option.value}
						/>
						<span>{option.label}</span>
						{option.icon && <Icon name={option.icon} className="text-xl" />}
					</label>
				))}
			</div>
		</div>
	)
}
