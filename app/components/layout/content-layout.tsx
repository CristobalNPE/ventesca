import { cn } from '#app/utils/misc.tsx'
import { Navbar } from './navbar'

interface ContentLayoutProps {
	title?: string
	children: React.ReactNode
	hideNavbarOnBigScreen?: boolean
	limitHeight?: boolean
	actions?: React.ReactNode
}

export function ContentLayout({
	title = '',
	children,
	hideNavbarOnBigScreen = false,
	limitHeight = false,
	actions,
}: ContentLayoutProps) {
	return (
		<div>
			<Navbar
				hideOnBigScreen={hideNavbarOnBigScreen}
				actions={actions}
				title={title}
			/>

			{/* Consider making changes to the bg-color of this container so it does not look so monotonous in light mode */}
			<div
				className={cn(
					'min-h-[calc(100dvh_-_56px)] px-4 pb-6 pt-6 sm:px-6 ',
					limitHeight && 'h-[calc(100dvh_-_56px)] overflow-y-auto', //!Any mistakes in layout, check this
					// limitHeight && 'h-[calc(100dvh_-_56px)]',
					hideNavbarOnBigScreen && limitHeight && 'h-[100dvh]',
				)}
			>
				{children}
			</div>
		</div>
	)
}
