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
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { cssBundleHref } from '@remix-run/css-bundle'
import {
	json,
	type DataFunctionArgs,
	type HeadersFunction,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node'
import {
	Form,
	Link,
	Links,
	LiveReload,
	Meta,
	NavLink,
	Outlet,
	Scripts,
	ScrollRestoration,
	useFetcher,
	useFetchers,
	useLoaderData,
	useSubmit,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { useRef } from 'react'
import { AuthenticityTokenProvider } from 'remix-utils/csrf/react'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { ErrorList } from './components/forms.tsx'
import { EpicProgress } from './components/progress-bar.tsx'
import { EpicToaster } from './components/toaster.tsx'
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
import fontStyleSheetUrl from './styles/font.css'
import tailwindStyleSheetUrl from './styles/tailwind.css'
import { getUserId, logout } from './utils/auth.server.ts'
import { ClientHintCheck, getHints, useHints } from './utils/client-hints.tsx'
import { csrf } from './utils/csrf.server.ts'
import { prisma } from './utils/db.server.ts'
import { getEnv } from './utils/env.server.ts'
import { honeypot } from './utils/honeypot.server.ts'

import { useNonce } from './utils/nonce-provider.ts'
import { useRequestInfo } from './utils/request-info.ts'
import { getTheme, setTheme, type Theme } from './utils/theme.server.ts'
import { makeTimings, time } from './utils/timing.server.ts'
import { getToast } from './utils/toast.server.ts'
import { useOptionalUser, useUser } from './utils/user.ts'

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
		{ rel: 'preload', href: fontStyleSheetUrl, as: 'style' },
		{ rel: 'preload', href: tailwindStyleSheetUrl, as: 'style' },
		cssBundleHref ? { rel: 'preload', href: cssBundleHref, as: 'style' } : null,
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
		cssBundleHref ? { rel: 'stylesheet', href: cssBundleHref } : null,
	].filter(Boolean)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{ title: data ? 'Ventesca' : 'Error | Ventesca' },
		{ name: 'description', content: `Sistema de ventas` },
	]
}

