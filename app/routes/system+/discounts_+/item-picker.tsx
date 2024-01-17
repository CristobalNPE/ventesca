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

import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useFetcher, useSearchParams } from '@remix-run/react'
import { useEffect, useId, useState } from 'react'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	const url = new URL(request.url)
	const itemSearch = url.searchParams.get('item-search')

	const itemSearchAsNumber = Number(itemSearch) || null

	if (itemSearchAsNumber) {
		const items = await prisma.item.findMany({
			select: { id: true, code: true, name: true },
			where: { code: itemSearchAsNumber },

			orderBy: { name: 'asc' },
			take: 5,
		})
		return json({ items })
	}

	const items = await prisma.item.findMany({
		select: { id: true, code: true, name: true },
		where: { name: { contains: itemSearch ?? '' } },

		orderBy: { name: 'asc' },
		take: 5,
	})

	return json({ items })
}

export function ItemPicker({
	setAddedItemsIds,
}: {
	setAddedItemsIds: (ids: string) => void
}) {
	const [isSearchBoxOpen, setIsSearchBoxOpen] = useState(false)
	const id = useId()
	const [searchParams] = useSearchParams()
	const fetcher = useFetcher<typeof loader>({ key: 'item-search' })
	const isSubmitting = fetcher.state !== 'idle'

	const items = fetcher.data?.items ?? []
	type Item = (typeof items)[0]

	const [addedItems, setAddedItems] = useState<Item[]>([])

	useEffect(() => {
		setAddedItemsIds(addedItems.map(i => i.id).join(','))
		
	}, [addedItems, setAddedItemsIds]);

	const addItem = (item: Item) => {
		if (!addedItems.find(i => i.id === item.id)) {
			setAddedItems([...addedItems, item])
		}
	}

	const removeItem = (item: Item) => {
		setAddedItems(addedItems.filter(i => i.id !== item.id))
	}

	console.log(addedItems)
	console.log(addedItems.length)
	const addedItemsIds = addedItems.map(i => i.id).join(',')
	console.log(addedItemsIds)

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		fetcher.submit(form)
	}, 400)

	return (
		<div className="relative flex w-full gap-2">
			<fetcher.Form
				autoComplete="off"
				method="GET"
				action="/system/discounts/item-picker"
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
						name="item-search"
						id={id}
						defaultValue={searchParams.get('item-search') ?? ''}
						placeholder="Agregar articulo"
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
			{addedItems.length > 0 && (
				<Popover>
					<PopoverTrigger className="flex-1">
						<div className="text-md w-full rounded-md bg-background p-2 font-semibold">
							{addedItems.length}{' '}
							{addedItems.length === 1
								? 'artículo incluido'
								: 'artículos incluidos'}
							<Icon name="chevron-down" className="ml-2" />
						</div>
					</PopoverTrigger>
					<PopoverContent className="w-fit gap-3 p-3 text-sm">
						{addedItems.map(item => (
							<div key={item.id} className="flex items-center gap-4  ">
								<Button
									variant={'ghost'}
									className=" h-5 w-5 p-[2px] text-destructive focus-within:bg-destructive/10  focus-within:ring-0 hover:bg-destructive/40 focus-visible:bg-destructive/10 focus-visible:ring-0"
									onClick={() => removeItem(item)}
								>
									<Icon name="cross-1" />
									<span className="sr-only">Quitar articulo de la lista</span>
								</Button>
								<span>{item.name}</span>
							</div>
						))}
					</PopoverContent>
				</Popover>
			)}
			{isSearchBoxOpen && (
				<div className="absolute top-10 z-50 mt-1 flex w-[20rem]  flex-col gap-1 rounded-md bg-background p-1 text-sm ">
					{items.map(item => (
						<ul
							key={item.id}
							className="flex cursor-pointer gap-5 rounded-md p-1 hover:bg-primary/20"
							// onClick={() => console.log(item.name)}
							onClick={() => {
								addItem(item)
								setIsSearchBoxOpen(false)
							}}
						>
							<li className="w-[2.5rem] font-bold">{item.code}</li>
							<li className="flex-1 ">{item.name}</li>
						</ul>
					))}
				</div>
			)}
		</div>
	)
}
