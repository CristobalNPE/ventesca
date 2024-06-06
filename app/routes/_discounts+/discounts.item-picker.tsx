import { ErrorList, ListOfErrors } from '#app/components/forms.tsx'
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
import { Item } from '@prisma/client'
import { SerializeFrom, json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import { useEffect, useId, useRef, useState } from 'react'
import { useSpinDelay } from 'spin-delay'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const itemSearch = url.searchParams.get('item-search')

	const itemSearchAsNumber = Number(itemSearch) || null

	if (itemSearch === null) return null
	console.log(url.searchParams.getAll(''))
	console.log(itemSearch)

	const itemSearchByNameButTooShort =
		itemSearchAsNumber === null && itemSearch.length <= 2

	if (itemSearchByNameButTooShort) return null

	if (itemSearchAsNumber) {
		const items = await prisma.item.findMany({
			select: { id: true, code: true, name: true, sellingPrice: true }, //Put this in a variable
			where: { code: itemSearchAsNumber, businessId: businessId },

			orderBy: { name: 'asc' },
		})

		return json({ items })
	}

	const items = await prisma.item.findMany({
		select: { id: true, code: true, name: true, sellingPrice: true },
		where: { name: { contains: itemSearch }, businessId: businessId },

		orderBy: { code: 'asc' },
	})

	return json({ items })
}

export function ItemPicker({
	setAddedItemsIds,
	errors,
}: {
	setAddedItemsIds: (ids: string) => void
	errors: ListOfErrors
}) {
	const [isSearchBoxOpen, setIsSearchBoxOpen] = useState(false)
	const id = useId()
	const errorId = errors?.length ? `${id}-error` : undefined

	const fetcher = useFetcher<typeof loader>({ key: `item-search-ID${id}` })

	const isSubmitting = fetcher.state !== 'idle'
	const showSpin = useSpinDelay(isSubmitting, {
		delay: 150,
		minDuration: 500,
	})

	const items = fetcher.data?.items ?? []
	type Item = (typeof items)[0]

	const [addedItems, setAddedItems] = useState<Item[]>([])

	useEffect(() => {
		setAddedItemsIds(addedItems.map(i => i.id).join(','))
	}, [addedItems, setAddedItemsIds])

	const addItem = (item: Item) => {
		if (!addedItems.find(i => i.id === item.id)) {
			setAddedItems([...addedItems, item])
		}
	}

	const removeItem = (item: Item) => {
		setAddedItems(addedItems.filter(i => i.id !== item.id))
	}

	const formRef = useRef<HTMLFormElement>(null)

	const handleFormChange = useDebounce((inputValue: string) => {
		fetcher.submit(
			{ 'item-search': inputValue ?? '' },
			{
				method: 'get',
				action: '/discounts/item-picker',
			},
		)
		setIsSearchBoxOpen(true)
	}, 400)

	return (
		<Card className="relative max-h-[40rem] flex-1 overflow-auto lg:max-w-lg">
			<CardHeader>
				<CardTitle>
					Artículos asociados{' '}
					{addedItems.length > 0 && (
						<span className="text-muted-foreground">({addedItems.length})</span>
					)}
				</CardTitle>
				<CardDescription>
					Utilice la búsqueda para agregar artículos que estarán asociados al
					nuevo descuento.
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
								<span>Buscar articulo</span>
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
											placeholder="Búsqueda por código o nombre"
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
										{items.map(item => (
											<CommandItem
												key={item.id}
												className="flex cursor-pointer gap-5 rounded-md p-1 hover:bg-primary/20 "
												onSelect={() => {
													addItem(item)
													setIsSearchBoxOpen(false)
													formRef.current?.reset()
												}}
											>
												<span className="w-[2.5rem] font-bold">
													{item.code}
												</span>
												<span className="flex-1 ">{item.name}</span>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					{addedItems.length > 0 && (
						<DiscountItemsList
							canRemove={true}
							addedItems={addedItems}
							removeItem={removeItem}
						/>
					)}
				</div>
			</CardContent>
			<CardFooter>
				{errorId ? <ErrorList id={errorId} errors={errors} /> : null}
			</CardFooter>
		</Card>
	)
}

export type DiscountItemListItem = SerializeFrom<
	Pick<Item, 'id' | 'code' | 'name' | 'sellingPrice'>
>

export function DiscountItemsList({
	addedItems,
	removeItem,
	canRemove,
	showDetailsLink = false,
}: {
	addedItems: DiscountItemListItem[]
	removeItem?: (item: DiscountItemListItem) => void
	canRemove: boolean
	showDetailsLink?: boolean
}) {
	return (
		<div className="flex flex-col gap-1  ">
			{addedItems.map(item => (
				<div
					key={item.id}
					className="flex items-center justify-between gap-8 rounded-sm  bg-accent/50 p-2 "
				>
					<div className="flex  gap-1 text-base">
						{showDetailsLink ? (
							<Link
								to={`/inventory/${item.id}`}
								className="flex w-[4rem] items-center gap-1 text-muted-foreground hover:text-foreground"
							>
								<Icon className="shrink-0" name="scan-barcode" />{' '}
								<span>{item.code}</span>
							</Link>
						) : (
							<div className="flex w-[4rem] items-center gap-1 text-muted-foreground ">
								<Icon className="shrink-0" name="scan-barcode" />{' '}
								<span>{item.code}</span>
							</div>
						)}
						<span>{item.name}</span>
					</div>

					{canRemove && removeItem && (
						<Button
							variant={'destructive'}
							className="text-lg "
							size={'icon'}
							onClick={() => removeItem(item)}
						>
							<Icon name="trash" />
							<span className="sr-only">Quitar articulo de la lista</span>
						</Button>
					)}
				</div>
			))}
		</div>
	)
}
