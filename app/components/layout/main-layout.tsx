import { useSidebarToggle } from '#app/hooks/useSidebarToggle.ts'
import { useStore } from '#app/hooks/useStore.ts'
import { cn } from '#app/utils/misc.tsx'
import { Theme } from '#app/utils/theme.server.ts'

import { Sidebar } from './sidebar'
interface MainLayoutProps {
	children: React.ReactNode
	themeUserPreference: Theme | null
}

export function MainLayout({ children, themeUserPreference }: MainLayoutProps) {
	const sidebar = useStore(useSidebarToggle, state => state)

	if (!sidebar) return null
	return (
		<>
			<Sidebar themeUserPreference={themeUserPreference} />
			<main
				className={cn(
					'min-h-[calc(100dvh_-_56px)] bg-secondary/50 transition-[margin-left] duration-300 ease-in-out  ',

					sidebar?.isOpen === false ? 'lg:ml-[90px]' : 'lg:ml-72',
				)}
			>
				{children}
			</main>
		</>
	)
}
