import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { action } from './__supplier-editor.server.tsx'
import { SupplierEditor } from './__supplier-editor.tsx'

export { action }
export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const supplier = await prisma.supplier.findFirst({
		select: {
			id: true,
			rut: true,
			name: true,
			address: true,
			city: true,
			fantasyName: true,
			phone: true,
			email: true,
		},
		where: {
			id: params.supplierId,
			businessId,
		},
	})
	invariantResponse(supplier, 'Not found', { status: 404 })

	return json({ supplier })
}

export default function ProviderEdit() {
	const { supplier } = useLoaderData<typeof loader>()

	return <SupplierEditor supplier={supplier} />
}
export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => <p>Articulo con ID "{params.itemId}" no existe</p>,
			}}
		/>
	)
}
