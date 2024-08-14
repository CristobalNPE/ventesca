import { cn } from '#app/utils/misc.tsx'
import { Link } from '@remix-run/react'
import { Button } from '../ui/button'
import { SidebarToggle } from './sidebar-toggle'
import { Icon } from '../ui/icon'
import { Menu } from './menu'
import { useSidebarToggle } from '#app/hooks/useSidebarToggle.ts'
import { useStore } from '#app/hooks/useStore.ts'
import { Brand } from './brand'
import { Theme } from '#app/utils/theme.server.ts'


export function Sidebar() {
	const sidebar = useStore(useSidebarToggle, state => state)

	if (!sidebar) return null

	return (
		<aside
			className={cn(
				'fixed left-0 top-0 z-20 h-screen -translate-x-full transition-[width] duration-300 ease-in-out lg:translate-x-0',
				sidebar?.isOpen === false ? 'w-[90px]' : 'w-72',
			)}
		>
			<SidebarToggle isOpen={sidebar.isOpen} setIsOpen={sidebar.setIsOpen} />
			{/* This had an h-full before, */}
			<div className="relative flex  flex-col overflow-y-auto px-3 py-4 shadow-md dark:shadow-zinc-800">
				<Brand isOpen={sidebar?.isOpen} />
				<Menu isOpen={sidebar?.isOpen} />
			</div>
		</aside>
	)
}
