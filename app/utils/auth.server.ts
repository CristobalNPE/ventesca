import { type Connection, type Password, type User } from '@prisma/client'
import { redirect } from '@remix-run/node'
import bcrypt from 'bcryptjs'
import { Authenticator } from 'remix-auth'
import { safeRedirect } from 'remix-utils/safe-redirect'
import { connectionSessionStorage, providers } from './connections.server.ts'
import { prisma } from './db.server.ts'
import { combineHeaders, downloadFile } from './misc.tsx'
import { type ProviderUser } from './providers/provider.ts'
import { authSessionStorage } from './session.server.ts'
import { faker } from '@faker-js/faker'

export const SESSION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30
export const getSessionExpirationDate = () =>
	new Date(Date.now() + SESSION_EXPIRATION_TIME)

export const sessionKey = 'sessionId'

export const authenticator = new Authenticator<ProviderUser>(
	connectionSessionStorage,
)

for (const [providerName, provider] of Object.entries(providers)) {
	authenticator.use(provider.getAuthStrategy(), providerName)
}

export async function getBusinessId(userId: string) {
	const { businessId } = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { businessId: true },
	})

	return businessId
}

export async function getUserId(request: Request) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	if (!sessionId) return null
	const session = await prisma.session.findUnique({
		select: { user: { select: { id: true } } },
		where: { id: sessionId, expirationDate: { gt: new Date() } },
	})
	if (!session?.user) {
		throw redirect('/', {
			headers: {
				'set-cookie': await authSessionStorage.destroySession(authSession),
			},
		})
	}
	return session.user.id
}

export async function requireUserId(
	request: Request,
	{ redirectTo }: { redirectTo?: string | null } = {},
) {
	const userId = await getUserId(request)
	if (!userId) {
		const requestUrl = new URL(request.url)
		redirectTo =
			redirectTo === null
				? null
				: redirectTo ?? `${requestUrl.pathname}${requestUrl.search}`
		const loginParams = redirectTo ? new URLSearchParams({ redirectTo }) : null
		const loginRedirect = ['/login', loginParams?.toString()]
			.filter(Boolean)
			.join('?')
		throw redirect(loginRedirect)
	}
	return userId
}

export async function requireAnonymous(request: Request) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/')
	}
}

export async function login({
	username,
	password,
	browserInfo,
}: {
	username: User['username']
	password: string
	browserInfo: {
		browser: string
		version: string
		os: string
	}
}) {
	const user = await verifyUserPassword({ username }, password)
	if (!user) return null

	const session = await prisma.session.create({
		select: { id: true, expirationDate: true, userId: true },
		data: {
			os: browserInfo.os,
			browser: browserInfo.browser,
			version: browserInfo.version ?? 'Version Desconocida',
			expirationDate: getSessionExpirationDate(),
			userId: user.id,
		},
	})
	return session
}

export async function resetUserPassword({
	username,
	password,
}: {
	username: User['username']
	password: string
}) {
	const hashedPassword = await getPasswordHash(password)
	return prisma.user.update({
		where: { username },
		data: {
			password: {
				update: {
					hash: hashedPassword,
				},
			},
		},
	})
}

export async function signup({
	email,
	username,
	password,
	name,
	browserInfo,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	password: string
	browserInfo: {
		browser: string
		version: string
		os: string
	}
}) {
	const hashedPassword = await getPasswordHash(password)

	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			os: browserInfo.os,
			browser: browserInfo.browser,
			version: browserInfo.version ?? 'Version Desconocida',
			user: {
				create: {
					email: email.toLowerCase(),
					username: username.toLowerCase(),
					name,
					roles: { connect: { name: 'Administrador' } },
					password: {
						create: {
							hash: hashedPassword,
						},
					},
					business: { create: { name: `Empresa de ${name}` } },
				},
			},
		},
		select: {
			id: true,
			expirationDate: true,
			user: { select: { businessId: true } },
		},
	})

	//create default supplier and category
	await getDefaultSupplier({
		name: name ?? username,
		email,
		businessId: session.user.businessId,
	})
	await getDefaultCategory({ businessId: session.user.businessId })

	const { id, expirationDate } = session
	return { id, expirationDate }
}

