import { NavLink, Outlet } from '@remix-run/react'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { cn } from '#app/utils/misc.tsx'
import { useState } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'

type NavigationLink = {
	name: string
	path: string
	icon: IconName
	main?: boolean
}
export default function SystemLayout() {
	//maybe want to save this option?
	const [shrinkSidebar, setShrinkSidebar] = useState(false)

	const navigationLinks: NavigationLink[] = [
		{
			name: 'Punto de Venta',
			path: 'sell',
			icon: 'circle-dollar-sign',
			main: true,
		},
		{
			name: 'Panel de Control',
			path: 'control-panel',
			icon: 'circle-dot-dashed',
		},
		{
			name: 'Reportes de Ventas',
			path: 'reports',
			icon: 'file-bar-chart',
		},
		{
			name: 'Inventario',
			path: 'inventory',
			icon: 'package',
		},
		{
			name: 'Categorías',
			path: 'categories',
			icon: 'shapes',
		},
		{
			name: 'Proveedores',
			path: 'providers',
			icon: 'users',
		},
		{
			name: 'Ajustes',
			path: 'settings',
			icon: 'settings',
		},
	]

	return (
		<div className="flex h-screen ">
			{shrinkSidebar ? (
				<div className="flex w-fit flex-col items-center border-r-[1px] border-foreground/5 bg-secondary/80 px-2 py-8">
					<h1 className="text-3xl font-bold">SV</h1>
					<nav className="mt-8 flex h-full flex-col gap-3">
						{navigationLinks.map(link => {
							return (
								<TooltipProvider delayDuration={100} key={link.name}>
									<Tooltip>
										<TooltipTrigger>
											<NavLink
												className={({ isActive }) =>
													cn(
														'flex items-center gap-3 rounded-sm p-3 text-3xl transition-colors hover:bg-primary/10',
														isActive && ' bg-primary/30 hover:bg-primary/30',
														link.main && 'text-primary',
													)
												}
												to={link.path}
											>
												<Icon className="" name={link.icon} />
											</NavLink>
										</TooltipTrigger>
										<TooltipContent side="right">
											<p>{link.name}</p>
										</TooltipContent>
									</Tooltip>
								</TooltipProvider>
							)
						})}
					</nav>
					<Button variant={'outline'} onClick={() => setShrinkSidebar(false)}>
						<Icon name="arrow-right" />
					</Button>
				</div>
			) : (
				<div className="flex w-[19rem] flex-col border-r-[1px] border-foreground/5 bg-secondary/80 px-4 py-8">
					<h1 className="text-3xl font-bold">Sistema de Ventas</h1>
					<nav className="mt-8 flex h-full flex-col gap-3">
						{navigationLinks.map(link => {
							return (
								<NavLink
									className={({ isActive }) =>
										cn(
											'flex items-center gap-3 rounded-sm p-3 text-lg transition-colors hover:bg-primary/10',
											isActive && ' bg-primary/30 hover:bg-primary/30',
											link.main && 'text-primary',
										)
									}
									key={link.name}
									to={link.path}
								>
									<Icon size="md" className="" name={link.icon} />
									<span>{link.name}</span>
								</NavLink>
							)
						})}
					</nav>
					<Button variant={'outline'} onClick={() => setShrinkSidebar(true)}>
						<Icon name="arrow-left" />
					</Button>
				</div>
			)}
			<div className="flex-1 overflow-auto ">
				<header className="sticky top-0 z-50 flex  h-[4.5rem] items-center justify-end border-b-[1px] border-foreground/5 bg-secondary p-8">
					<h1>
						Vendedor : <span className="font-bold">Jhon Doe</span>
					</h1>
				</header>
				<main className="p-8">
					<Outlet />
				</main>
			</div>
		</div>
	)
}
