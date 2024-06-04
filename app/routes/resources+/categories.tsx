import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { useState } from 'react'

import { Input } from '#app/components/ui/input.tsx'
import { SelectModal } from '#app/components/ui/select-modal.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'

export type SelectedCategory = {
	id: string
	description: string
}

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)
	const url = new URL(request.url)
	const query = url.searchParams.get('query')

	if (!query) {
		const categories = await prisma.category.findMany({
			select: {
				id: true,
				description: true,
				code: true,
			},
			orderBy: { description: 'asc' },
		})
		return json({ categories })
	}

	const categories = await prisma.category.findMany({
		where: {
			OR: [{ description: { contains: query } }],
		},
		select: {
			id: true,
			description: true,
			code: true,
		},
		orderBy: { description: 'asc' },
	})

	return json({ categories })
}

export function CategorySelectBox({
	newSelectedCategory,
	setNewSelectedCategory,
}: {
	newSelectedCategory: SelectedCategory | null
	setNewSelectedCategory: React.Dispatch<
		React.SetStateAction<SelectedCategory | null>
	>
}) {
	const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
	const categoryFetcher = useFetcher<typeof loader>({
		key: 'category-selectBox',
	})

	const categories = categoryFetcher.data?.categories ?? []

	return (
		<SelectModal
			open={categoryDialogOpen}
			onOpenChange={setCategoryDialogOpen}
			title="nueva Categoría"
			selected={newSelectedCategory?.description}
		>
			<Input
				autoFocus
				placeholder="Búsqueda por descripción..."
				type="text"
				className="mb-4 w-full"
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					categoryFetcher.submit(
						{ query: e.target.value },
						{ method: 'GET', action: '/resources/categories' },
					)
				}
			/>
			<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
				{categories.map(category => (
					<div
						key={category.id}
						className="text-md flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/20"
						onClick={() => {
							setNewSelectedCategory(category)
							categoryFetcher.submit(
								{ query: '' },
								{ method: 'GET', action: '/resources/categories' },
							)

							setCategoryDialogOpen(false)
						}}
					>
						<span className="w-[7rem] font-semibold text-muted-foreground">
							{category.code}
						</span>{' '}
						<span className="border-l-2 pl-2">{category.description}</span>
					</div>
				))}
			</div>
		</SelectModal>
	)
}
