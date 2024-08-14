import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { MetaFunction, useLoaderData } from '@remix-run/react'

import { BusinessEditor } from './__business-editor.tsx'
import { action } from './__business-editor.server.tsx'
import { ContentLayout } from '#app/components/layout/content-layout.js'

export { action }
export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const business = await prisma.business.findFirst({
		where: {
			id: businessId,
		},
		select: {
			id: true,
			name: true,
			address: true,
			email: true,
			phone: true,
			thanksMessage: true,
		},
	})
	invariantResponse(business, 'Not found', { status: 404 })

	return json({ business })
}

export default function ProviderEdit() {
	const { business } = useLoaderData<typeof loader>()

	return (
		<ContentLayout title="Modificar datos de la empresa">
			<BusinessEditor business={business} />
		</ContentLayout>
	)
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	return [
		{
			title: `Ventesca | Modificar datos de la empresa`,
		},
	]
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>Sin autorización.</p>,
			}}
		/>
	)
}
