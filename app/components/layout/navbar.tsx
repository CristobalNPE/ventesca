import { useLocation } from '@remix-run/react'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { LinkWithParams } from '../ui/link-params'
import { SheetMenu } from './sheet-menu'

interface NavbarProps {
	title: string
	actions?: React.ReactNode
}

export function Navbar({ title, actions }: NavbarProps) {
	const { pathname } = useLocation()

	const paths = pathname.split('/')

	const showBackButton = paths.length > 2 && paths[1]?.length

	return (
		<header className="sticky top-0 z-10 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 ">
			<div className="mx-4 flex h-14 items-center sm:mx-8">
				<div className="flex  items-center space-x-4 lg:space-x-0">
					<SheetMenu />

					<div className="flex items-center gap-4">
						{showBackButton ? (
							<Button variant={'outline'} size={'sm'} className="" asChild>
								{/*! TODO: If comming from a different path, shoud go back to that path */}
								{/* Only show this back button is there is a path "back" */}
								<LinkWithParams
									preserveSearch
									prefetch="intent"
									unstable_viewTransition
									to={'..'}
									relative="path"
								>
									<Icon name={'double-arrow-left'} size="md" />

									<span className="sr-only">Volver</span>
								</LinkWithParams>
							</Button>
						) : null}
						<h1 className="text-xl font-semibold">{title}</h1>
					</div>
				</div>
				<div className="flex flex-1 items-center justify-end space-x-4">
					{actions}
				</div>
			</div>
		</header>
	)
}
