import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { useFetcher, useSearchParams } from '@remix-run/react'
import { useEffect, useId, useState } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'


export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	const url = new URL(request.url)
	const categorySearch = url.searchParams.get('category-search')

	const categorySearchAsNumber = Number(categorySearch) || null

	if (categorySearchAsNumber) {
		const categories = await prisma.family.findMany({
			select: { id: true, code: true, description: true },
			where: { code: categorySearchAsNumber },

			orderBy: { description: 'asc' },
			take: 5,
		})
		return json({ categories })
	}

	const categories = await prisma.family.findMany({
		select: { id: true, code: true, description: true },
		where: { description: { contains: categorySearch ?? '' } },

		orderBy: { description: 'asc' },
		take: 5,
	})
	return json({ categories })
}

export function CategoryPicker({
	setAddedCategoriesIds,
}: {
	setAddedCategoriesIds: (ids: string) => void
}) {
	const [isSearchBoxOpen, setIsSearchBoxOpen] = useState(false)
	const id = useId()
	const [searchParams] = useSearchParams()
	const fetcher = useFetcher<typeof loader>({ key: 'category-search' })
	const isSubmitting = fetcher.state !== 'idle'

	const categories = fetcher.data?.categories ?? []
	type Category = (typeof categories)[0]

	const [addedCategories, setAddedCategories] = useState<Category[]>([])

	useEffect(() => {
		setAddedCategoriesIds(addedCategories.map(i => i.id).join(','))
	}, [addedCategories, setAddedCategoriesIds])

	const addCategory = (category: Category) => {
		if (!addedCategories.find(i => i.id === category.id)) {
			setAddedCategories([...addedCategories, category])
		}
	}

	const removeCategory = (category: Category) => {
		setAddedCategories(addedCategories.filter(i => i.id !== category.id))
	}

	console.log(addedCategories)
	console.log(addedCategories.length)
	const addedCategoriesIds = addedCategories.map(i => i.id).join(',')
	console.log(addedCategoriesIds)

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		fetcher.submit(form)
	}, 400)

	return (
		<div className="relative flex w-full gap-2">
			<fetcher.Form
				autoComplete="off"
				method="GET"
				action="/discounts/category-picker"
				className="flex w-[16.5rem] items-center overflow-hidden rounded-md border border-input bg-background"
				onChange={e => {
					handleFormChange(e.currentTarget)
					setIsSearchBoxOpen(true)
				}}
			>
				<div className="flex-1 ">
					<Label htmlFor={id} className="sr-only">
						Search
					</Label>
					<Input
						type="text"
						name="category-search"
						id={id}
						defaultValue={searchParams.get('category-search') ?? ''}
						placeholder="Agregar categoría"
						className="w-full border-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
					/>
				</div>
				<StatusButton
					variant={'outline'}
					type="submit"
					status={isSubmitting ? 'pending' : 'idle'}
					className="flex w-fit items-center justify-center border-none"
					size="sm"
				>
					<Icon name="magnifying-glass" size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</fetcher.Form>
			{addedCategories.length > 0 && (
				<Popover>
					<PopoverTrigger className="flex-1">
						<div className="text-md w-full rounded-md bg-background p-2 font-semibold">
							{addedCategories.length}{' '}
							{addedCategories.length === 1
								? 'categoría incluida'
								: 'categorías incluidas'}
							<Icon name="chevron-down" className="ml-2" />
						</div>
					</PopoverTrigger>
					<PopoverContent className="w-fit gap-3 p-3 text-sm">
						{addedCategories.map(category => (
							<div key={category.id} className="flex items-center gap-4  ">
								<Button
									variant={'ghost'}
									className=" h-5 w-5 p-[2px] text-destructive focus-within:bg-destructive/10  focus-within:ring-0 hover:bg-destructive/40 focus-visible:bg-destructive/10 focus-visible:ring-0"
									onClick={() => removeCategory(category)}
								>
									<Icon name="cross-1" />
									<span className="sr-only">Quitar categoría de la lista</span>
								</Button>
								<span>{category.description}</span>
							</div>
						))}
					</PopoverContent>
				</Popover>
			)}
			{isSearchBoxOpen && (
				<div className="absolute top-10 z-50 mt-1 flex w-[20rem]  flex-col gap-1 rounded-md bg-background p-1 text-sm ">
					{categories.map(category => (
						<ul
							key={category.id}
							className="flex cursor-pointer gap-5 rounded-md p-1 hover:bg-primary/20"
							onClick={() => {
								addCategory(category)
								setIsSearchBoxOpen(false)
							}}
						>
							<li className="w-[2.5rem] font-bold">{category.code}</li>
							<li className="flex-1 ">{category.description}</li>
						</ul>
					))}
				</div>
			)}
		</div>
	)
}
