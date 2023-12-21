import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { ProviderEditor, action } from './__provider-editor.tsx'

export { action }
export async function loader({ params }: LoaderFunctionArgs) {
	// const userId = await requireUserId(request)

	const provider = await prisma.provider.findFirst({
		select: {
			id: true,
			rut: true,
			name: true,
			address: true,
			city: true,
			fantasyName: true,
			phone: true,
			fax: true,
		},
		where: {
			id: params.providerId,
		},
	})
	invariantResponse(provider, 'Not found', { status: 404 })

	return json({ provider })
}

export default function ProviderEdit() {
	const { provider } = useLoaderData<typeof loader>()

	return (
		<div className="flex max-w-[35rem] flex-col  rounded-md bg-secondary">
			<div className="flex gap-4 rounded-t-md bg-primary/50 p-3 text-2xl">
				<Icon name="route" />
				<h1>Modificar Proveedor</h1>
			</div>
			<ProviderEditor provider={provider} />
		</div>
	)
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
