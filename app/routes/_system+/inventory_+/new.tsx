import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { json } from '@remix-run/node'
import { ItemEditor, action } from './__item-editor.tsx'
import { useLoaderData } from '@remix-run/react'

export { action }

export async function loader() {
	const providers = await prisma.provider.findMany({
		select: { id: true, rut: true, name: true, fantasyName: true },
		orderBy: { name: 'asc' },
	})

	const categories = await prisma.family.findMany({
		select: { id: true, code: true, description: true },
		orderBy: { code: 'asc' },
	})

	return json({ providers, categories })
}

export default function CreateItem() {
	const { providers, categories } = useLoaderData<typeof loader>()

	return (
		<div className="flex max-w-[35rem] flex-col  rounded-md bg-secondary">
			<div className="flex gap-4 rounded-t-md bg-primary p-3 text-2xl text-background">
				<Icon name="route" />
				<h1>Ingresar nuevo articulo</h1>
			</div>
			<ItemEditor providers={providers} categories={categories} />
		</div>
	)
}
