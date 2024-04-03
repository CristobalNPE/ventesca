import { json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { ItemEditor, action } from './__item-editor.tsx'

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
		<div className="grid grid-cols-1 sm:grid-cols-2 ">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center text-center md:text-left">
						<Icon name="plus" className="mr-2" />
						Ingresar nuevo articulo
					</CardTitle>
				</CardHeader>
				<CardContent>
					<ItemEditor providers={providers} categories={categories} />
				</CardContent>
			</Card>
		</div>
	)
}
