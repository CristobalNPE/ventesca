import { Spacer } from '#app/components/spacer.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'


import { requireUserWithRole } from '#app/utils/permissions.server.js'
import { userHasRole, useUser } from '#app/utils/user.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)


	const business = await prisma.business.findUniqueOrThrow({
		where: { id: businessId },
	})

	return json({ business })
}

export default function SuppliersRoute() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	const { business } = useLoaderData<typeof loader>()

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Detalles de la empresa</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="text-3xl">{business.name}</div>
		</main>
	)
}
