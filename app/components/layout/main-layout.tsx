import { useSidebarToggle } from '#app/hooks/useSidebarToggle.js'
import { useStore } from '#app/hooks/useStore.ts'
import { cn } from '#app/utils/misc.tsx'
import { Footer } from './footer'
import { Sidebar } from './sidebar'

export function MainLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const sidebar = useStore(useSidebarToggle, (state) => state)

	if (!sidebar) return null
	return (
		<>
			<Sidebar />
			<main
				className={cn(
					'min-h-[calc(100vh_-_56px)] bg-secondary/50 transition-[margin-left] duration-300 ease-in-out ',

					sidebar?.isOpen === false ? 'lg:ml-[90px]' : 'lg:ml-72',
				)}
			>
				{children}
			</main>
			{/* <footer
				className={cn(
					'transition-[margin-left] duration-300 ease-in-out',
					sidebar?.isOpen === false ? 'lg:ml-[90px]' : 'lg:ml-72',
				)}
			>
				<Footer />
			</footer> */}
		</>
	)
}
