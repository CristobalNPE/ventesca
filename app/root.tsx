import {
	type LoaderFunctionArgs,
	json,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Form,
	Link,
	Links,
	Meta,
	NavLink,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useSubmit,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { useRef } from 'react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import {
	Icon,
	href as iconsHref,
	type IconName,
} from '#app/components/ui/icon.tsx'
import {
	cn,
	combineHeaders,
	getDomainUrl,
	getUserImgSrc,
} from '#app/utils/misc.tsx'

import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { EpicProgress } from './components/progress-bar.tsx'

import { Spacer } from './components/spacer.tsx'
import { useToast } from './components/toaster.tsx'
import { Button } from './components/ui/button.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuTrigger,
} from './components/ui/dropdown-menu.tsx'

import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetTrigger,
} from './components/ui/sheet.tsx'
import { EpicToaster } from './components/ui/sonner.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './components/ui/tooltip.tsx'
import { ThemeSwitch, useTheme } from './routes/resources+/theme-switch.tsx'
import fontStyleSheetUrl from './styles/font.css?url'
import tailwindStyleSheetUrl from './styles/tailwind.css?url'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints } from './utils/client-hints.tsx'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'

import { useNonce } from './utils/nonce-provider.ts'
import { getTheme, type Theme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'
import { useOptionalUser, userHasRole, useUser } from './utils/user.ts'

type NavigationLink = {
	name: string
	path: string
	icon: IconName
}

export const links: LinksFunction = () => {
	return [
		// Preload svg sprite as a resource to avoid render blocking
		{ rel: 'preload', href: iconsHref, as: 'image' },
		// Preload CSS as a resource to avoid render blocking
		{ rel: 'mask-icon', href: '/favicons/mask-icon.svg' },
		{
			rel: 'alternate icon',
			type: 'image/png',
			href: '/favicons/favicon-32x32.png',
		},
		{ rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon.png' },
		{
			rel: 'manifest',
			href: '/site.webmanifest',
			crossOrigin: 'use-credentials',
		} as const, // necessary to make typescript happy
		//These should match the css preloads above to avoid css as render blocking resource
		{ rel: 'icon', type: 'image/svg+xml', href: '/favicons/favicon.svg' },
		{ rel: 'stylesheet', href: fontStyleSheetUrl },
		{ rel: 'stylesheet', href: tailwindStyleSheetUrl },
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? 'Ventesca' : 'Error | Ventesca' },
		{ name: 'description', content: `Sistema de ventas` },
	]
}

export async function loader({ request }: LoaderFunctionArgs) {
	const timings = makeTimings('root loader')
	const userId = await time(() => getUserId(request), {
		timings,
		type: 'getUserId',
		desc: 'getUserId in root',
	})

	const user = userId
		? await time(
				() =>
					prisma.user.findUniqueOrThrow({
						select: {
							id: true,
							name: true,
							username: true,
							business: { select: { name: true } },
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
									permissions: {
										select: { entity: true, action: true, access: true },
									},
								},
							},
						},
						where: { id: userId },
					}),
				{ timings, type: 'find user', desc: 'find user in root' },
			)
		: null
	if (userId && !user) {
		console.info('something weird happened')
		// something weird happened... The user is authenticated but we can't find
		// them in the database. Maybe they were deleted? Let's log them out.
		await logout({ request, redirectTo: '/' })
	}
	const { toast, headers: toastHeaders } = await getToast(request)
	const honeyProps = honeypot.getInputProps()

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
				},
			},
			ENV: getEnv(),
			toast,
			honeyProps,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
			),
		},
	)
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
	const headers = {
		'Server-Timing': loaderHeaders.get('Server-Timing') ?? '',
	}
	return headers
}

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
	allowIndexing = true,
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string>
	allowIndexing?: boolean
}) {
	return (
		<html lang="es" className={`${theme} h-[100dvh] overflow-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				{allowIndexing ? null : (
					<meta name="robots" content="noindex, nofollow" />
				)}
				<Links />
			</head>
			<body className="bg-background text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const nonce = useNonce()
	const user = useOptionalUser()
	const isAdmin = user ? userHasRole(user, 'Administrador') : false
	const theme = useTheme()

	useToast(data.toast)

	const navigationLinks: NavigationLink[] = [
		{
			name: 'Punto de Venta',
			path: 'order',
			icon: 'circle-dollar-sign',
		},
		{
			name: 'Centro de Control',
			path: 'control-center',
			icon: 'circle-dot-dashed',
		},
		{
			name: 'Transacciones',
			path: 'reports',
			icon: 'file-bar-chart',
		},
		{
			name: 'Inventario',
			path: 'inventory',
			icon: 'package',
		},
		{
			name: 'Descuentos',
			path: 'discounts',
			icon: 'tag',
		},
		{
			name: 'Categorías',
			path: 'categories',
			icon: 'shapes',
		},
		{
			name: 'Proveedores',
			path: 'suppliers',
			icon: 'users',
		},
		//Admin only routes
		...(isAdmin
			? ([
					{
						name: 'Empresa',
						path: 'business',
						icon: 'briefcase',
					},
					{
						name: 'Vendedores',
						path: 'sellers',
						icon: 'user-dollar',
					},
				] as NavigationLink[])
			: []),
	]

	const secondaryLinks: NavigationLink[] = [
		{
			name: 'Ajustes',
			path: 'settings',
			icon: 'settings',
		},
	]

	const businessName = user?.business.name ?? ''

	// ?CONSIDER MAKING DIFFERENT HEADERS FOR LOGGED IN USER AND OTHERS.

	return (
		<Document nonce={nonce} theme={theme} env={data.ENV}>
			<div className="flex h-[100dvh] ">
				{user && (
					<SideBar
						themeUserPreference={data.requestInfo.userPrefs.theme}
						navigationLinks={navigationLinks}
						secondaryLinks={secondaryLinks}
						businessName={businessName}
					/>
				)}

				<main className="flex-1 overflow-y-auto  bg-muted/40 p-4 sm:p-5 md:m-2 md:rounded-md md:border md:p-7">
					<div className="xl:hidden ">
						<Spacer size="xs" />
					</div>
					<div className="mx-auto h-full max-w-[120rem]">
						<Outlet />
					</div>
				</main>
				{/* </div> */}
			</div>
			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<HoneypotProvider {...data.honeyProps}>
			<App />
		</HoneypotProvider>
	)
}

export default withSentry(AppWithProviders)

function UserDropdown() {
	const user = useUser()
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)

	const getUserRole = (roles: string[]) => {
		if (roles.includes('SuperUser')) return 'SuperUser'
		if (roles.includes('Administrador')) return 'Administrador'
		return 'Vendedor'
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="ghost">
					<Link
						to={`/users/${user.username}`}
						// this is for progressive enhancement
						onClick={e => e.preventDefault()}
						className="flex items-center  gap-2"
					>
						<img
							className="h-8 w-8 rounded-full object-cover"
							alt={user.name ?? user.username}
							src={getUserImgSrc(user.image?.id)}
						/>
						<div className="flex flex-col sm:hidden md:flex">
							<span className="text-body-sm font-bold">
								{user.name ?? user.username}
							</span>
							<span className="text-body-xs font-bold text-foreground/60">
								{getUserRole(user.roles.map(rol => rol.name))}
							</span>
						</div>
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="start">
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}`}>
							<Icon className="text-body-md" name="avatar">
								Perfil
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}/notes`}>
							<Icon className="text-body-md" name="pencil-2">
								Mis estadísticas
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem
						asChild
						// this prevents the menu from closing before the form submission is completed
						onSelect={event => {
							event.preventDefault()
							submit(formRef.current)
						}}
					>
						<Form action="/logout" method="POST" ref={formRef}>
							<Icon className="text-body-md" name="exit">
								<button type="submit">Cerrar Sesión</button>
							</Icon>
						</Form>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}

function SideBar({
	themeUserPreference,
	navigationLinks,
	secondaryLinks,
	businessName,
	businessLogo,
}: {
	themeUserPreference?: Theme | null
	navigationLinks: NavigationLink[]
	secondaryLinks: NavigationLink[]
	businessName: string
	businessLogo?: string
}) {
	const businessNameIsBig = businessName.length >= 10
	const businessNameIsBigger = businessName.length >= 20

	return (
		<>
			<div className="relative hidden w-[17.5rem]  flex-col  bg-background px-4 pb-8 pt-3 xl:flex ">
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<div className="flex select-none items-center gap-4 ">
								<div className="flex h-[3.5rem] w-[3.5rem] flex-shrink-0 rounded-md bg-foreground/40"></div>
								<h1
									className={cn(
										'text-2xl font-black uppercase tracking-tight',
										businessNameIsBig && 'text-xl',
										businessNameIsBigger && 'text-lg',
									)}
								>
									{businessName}
								</h1>
							</div>
						</TooltipTrigger>
						<TooltipContent>
							<p>Impulsado por VENTESCA</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
				<nav className="mt-8 flex h-full flex-col  justify-between gap-8">
					<div className="flex flex-col gap-2">
						{navigationLinks.map(link => {
							return (
								<NavLink
									className={({ isActive }) =>
										cn(
											'text-md flex select-none items-center gap-3 rounded-sm p-2 text-muted-foreground transition-colors hover:text-foreground',
											isActive &&
												' bg-muted-foreground/20 text-foreground  brightness-110 hover:text-foreground dark:bg-accent',
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
					</div>
					<div>
						{secondaryLinks.map(link => {
							return (
								<NavLink
									className={({ isActive }) =>
										cn(
											'text-md flex select-none items-center gap-3 rounded-sm p-2 text-muted-foreground transition-colors hover:text-foreground',
											isActive &&
												'bg-foreground/20 text-foreground hover:text-foreground',
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
					</div>
					<ThemeSwitch userPreference={themeUserPreference} />
					<UserDropdown />
				</nav>
			</div>
			{/* MOBILE DEVICES SIDEBAR: */}
			<Sheet>
				<SheetTrigger asChild>
					<Button
						size={'icon'}
						variant={'default'}
						className="absolute left-6 top-6 opacity-50 ring-4 xl:hidden"
					>
						<Icon className="text-2xl" name="layout-sidebar-left-expand" />
						<span className="sr-only">Expandir Menu</span>
					</Button>
				</SheetTrigger>
				<SheetContent side="left" className="sm:max-w-xs">
					<nav className=" flex h-full flex-col justify-around gap-6">
						<div className="flex flex-col gap-2">
							{navigationLinks.map(link => {
								return (
									<SheetClose className="group flex" asChild key={link.name}>
										<NavLink
											className={({ isActive }) =>
												cn(
													'flex select-none items-center gap-3 rounded-sm p-2 text-xl text-muted-foreground transition-colors hover:text-foreground',
													isActive &&
														'bg-foreground/20 text-foreground hover:text-foreground',
												)
											}
											to={link.path}
										>
											<Icon size="md" className="" name={link.icon} />
											<span>{link.name}</span>
										</NavLink>
									</SheetClose>
								)
							})}
						</div>
						<div>
							{secondaryLinks.map(link => {
								return (
									<SheetClose className="group flex" asChild key={link.name}>
										<NavLink
											className={({ isActive }) =>
												cn(
													'flex select-none items-center gap-3 rounded-sm p-2 text-xl text-muted-foreground transition-colors hover:text-foreground',
													isActive &&
														'bg-foreground/20 text-foreground hover:text-foreground',
												)
											}
											to={link.path}
										>
											<Icon size="md" className="" name={link.icon} />
											<span>{link.name}</span>
										</NavLink>
									</SheetClose>
								)
							})}
						</div>
						{/* <div className="flex flex-col gap-2">
							<ThemeSwitch userPreference={data.requestInfo.userPrefs.theme} />
						</div> */}
					</nav>
					<UserDropdown />
				</SheetContent>
			</Sheet>
		</>
	)
}

export function ErrorBoundary() {
	// the nonce doesn't rely on the loader so we can access that
	const nonce = useNonce()

	// NOTE: you cannot use useLoaderData in an ErrorBoundary because the loader
	// likely failed to run so we have to do the best we can.
	// We could probably do better than this (it's possible the loader did run).
	// This would require a change in Remix.

	// Just make sure your root route never errors out and you'll always be able
	// to give the user a better UX.

	return (
		<Document nonce={nonce}>
			<GeneralErrorBoundary />
		</Document>
	)
}
