import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { OrderEditor } from './__order-editor'
import { action } from './__order-editor.server'

export { action }
export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const order = await prisma.order.findFirst({
		where: {
			id: params.reportId,
			businessId,
		},
		select: {
			id: true,
			status: true,
			paymentMethod: true,
			directDiscount: true,
		},
	})
	invariantResponse(order, 'Not found', { status: 404 })

	return json({ order })
}

export default function ProviderEdit() {
	const { order } = useLoaderData<typeof loader>()

	return <OrderEditor order={order} />
}
export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>Transacción con ID "{params.reportId}" no existe</p>
				),
				403: () => <p>Sin autorización.</p>,
			}}
		/>
	)
}
