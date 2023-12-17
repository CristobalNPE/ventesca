import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { useLoaderData } from '@remix-run/react'
import { Icon } from '#app/components/ui/icon.tsx'
import { ItemEditor, action } from './__item-editor.tsx'

export { action }
export async function loader({ params }: LoaderFunctionArgs) {
	// const userId = await requireUserId(request)
	const providers = await prisma.provider.findMany({
		select: { id: true, rut: true, name: true, fantasyName: true },
		orderBy: { name: 'asc' },
	})

	const categories = await prisma.family.findMany({
		select: { id: true, code: true, description: true },
		orderBy: { code: 'asc' },
	})

	const item = await prisma.item.findFirst({
		select: {
			id: true,
			code: true,
			name: true,
			price: true,
			sellingPrice: true,
			stock: true,
			providerId: true,
			familyId: true,
		},
		where: {
			id: params.itemId,
		},
	})
	invariantResponse(item, 'Not found', { status: 404 })

	return json({ providers, categories, item })
}

export default function ItemEdit() {
	const { providers, categories, item } = useLoaderData<typeof loader>()

	return (
		<div className="flex max-w-[35rem] flex-col  rounded-md bg-secondary">
			<div className="flex gap-4 rounded-t-md bg-primary/50 p-3 text-2xl">
				<Icon name="route" />
				<h1>Modificar articulo</h1>
			</div>
			<ItemEditor providers={providers} categories={categories} item={item} />
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
