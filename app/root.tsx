import {
	json,
	type HeadersFunction,
	type LinksFunction,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node'
import {
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useNavigate,
} from '@remix-run/react'
import { withSentry } from '@sentry/remix'
import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { HoneypotProvider } from 'remix-utils/honeypot/react'
import { Key } from 'ts-key-enum'
import { href as iconsHref } from '#app/components/ui/icon.tsx'
import { combineHeaders, getDomainUrl } from '#app/utils/misc.tsx'

import { GeneralErrorBoundary } from './components/error-boundary.tsx'
import { MainLayout } from './components/layout/main-layout.tsx'
import { EpicProgress } from './components/progress-bar.tsx'

import { useToast } from './components/toaster.tsx'

import { EpicToaster } from './components/ui/sonner.tsx'
import { ProductPriceReader } from './routes/_inventory+/inventory.price-reader.tsx'
import { useTheme } from './routes/resources+/theme-switch.tsx'
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
import { useOptionalUser } from './utils/user.ts'

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
							business: { select: { name: true, image: true } },
							image: { select: { id: true } },
							roles: {
								select: {
									name: true,
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
		<html lang="es" className={`${theme} `}>
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
	const theme = useTheme()
	const navigate = useNavigate()
	const [openProductPriceReader, setOpenProductPriceReader] = useState(false)

	useToast(data.toast)
	useHotkeys(Key.F1, () => navigate('/pos'), { preventDefault: true })
	useHotkeys(Key.F4, () => setOpenProductPriceReader(true), {
		preventDefault: true,
		enableOnFormTags: true,
	})

	return (
		<Document nonce={nonce} theme={theme} env={data.ENV}>
			{user ? (
				<MainLayout>
					<Outlet />
				</MainLayout>
			) : (
				<Outlet />
			)}
			<EpicToaster closeButton position="top-center" theme={theme} />
			<EpicProgress />
			{user ? (
				<ProductPriceReader
					open={openProductPriceReader}
					setOpen={setOpenProductPriceReader}
				/>
			) : null}
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
