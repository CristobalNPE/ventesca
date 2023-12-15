import { Input } from '#app/components/ui/input.tsx'
import { SelectModal } from '#app/components/ui/select-modal.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { calculateDV } from '#app/utils/misc.tsx'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { useState } from 'react'
import { ItemEditor, action } from './__item-editor.tsx'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
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

	const [providerFilter, setProviderFilter] = useState('')
	const handleProviderFilterChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setProviderFilter(e.target.value)
	}

	const filteredProviders = providers.filter(provider => {
		return (
			provider.name.toLowerCase().includes(providerFilter.toLowerCase()) ||
			provider.rut.includes(providerFilter)
		)
	})
	const [categoryFilter, setCategoryFilter] = useState('')
	const handleCategoryFilterChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setCategoryFilter(e.target.value)
	}
	const filteredCategories = categories.filter(category => {
		return (
			category.description
				.toLowerCase()
				.includes(categoryFilter.toLowerCase()) ||
			category.code.includes(categoryFilter)
		)
	})

	const providerAndCategorySelected = provider && category

	return (
		<div className="flex max-w-[35rem] flex-col  rounded-md bg-secondary">
			<div className="flex gap-2 rounded-t-md bg-primary/50 p-3 text-2xl">
				<Icon name="route" />
				<h1>Ingreso de articulo</h1>
			</div>
			<div className="flex flex-col gap-4 p-4">
				<SelectModal title="Proveedor" selected={provider?.name}>
					<Input
						type="text"
						className="mb-4 w-full"
						onChange={handleProviderFilterChange}
						defaultValue={providerFilter}
					/>
					<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
						{filteredProviders.map(provider => (
							<div
								key={provider.id}
								className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/50"
								onClick={() => setProvider(provider)}
							>
								<span className="w-[7rem]">
									{provider.rut}-{calculateDV(provider.rut)}
								</span>{' '}
								<span className="border-l-2 pl-2">{provider.name}</span>
							</div>
						))}
					</div>
					<div className="absolute bottom-7 left-7 mt-4  flex w-[20rem] items-center justify-between">
						<span className="text-xl text-foreground">{provider?.name}</span>
						<Button
							onClick={() => setProvider(null)}
							variant={'ghost'}
							size={'icon'}
						>
							<Icon name="cross-1" />
						</Button>
					</div>
				</SelectModal>
				<SelectModal title="Categoría" selected={category?.description}>
					<Input
						type="text"
						className="mb-4 w-full"
						onChange={handleCategoryFilterChange}
						defaultValue={categoryFilter}
					/>
					<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
						{filteredCategories.map(category => (
							<div
								key={category.id}
								className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/50"
								onClick={() => setCategory(category)}
							>
								<span className="w-[7rem]">{category.code}</span>{' '}
								<span className="border-l-2 pl-2">{category.description}</span>
							</div>
						))}
					</div>
					<div className="absolute bottom-7 left-7 mt-4  flex w-[20rem] items-center justify-between">
						<span className="text-xl text-foreground">
							{category?.description}
						</span>
						<Button
							onClick={() => setCategory(null)}
							variant={'ghost'}
							size={'icon'}
						>
							<Icon name="cross-1" />
						</Button>
					</div>
				</SelectModal>
				{providerAndCategorySelected && (
					<ItemEditor providerId={provider.id} categoryId={category.id} />
				)}
			</div>
		</div>
	)
}