export async function loader({ request }: DataFunctionArgs) {
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
	const [csrfToken, csrfCookieHeader] = await csrf.commitToken()

	return json(
		{
			user,
			requestInfo: {
				hints: getHints(request),
				origin: getDomainUrl(request),
				path: new URL(request.url).pathname,
				userPrefs: {
					theme: getTheme(request),
					//save here the state of the sidebar.
				},
			},
			ENV: getEnv(),
			toast,
			honeyProps,
			csrfToken,
		},
		{
			headers: combineHeaders(
				{ 'Server-Timing': timings.toString() },
				toastHeaders,
				csrfCookieHeader ? { 'set-cookie': csrfCookieHeader } : null,
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

const ThemeFormSchema = z.object({
	theme: z.enum(['system', 'light', 'dark']),
})

export async function action({ request }: DataFunctionArgs) {
	const formData = await request.formData()
	const submission = parse(formData, {
		schema: ThemeFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}
	const { theme } = submission.value

	const responseInit = {
		headers: { 'set-cookie': setTheme(theme) },
	}
	return json({ success: true, submission }, responseInit)
}

function Document({
	children,
	nonce,
	theme = 'light',
	env = {},
}: {
	children: React.ReactNode
	nonce: string
	theme?: Theme
	env?: Record<string, string>
}) {
	return (
		<html lang="en" className={`${theme} h-[100dvh] overflow-hidden`}>
			<head>
				<ClientHintCheck nonce={nonce} />
				<Meta />
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width,initial-scale=1" />
				<Links />
			</head>
			<body className="bg-background/95 text-foreground">
				{children}
				<script
					nonce={nonce}
					dangerouslySetInnerHTML={{
						__html: `window.ENV = ${JSON.stringify(env)}`,
					}}
				/>
				<ScrollRestoration nonce={nonce} />
				<Scripts nonce={nonce} />
				<LiveReload nonce={nonce} />
			</body>
		</html>
	)
}

function App() {
	const data = useLoaderData<typeof loader>()
	const nonce = useNonce()
	const user = useOptionalUser()
	const theme = useTheme()

	const navigationLinks: NavigationLink[] = [
		{
			name: 'Centro de Control',
			path: 'control-center',
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
			name: 'Promociones',
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
						navigationLinks={navigationLinks}
						secondaryLinks={secondaryLinks}
						businessName={businessName}
					/>
				)}
				<div className="flex-1 overflow-auto ">
					<header className="sticky top-0 z-50 flex h-[4rem] items-center justify-between gap-8 border-b-[1px] border-foreground/5 bg-secondary p-8">
						<Sheet>
							<SheetTrigger asChild>
								<Button size={'icon'} variant={'outline'} className="xl:hidden">
									<Icon className="text-xl" name="layout-sidebar-left-expand" />
									<span className="sr-only">Expandir Menu</span>
								</Button>
							</SheetTrigger>
							<SheetContent side="left" className="sm:max-w-xs">
								<nav className=" flex h-full flex-col justify-around gap-6">
									<div className="flex flex-col gap-2">
										{navigationLinks.map(link => {
											return (
												<SheetClose
													className="group flex"
													asChild
													key={link.name}
												>
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
												<SheetClose
													className="group flex"
													asChild
													key={link.name}
												>
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
									<div className="flex flex-col gap-2">
										<ThemeSwitch
											userPreference={data.requestInfo.userPrefs.theme}
										/>
										{user && <UserDropdown />}
									</div>
								</nav>
							</SheetContent>
						</Sheet>

						<NavLink
							className={({ isActive }) =>
								cn(
									'text-md flex w-full select-none items-center  justify-center gap-3 rounded-sm bg-popover px-12 py-2 font-bold ring-2 ring-primary-foreground transition-colors hover:bg-primary/60 *:hover:text-foreground sm:w-fit',
									isActive && 'bg-primary/60 *:text-foreground ',
								)
							}
							to={'sell'}
						>
							<Icon
								size="md"
								className="text-primary"
								name={'circle-dollar-sign'}
							/>

							<span className="hidden md:flex">{'Punto de Venta'}</span>
						</NavLink>
						<div className=" hidden gap-2 xl:flex">
							<ThemeSwitch userPreference={data.requestInfo.userPrefs.theme} />
							{user && <UserDropdown />}
						</div>
					</header>
					<main className="h-[calc(99%-4rem)] overflow-y-auto  p-4 sm:p-5 md:p-7 ">
						<Outlet />
					</main>
				</div>
			</div>
			<EpicToaster toast={data.toast} />
			<EpicProgress />
		</Document>
	)
}

function AppWithProviders() {
	const data = useLoaderData<typeof loader>()
	return (
		<AuthenticityTokenProvider token={data.csrfToken}>
			<HoneypotProvider {...data.honeyProps}>
				<App />
			</HoneypotProvider>
		</AuthenticityTokenProvider>
	)
}

export default withSentry(AppWithProviders)

function UserDropdown() {
	const user = useUser()
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="ghost">
					<Link
						to={`/users/${user.username}`}
						// this is for progressive enhancement
						onClick={e => e.preventDefault()}
						className="flex items-center gap-2"
					>
						<img
							className="h-8 w-8 rounded-full border-2 border-foreground/20 object-cover p-[2px]"
							alt={user.name ?? user.username}
							src={getUserImgSrc(user.image?.id)}
						/>
						<div className="flex flex-col sm:hidden md:flex">
							<span className="text-body-sm font-bold">
								{user.name ?? user.username}
							</span>
							<span className="text-body-xs font-bold text-foreground/60">
								Vendedor
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

/**
 * @returns the user's theme preference, or the client hint theme if the user
 * has not set a preference.
 */
export function useTheme() {
	const hints = useHints()
	const requestInfo = useRequestInfo()
	const optimisticMode = useOptimisticThemeMode()
	if (optimisticMode) {
		return optimisticMode === 'system' ? hints.theme : optimisticMode
	}
	return requestInfo.userPrefs.theme ?? hints.theme
}

/**
 * If the user's changing their theme mode preference, this will return the
 * value it's being changed to.
 */
export function useOptimisticThemeMode() {
	const fetchers = useFetchers()
	const themeFetcher = fetchers.find(f => f.formAction === '/')

	if (themeFetcher && themeFetcher.formData) {
		const submission = parse(themeFetcher.formData, {
			schema: ThemeFormSchema,
		})
		return submission.value?.theme
	}
}

function ThemeSwitch({ userPreference }: { userPreference?: Theme | null }) {
	const fetcher = useFetcher<typeof action>()

	const [form] = useForm({
		id: 'theme-switch',
		lastSubmission: fetcher.data?.submission,
	})

	const optimisticMode = useOptimisticThemeMode()
	const mode = optimisticMode ?? userPreference ?? 'system'
	const nextMode =
		mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system'
	const modeLabel = {
		light: (
			<Icon name="sun">
				<span className="sr-only">Light</span>
			</Icon>
		),
		dark: (
			<Icon name="moon">
				<span className="sr-only">Dark</span>
			</Icon>
		),
		system: (
			<Icon name="laptop">
				<span className="sr-only">System</span>
			</Icon>
		),
	}

	return (
		<fetcher.Form method="POST" {...form.props}>
			<input type="hidden" name="theme" value={nextMode} />
			<div className="flex gap-2">
				<button
					type="submit"
					className="flex h-8 w-8 cursor-pointer items-center justify-center"
				>
					{modeLabel[mode]}
				</button>
			</div>
			<ErrorList errors={form.errors} id={form.errorId} />
		</fetcher.Form>
	)
}

function SideBar({
	navigationLinks,
	secondaryLinks,
	businessName,
	businessLogo,
}: {
	navigationLinks: NavigationLink[]
	secondaryLinks: NavigationLink[]
	businessName: string
	businessLogo?: string
}) {
	return (
		<div className="relative hidden w-[17.5rem]  flex-col border-r-[1px] border-foreground/5 bg-muted px-4 pb-8 pt-3 xl:flex ">
			<div className="flex select-none items-center gap-2 ">
				<div className="flex size-[3.5rem] rounded-md bg-foreground/40"></div>
				<div>
					<h1 className="text-2xl font-black uppercase tracking-tight">
						{/* TODO: Change to variable appName or something */}
						Ventesca
					</h1>
					<h3 className="text-muted-foreground">{businessName}</h3>
				</div>
			</div>
			<nav className="mt-8 flex h-full flex-col  justify-between gap-8">
				<div className="flex flex-col gap-2">
					{navigationLinks.map(link => {
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
			</nav>
		</div>
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
