import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { prisma } from './db.server.ts'

export const TRANSACTION_EXPIRATION_TIME = 1000 * 60 * 60 * 24 * 30

export const transactionSessionStorage = createCookieSessionStorage({
	cookie: {
		name: 'sv_transaction',
		sameSite: 'lax',
		path: '/system',
		httpOnly: true,
		secrets: process.env.SESSION_SECRET.split(','),
		secure: process.env.NODE_ENV === 'production',
		expires: new Date(Date.now() + TRANSACTION_EXPIRATION_TIME),
	},
})

export const transactionKey = 'transactionId'

export async function getTransactionId(request: Request) {
	const transactionSession = await transactionSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	const transactionId = transactionSession.get(transactionKey)
	if (!transactionId) return null
	const transaction = await prisma.transaction.findUnique({
		select: { id: true },
		where: { id: transactionId },
	})
	if (!transaction) {
		throw redirect('/system/sell', {
			headers: {
				'set-cookie':
					await transactionSessionStorage.destroySession(transactionSession),
			},
		})
	}
	return transaction.id
}

export async function destroyCurrentTransaction(request: Request) {
	const transactionSession = await transactionSessionStorage.getSession(
		request.headers.get('cookie'),
	)
	return transactionSessionStorage.destroySession(transactionSession)
}

/*

if (!transactionId) return null
	const transaction = await prisma.transaction.findUnique({
		select: { id: true },
		where: { id: transactionId },
	})
	if (!transaction) {
		throw redirect('/', {
			headers: {
				'set-cookie':
					await transactionSessionStorage.destroySession(transactionSession),
			},
		})
	}
	return transaction.id
*/