export async function signupWithConnection({
	email,
	username,
	name,
	providerId,
	providerName,
	imageUrl,
}: {
	email: User['email']
	username: User['username']
	name: User['name']
	providerId: Connection['providerId']
	providerName: Connection['providerName']
	imageUrl?: string
}) {
	const session = await prisma.session.create({
		data: {
			expirationDate: getSessionExpirationDate(),
			user: {
				create: {
					business: { create: { name: `Empresa de ${name}` } },
					email: email.toLowerCase(),
					username: username.toLowerCase(),
					name,
					roles: { connect: { name: 'user' } },
					connections: { create: { providerId, providerName } },
					image: imageUrl
						? { create: await downloadFile(imageUrl) }
						: undefined,
				},
			},
		},
		select: { id: true, expirationDate: true },
	})

	return session
}

export async function logout(
	{
		request,
		redirectTo = '/',
	}: {
		request: Request
		redirectTo?: string
	},
	responseInit?: ResponseInit,
) {
	const authSession = await authSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const sessionId = authSession.get(sessionKey)
	// if this fails, we still need to delete the session from the user's browser
	// and it doesn't do any harm staying in the db anyway.
	if (sessionId) {
		// the .catch is important because that's what triggers the query.
		// learn more about PrismaPromise: https://www.prisma.io/docs/orm/reference/prisma-client-reference#prismapromise-behavior
		void prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => {})
	}
	throw redirect(safeRedirect(redirectTo), {
		...responseInit,
		headers: combineHeaders(
			{ 'set-cookie': await authSessionStorage.destroySession(authSession) },
			responseInit?.headers,
		),
	})
}

export async function getPasswordHash(password: string) {
	const hash = await bcrypt.hash(password, 10)
	return hash
}

export async function verifyUserPassword(
	where: Pick<User, 'username'> | Pick<User, 'id'>,
	password: Password['hash'],
) {
	const userWithPassword = await prisma.user.findUnique({
		where,
		select: { id: true, password: { select: { hash: true } }, isActive: true },
	})

	if (!userWithPassword || !userWithPassword.password) {
		return null
	}

	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

	//Temporary put isActive check here to avoid login in blocked users.

	if (!isValid || !userWithPassword.isActive) {
		return null
	}

	return { id: userWithPassword.id }
}

// export async function verifyUserPassword(
// 	where: Pick<User, 'username'> | Pick<User, 'id'>,
// 	password: Password['hash'],
// ) {
// 	const userWithPassword = await prisma.user.findUnique({
// 		where,
// 		select: { id: true, password: { select: { hash: true } } },
// 	})

// 	if (!userWithPassword || !userWithPassword.password) {
// 		return null
// 	}

// 	const isValid = await bcrypt.compare(password, userWithPassword.password.hash)

// 	if (!isValid) {
// 		return null
// 	}

// 	return { id: userWithPassword.id }
// }

//!MOVE THIS OUT OF HERE?

export async function getDefaultCategory({
	businessId,
}: {
	businessId: string
}) {
	const defaultCategory = await prisma.category.findFirst({
		where: { businessId, isEssential: true },
	})

	if (defaultCategory) {
		return defaultCategory
	}

	return await prisma.category.create({
		data: {
			colorCode: faker.color.rgb(),
			code: 0,
			description: 'General',
			business: { connect: { id: businessId } },
			isEssential: true,
		},
	})
}

export async function getDefaultSupplier({
	businessId,
	name,
	email,
}: {
	businessId: string
	name: string
	email: string
}) {
	const defaultSupplier = await prisma.supplier.findFirst({
		where: { businessId, isEssential: true },
	})

	if (defaultSupplier) {
		return defaultSupplier
	}

	return await prisma.supplier.create({
		data: {
			code: 0,
			rut: 'Sin Datos',
			name,
			address: 'Sin Datos',
			city: 'Sin Datos',
			fantasyName: `Proveedor Propio`,
			phone: 'Sin Datos',
			email,
			business: { connect: { id: businessId } },
			isEssential: true,
		},
	})
}
