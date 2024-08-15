import { useLocation } from '@remix-run/react'
import { cn } from '#app/utils/misc.tsx'
import { Button } from '../ui/button'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '../ui/drawer'
import { Icon } from '../ui/icon'
import { LinkWithParams } from '../ui/link-params'
import { SheetMenu } from './sheet-menu'

interface NavbarProps {
	title: string
	actions?: React.ReactNode
	hideOnBigScreen: boolean
}

export function Navbar({ title, actions, hideOnBigScreen }: NavbarProps) {
	const { pathname, state } = useLocation()

	const paths = pathname.split('/')

	const showBackButton = paths.length > 2 && paths[1]?.length

	let origin = '..'
	if (state && state.origin) origin = `/${state.origin}`

	return (
		<header
			className={cn(
				'sticky top-0 z-50 w-full bg-background/95 shadow backdrop-blur supports-[backdrop-filter]:bg-background/60 ',
				hideOnBigScreen && 'lg:hidden',
			)}
		>
			<div className="mx-4 flex h-14 items-center sm:mx-8">
				<div className="flex  items-center gap-2  lg:space-x-0 ">
					<SheetMenu />

					<div className="flex items-center gap-4 ">
						{showBackButton ? (
							<Button variant={'outline'} className="" size={'sm'} asChild>
								{/*! TODO: If comming from a different path, shoud go back to that path */}
								{/* Only show this back button is there is a path "back" */}

								<LinkWithParams
									preserveSearch
									prefetch="intent"
									unstable_viewTransition
									to={origin}
									relative="path"
								>
									<Icon name={'double-arrow-left'} size="md" />

									<span className="sr-only">Volver</span>
								</LinkWithParams>
							</Button>
						) : null}
						<h1 className="hidden text-center font-semibold leading-none sm:inline sm:tracking-wide">
							{title}
						</h1>
					</div>
				</div>
				{/* ! ON SMALL SCREENS, PUT THIS IN A DROPDOWN ? */}
				<div className="ml-auto hidden items-center  justify-end space-x-4 xl:flex">
					{actions}
				</div>

				{actions && (
					<Drawer>
						<DrawerTrigger asChild>
							<Button className="ml-auto p-2 xl:hidden" size={'sm'}>
								<Icon name="dots-vertical" />
								<span className="sr-only">Opciones</span>
							</Button>
						</DrawerTrigger>
						<DrawerContent className="flex flex-col p-6">
							<DrawerHeader>
								<DrawerTitle></DrawerTitle>
							</DrawerHeader>
							{actions}
						</DrawerContent>
					</Drawer>
				)}
			</div>
			<h1 className="text-balance p-3 text-center font-semibold leading-none sm:hidden sm:tracking-wide">
				{title}
			</h1>
		</header>
	)
}
