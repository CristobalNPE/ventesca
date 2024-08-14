import { cn } from '#app/utils/misc.tsx'
import { Navbar } from './navbar'

interface ContentLayoutProps {
	title?: string
	children: React.ReactNode
	hasNavbar?: boolean
	limitHeight?: boolean
	actions?: React.ReactNode
}

export function ContentLayout({
	title = '',
	children,
	hasNavbar = true,
	limitHeight = false,
	actions,
}: ContentLayoutProps) {
	return (
		<div>
			<div className={cn('', !hasNavbar && 'lg:hidden')}>
				<Navbar actions={actions} title={title} />
			</div>

			<div
				className={cn(
					'min-h-[calc(100dvh_-_56px)] px-4 pb-6 pt-6 sm:px-6',
					limitHeight && 'h-[calc(100dvh_-_56px)]',
					!hasNavbar && limitHeight && 'h-[100dvh]',
				)}
			>
				{children}
			</div>
		</div>
	)
}
