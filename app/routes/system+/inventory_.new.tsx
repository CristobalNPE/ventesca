import { SearchBar } from '#app/components/SearchBar.tsx'
import { Stepper } from '#app/components/ui/stepper.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { calculateDV } from '#app/utils/misc.tsx'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import { ItemEditor, action } from './__item-editor.tsx'
import { SelectModal } from '#app/components/ui/select-modal.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const providerSearch = url.searchParams.get('provider')
	const categorySearch = url.searchParams.get('category')

	if (providerSearch) {
		const providers = await prisma.provider.findMany({
			select: { id: true, rut: true, name: true, fantasyName: true },
			where: { rut: { contains: providerSearch } },
		})

		const categories = null
		return json({ providers, categories })
	}

	if (categorySearch) {
		const categories = await prisma.family.findMany({
			select: { id: true, code: true, description: true },
			where: { description: { contains: categorySearch } },
		})
		const providers = null
		return json({ categories, providers })
	}

	return json({ providers: null, categories: null })
}

export { action }

type Provider = {
	id: string
	rut: string
	name: string
	fantasyName: string
}

type Category = {
	id: string
	code: string
	description: string
}

export default function CreateItem() {
	const { providers, categories } = useLoaderData<typeof loader>()
	const [provider, setProvider] = useState<Provider | null>(null)
	const [category, setCategory] = useState<Category | null>(null)

	//save provider and category in state, then send it to the server via params

	return (
		<div className="max-w-[45rem]">
			<Stepper
				canProceed={{
					1: !!provider,
					2: !!category,
				}}
				title="Registro de nuevo articulo"
			>
				<Stepper.Step title="Seleccione un Proveedor">
					<div className="h-[3rem] text-center text-2xl font-bold">
						{provider?.name}
					</div>
					<div className="flex w-full flex-col items-center justify-center">
						<SearchBar
							autoFocus
							autoSubmit
							queryName="provider"
							status={'idle'}
							formAction={'/system/inventory/new'}
							label={'RUT Proveedor'}
							icon={'magnifying-glass'}
						/>
						{providers && (
							<ul className="my-4 rounded-md bg-background/70 p-4">
								{providers.length > 0 ? (
									providers.map(provider => (
										<li
											className="flex cursor-pointer rounded-md p-2 hover:bg-primary/40"
											onClick={() => setProvider(provider)}
											key={provider.id}
										>
											<span className="flex min-w-[8rem] font-bold tracking-wider">
												{provider.rut}-{calculateDV(provider.rut)}
											</span>{' '}
											<span className="border-l-2 pl-4  ">{provider.name}</span>
										</li>
									))
								) : (
									<h1>Sin coincidencias.</h1>
								)}
							</ul>
						)}
					</div>
				</Stepper.Step>
				<Stepper.Step title="Seleccione una Categoría">
					<div className="h-[3rem] text-center text-2xl font-bold">
						{category?.code} | {category?.description}
					</div>
					<div className="flex w-full flex-col items-center justify-center">
						<SearchBar
							autoFocus
							autoSubmit
							queryName="category"
							status={'idle'}
							formAction={'/system/inventory/new'}
							label={'Nombre categoría'}
							icon={'magnifying-glass'}
						/>
						{categories && (
							<ul className="my-4 rounded-md bg-background/70 p-4">
								{categories.length > 0 ? (
									categories.map(category => (
										<li
											className="flex cursor-pointer rounded-md p-2 hover:bg-primary/40"
											onClick={() => setCategory(category)}
											key={category.id}
										>
											<span className="flex min-w-[8rem] font-bold tracking-wider">
												{category.code}
											</span>{' '}
											<span className="border-l-2 pl-4  ">
												{category.description}
											</span>
										</li>
									))
								) : (
									<h1>Sin coincidencias.</h1>
								)}
							</ul>
						)}
					</div>
				</Stepper.Step>
				<Stepper.Step title="Complete la información del articulo">
					<div className="flex justify-center">
						<ItemEditor
							providerId={provider?.id ?? ''}
							categoryId={category?.id ?? ''}
						/>
					</div>
				</Stepper.Step>
			</Stepper>

			<SelectModal title='Proveedor'>
				
			</SelectModal>
		</div>
	)
}
