import { NavLink, Outlet } from '@remix-run/react'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { cn } from '#app/utils/misc.tsx'

type NavigationLink = {
	name: string
	path: string
	icon: IconName
	main?: boolean
}
export default function SystemLayout() {
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
	]

	return (
		<div className="flex h-screen ">
			<div className="flex w-[20rem] flex-col border-r-[1px] border-foreground/5 bg-secondary/80 px-4 py-8">
				<h1 className="text-3xl font-bold">Sistema de Ventas</h1>
				<nav className="mt-8 flex h-full flex-col gap-3">
					{navigationLinks.map(link => {
						return (
							<NavLink
								className={({ isActive }) =>
									cn(
										'flex items-center gap-3 rounded-sm p-3 text-lg transition-colors hover:bg-primary/10',
										isActive && ' bg-primary/30 hover:bg-primary/30',
									)
								}
								key={link.name}
								to={link.path}
							>
								<Icon
									size="md"
									className="text-foreground/80"
									name={link.icon}
								/>
								<span>{link.name}</span>
							</NavLink>
						)
					})}
				</nav>
			</div>
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
