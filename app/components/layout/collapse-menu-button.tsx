import { useState } from 'react'
import { Icon, IconName } from '../ui/icon'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '../ui/collapsible'
import { Button } from '../ui/button'
import { cn } from '#app/utils/misc.tsx'
import { Link } from '@remix-run/react'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/tooltip'

type Submenu = {
	href: string
	label: string
	active: boolean
}

interface CollapseMenuButtonProps {
	icon: IconName
	label: string
	active: boolean
	submenus: Submenu[]
	isOpen: boolean | undefined
}

export function CollapseMenuButton({
	icon,
	label,
	active,
	submenus,
	isOpen,
}: CollapseMenuButtonProps) {
	const isSubmenuActive = submenus.some((submenu) => submenu.active)
	const [isCollapsed, setIsCollapsed] = useState<boolean>(isSubmenuActive)

	return isOpen ? (
		<Collapsible
			open={isCollapsed}
			onOpenChange={setIsCollapsed}
			className="w-full"
		>
			<CollapsibleTrigger
				className="mb-1 [&[data-state=open]>div>div>svg]:rotate-180"
				asChild
			>
				<Button
					variant={active ? 'secondary' : 'ghost'}
					className="h-10 w-full justify-start"
				>
					<div className="flex w-full items-center justify-between">
						<div className="flex items-center">
							<span className="mr-4">
								<Icon name={icon} />
							</span>
							<p
								className={cn(
									'max-w-[150px] truncate',
									isOpen
										? 'translate-x-0 opacity-100'
										: '-translate-x-96 opacity-0',
								)}
							>
								{label}
							</p>
						</div>
						<div
							className={cn(
								'whitespace-nowrap',
								isOpen
									? 'translate-x-0 opacity-100'
									: '-translate-x-96 opacity-0',
							)}
						>
							<Icon
								name="chevron-down"
								className="transition-transform duration-200"
							/>
						</div>
					</div>
				</Button>
			</CollapsibleTrigger>
			<CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
				{submenus.map(({ href, label, active }, index) => (
					<Button
						key={index}
						variant={active ? 'secondary' : 'ghost'}
						className="mb-1 h-10 w-full justify-start"
						asChild
					>
						<Link to={href}>
							<span className="ml-2 mr-4">
								<Icon name="dot" />
							</span>
							<p
								className={cn(
									'max-w-[170px] truncate',
									isOpen
										? 'translate-x-0 opacity-100'
										: '-translate-x-96 opacity-0',
								)}
							>
								{label}
							</p>
						</Link>
					</Button>
				))}
			</CollapsibleContent>
		</Collapsible>
	) : (
		<DropdownMenu>
			<TooltipProvider disableHoverableContent>
				<Tooltip delayDuration={100}>
					<TooltipTrigger asChild>
						<DropdownMenuTrigger asChild>
							<Button
								variant={active ? 'secondary' : 'ghost'}
								className="mb-1 h-10 w-full justify-start"
							>
								<div className="flex w-full items-center justify-between">
									<div className="flex items-center">
										<span className={cn(isOpen === false ? '' : 'mr-4')}>
											<Icon name={icon} />
										</span>
										<p
											className={cn(
												'max-w-[200px] truncate',
												isOpen === false ? 'opacity-0' : 'opacity-100',
											)}
										>
											{label}
										</p>
									</div>
								</div>
							</Button>
						</DropdownMenuTrigger>
					</TooltipTrigger>
					<TooltipContent side="right" align="start" alignOffset={2}>
						{label}
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
			<DropdownMenuContent side="right" sideOffset={25} align="start">
				<DropdownMenuLabel className="max-w-[190px] truncate">
					{label}
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{submenus.map(({ href, label }, index) => (
					<DropdownMenuItem key={index} asChild>
						<Link className="cursor-pointer" to={href}>
							<p className="max-w-[180px] truncate">{label}</p>
						</Link>
					</DropdownMenuItem>
				))}
				<DropdownMenu />
				{/* <DropdownMenu className="fill-border" /> */}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
