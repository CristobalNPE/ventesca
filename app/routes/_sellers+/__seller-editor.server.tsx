import { getBusinessId, getPasswordHash } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { ActionFunctionArgs, json, redirect } from '@remix-run/node'
import {
	createSellerActionIntent,
	SellerInfoEditSchema,
} from './__seller-editor'
import { createId } from '@paralleldrive/cuid2'
import * as E from '@react-email/components'
import { sendEmail } from '#app/utils/email.server.ts'

type SellersActionArgs = {
	businessId: string
	formData: FormData
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')

	invariantResponse(intent, 'Intent should be defined.')

	switch (intent) {
		case createSellerActionIntent: {
			return await createSellerAction({ formData, businessId })
		}
	}
}

async function createSellerAction({ businessId, formData }: SellersActionArgs) {
	const submission = await parseWithZod(formData, {
		schema: SellerInfoEditSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { id, username, name, email } = submission.value

	const tempPassword = `${username.toLowerCase()}-${createId().slice(-5)}`
	const hashedPassword = await getPasswordHash(tempPassword)

	const business = await prisma.business.findUniqueOrThrow({
		where: { id: businessId },
		select: { name: true },
	})

	const response = await sendEmail({
		to: email,
		subject: `Acceso a sistema - ${business.name}`,
		react: (
			<WelcomeSellerEmail
				businessName={business.name}
				user={name}
				userName={username}
				password={tempPassword}
			/>
		),
	})

	if (response.status === 'success') {
		const seller = await prisma.user.upsert({
			select: { id: true },
			where: { id: id ?? '__new_seller__' },
			create: {
				name,
				username: username.toLowerCase(),
				email: email.toLowerCase(),
				isActive: true,
				business: { connect: { id: businessId } },
				password: {
					create: {
						hash: hashedPassword,
					},
				},
				roles: { connect: { name: 'Vendedor' } },
			},
			update: {
				name,
				username,
				email,
			},
		})

		return redirect(`/sellers/${seller.id}`)
	} else {
		return json(
			{
				result: submission.reply({ formErrors: [response.error.message] }),
			},
			{
				status: 500,
			},
		)
	}
}

function WelcomeSellerEmail({
	businessName,
	user,
	userName,
	password,
}: {
	businessName: string
	user: string
	userName: string
	password: string
}) {
	return (
		<E.Html lang="es" dir="ltr">
			<E.Container>
				<h1>
					<E.Text>
						Acceso a sistema - <strong>{businessName}</strong>
					</E.Text>
				</h1>
				<p>
					<E.Text>
						<strong>{user}</strong>, su cuenta para acceder al sistema de ventas
						perteneciente a <strong>{businessName}</strong> ha sido activada.
					</E.Text>
				</p>
				<p>
					<E.Text>Estas son sus credenciales: </E.Text>
					<E.Text>
						Nombre de usuario: <strong>{userName}</strong>
					</E.Text>
					<E.Text>
						Contraseña: <strong>{password}</strong>
					</E.Text>
				</p>
				{/* <E.Link href={onboardingUrl}>{onboardingUrl}</E.Link> */}
			</E.Container>
		</E.Html>
	)
}
