import { cn } from '#app/utils/misc.tsx'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'

interface SidebarToggleProps {
	isOpen: boolean | undefined
	setIsOpen?: () => void
}

export function SidebarToggle({ isOpen, setIsOpen }: SidebarToggleProps) {
	return (
		<div className="invisible absolute -right-[14px] top-1/2 -translate-y-1/2 z-20 lg:visible">
			<Button
				onClick={() => setIsOpen?.()}
				className="h-8 w-8 rounded-md"
				variant="outline"
				size="icon"
			>
				<Icon
					name="chevron-left"
					className={cn(
						'h-4 w-4 transition-transform duration-700 ease-in-out',
						isOpen === false ? 'rotate-180' : 'rotate-0',
					)}
				/>
			</Button>
		</div>
	)
}
