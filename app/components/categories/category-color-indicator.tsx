import {
	Tooltip,
	TooltipProvider,
	TooltipTrigger,
	TooltipContent,
} from '../ui/tooltip'

export function CategoryColorIndicator({ colorCode }: { colorCode: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div
						tabIndex={-1}
						className="relative flex aspect-square h-7 w-7 shrink-0 items-center  justify-center overflow-hidden rounded-full border"
					>
						<input
							type="color"
							className="absolute h-36  w-36 appearance-none border-none bg-transparent "
							disabled
							value={colorCode}
						/>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>Color asociado</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
