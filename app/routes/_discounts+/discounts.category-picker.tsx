import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useFetcher } from '@remix-run/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useSpinDelay } from 'spin-delay'
import { ErrorList, type ListOfErrors } from '#app/components/forms.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandList,
} from '#app/components/ui/command.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '#app/components/ui/popover.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const categorySearch = url.searchParams.get('category-search')

	const categorySearchAsNumber = Number(categorySearch) || null

	if (categorySearch === null) return null

	const categorySearchByNameButTooShort =
		categorySearchAsNumber === null && categorySearch.length <= 2

	if (categorySearchByNameButTooShort) return null

	if (categorySearchAsNumber) {
		const categories = await prisma.category.findMany({
			select: { id: true, code: true, description: true, _count: true },
			where: { code: categorySearchAsNumber, businessId: businessId },

			orderBy: { description: 'asc' },
		})

		return json({ categories })
	}
	const categories = await prisma.category.findMany({
		select: { id: true, code: true, description: true, _count: true },
		where: {
			description: { contains: categorySearch },
			businessId: businessId,
		},

		orderBy: { code: 'asc' },
	})

	console.log(categories)
	return json({ categories })
}

export function CategoryPicker({
	setAddedCategoriesIds,
	errors,
}: {
	setAddedCategoriesIds: (ids: string) => void
	errors: ListOfErrors
}) {
	const [isSearchBoxOpen, setIsSearchBoxOpen] = useState(false)
	const id = useId()
	const errorId = errors?.length ? `${id}-error` : undefined

	const fetcher = useFetcher<typeof loader>({ key: `category-search-ID${id}` }) 

	const isSubmitting = fetcher.state !== 'idle'
	const showSpin = useSpinDelay(isSubmitting, {
		delay: 150,
		minDuration: 500,
	})

	const categories = fetcher.data?.categories ?? []

	type Category = (typeof categories)[0]

	const [addedCategories, setAddedCategories] = useState<Category[]>([])

	useEffect(() => {
		setAddedCategoriesIds(addedCategories.map(i => i.id).join(','))
	}, [addedCategories, setAddedCategoriesIds])

	const addCategory = (category: Category) => {
		if (!addedCategories.find(c => c.id === category.id)) {
			setAddedCategories([...addedCategories, category])
		}
	}

	const removeCategory = (category: Category) => {
		setAddedCategories(addedCategories.filter(c => c.id !== category.id))
	}

	const formRef = useRef<HTMLFormElement>(null)

	const handleFormChange = useDebounce((inputValue: string) => {
		fetcher.submit(
			{ 'category-search': inputValue ?? '' },
			{
				method: 'get',
				action: '/discounts/category-picker',
			},
		)
		setIsSearchBoxOpen(true)
	}, 400)

	return (
		<Card className="relative max-h-[40rem] flex-1 overflow-auto lg:max-w-lg">
			<CardHeader>
				<CardTitle>
					Categorías asociadas{' '}
					{addedCategories.length > 0 && (
						<span className="text-muted-foreground">
							({addedCategories.length})
						</span>
					)}
				</CardTitle>
				<CardDescription>
					Utilice la búsqueda para agregar las categorías que estarán incluidas
					en el nuevo descuento.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className=" relative flex w-full flex-grow flex-col gap-2">
					<Popover open={isSearchBoxOpen} onOpenChange={setIsSearchBoxOpen}>
						<PopoverTrigger asChild>
							<Button
								variant={'outline'}
								className="mx-auto mb-4 flex w-[24rem] items-center justify-center gap-2"
							>
								<Icon name="magnifying-glass" />
								<span>Buscar categoría</span>
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[24rem]">
							<Command>
								<div className="mb-4 flex items-center overflow-hidden rounded-md border border-input bg-background ring-ring has-[:focus]:ring-2 md:max-w-xs ">
									<div className="flex flex-1 items-center justify-center">
										<Label htmlFor={id} className="sr-only">
											Búsqueda
										</Label>
										<Input
											type="text"
											name="item-search"
											id={id}
											placeholder="Búsqueda por código o descripción"
											className="border-none focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none"
											onChange={e => {
												handleFormChange(e.target.value)
											}}
										/>
										<div className="p-2">
											{showSpin ? (
												<Icon name="update" className="animate-spin" />
											) : (
												<Icon name="magnifying-glass" />
											)}
										</div>
									</div>
								</div>
								<CommandList>
									<CommandEmpty>Sin coincidencias.</CommandEmpty>
									<CommandGroup className="max-h-[15rem] overflow-y-auto">
										{categories.map(category => (
											<CommandItem
												key={category.id}
												className="flex cursor-pointer gap-5 rounded-md p-1 hover:bg-primary/20 "
												onSelect={() => {
													addCategory(category)
													setIsSearchBoxOpen(false)
													formRef.current?.reset()
												}}
											>
												<span className="w-[2.5rem] font-bold">
													{category.code}
												</span>
												<span className="flex-1 ">{category.description}</span>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					{addedCategories.length > 0 && (
						<div className="flex flex-col gap-1  ">
							{addedCategories.map(category => (
								<div
									key={category.id}
									className="flex items-center justify-between gap-8 rounded-sm  bg-accent p-2"
								>
									<div className="flex flex-col gap-2 ">
										<div className="flex flex-col text-sm">
											<div className="flex items-center gap-1 text-muted-foreground">
												<Icon name="scan-barcode" />{' '}
												<span>{category.code}</span>
											</div>
											<span>{category.description}</span>
										</div>
										<div className="flex items-center gap-1 text-sm">
											<span className="text-muted-foreground">
												{category._count.products} artículos asociados.
											</span>
										</div>
									</div>

									<Button
										variant={'destructive'}
										className="text-xl "
										onClick={() => removeCategory(category)}
									>
										<Icon name="trash" />
										<span className="sr-only">
											Quitar categoría de la lista
										</span>
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			</CardContent>
			<CardFooter>
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</CardFooter>
		</Card>
	)
}
