import {
	Link,
	useLocation,
	useOutletContext,
	useRouteLoaderData,
} from '@remix-run/react'
import { ScrollArea } from '../ui/scroll-area'

import { cn } from '#app/utils/misc.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/tooltip'
import { Icon } from '../ui/icon'
import { Button } from '../ui/button'
import { CollapseMenuButton } from './collapse-menu-button'
import { getMenuList } from '#app/utils/menu-list.ts'
import { UserDropdown } from './user-dropdown'
import { ThemeSwitch } from '#app/routes/resources+/theme-switch.tsx'
import { Theme } from '#app/utils/theme.server.ts'
import { type loader as RootLoader } from '#app/root.tsx'

interface MenuProps {
	isOpen: boolean | undefined
}

export function Menu({ isOpen }: MenuProps) {
	const { pathname } = useLocation()
	const menuList = getMenuList(pathname)
	const data = useRouteLoaderData<typeof RootLoader>('root')
	const themeUserPreference = data?.requestInfo.userPrefs.theme

	return (
		<ScrollArea className="[&>div>div[style]]:!block ">
			<nav className="mt-7 h-full  w-full">
				<ul className="flex min-h-[calc(100dvh-48px-36px-16px-32px)] flex-col items-start space-y-1 px-2 lg:min-h-[calc(100dvh-32px-40px-32px)]">
					{menuList.map(({ groupLabel, menus }, index) => (
						<li className={cn('w-full', groupLabel ? 'pt-5' : '')} key={index}>
							{(isOpen && groupLabel) || isOpen === undefined ? (
								<p className="max-w-[248px] truncate px-4 pb-2 text-sm font-medium text-muted-foreground">
									{groupLabel}
								</p>
							) : !isOpen && isOpen !== undefined && groupLabel ? (
								<TooltipProvider>
									<Tooltip delayDuration={100}>
										<TooltipTrigger className="w-full">
											<div className="flex w-full items-center justify-center">
												<Icon name="ellipsis" className="h-5 w-5" />
											</div>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p>{groupLabel}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							) : (
								<p className="pb-2"></p>
							)}
							{menus.map(({ href, label, icon, active, submenus }, index) =>
								submenus.length === 0 ? (
									<div className="w-full" key={index}>
										<TooltipProvider disableHoverableContent>
											<Tooltip delayDuration={100}>
												<TooltipTrigger asChild>
													<Button
														variant={active ? 'secondary' : 'ghost'}
														className="mb-1 h-10 w-full justify-start"
														asChild
													>
														<Link
															unstable_viewTransition
															prefetch="intent"
															to={href}
														>
															<span
																className={cn(isOpen === false ? '' : 'mr-4')}
															>
																<Icon name={icon} size="md" />
															</span>
															<p
																className={cn(
																	'max-w-[200px] truncate',
																	isOpen === false
																		? '-translate-x-96 opacity-0'
																		: 'translate-x-0 opacity-100',
																)}
															>
																{label}
															</p>
														</Link>
													</Button>
												</TooltipTrigger>
												{isOpen === false && (
													<TooltipContent side="right">{label}</TooltipContent>
												)}
											</Tooltip>
										</TooltipProvider>
									</div>
								) : (
									<div className="w-full" key={index}>
										<CollapseMenuButton
											icon={icon}
											label={label}
											active={active}
											submenus={submenus}
											isOpen={isOpen}
										/>
									</div>
								),
							)}
						</li>
					))}
					<li className="flex w-full grow items-end">
						<div
							className={cn(
								'flex h-24 w-full flex-row-reverse items-center justify-between  ',
								!isOpen && 'flex-col justify-normal  gap-3  ',
							)}
						>
							<ThemeSwitch userPreference={themeUserPreference} />
							<UserDropdown isOpen={isOpen} />
						</div>
					</li>
				</ul>
			</nav>
		</ScrollArea>
	)
}
