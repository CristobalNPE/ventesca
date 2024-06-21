import { type Product } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
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
	const productSearch = url.searchParams.get('product-search')

	const productSearchAsNumber = Number(productSearch) || null

	if (productSearch === null) return null

	const productSearchByNameButTooShort =
		productSearchAsNumber === null && productSearch.length <= 2

	if (productSearchByNameButTooShort) return null

	if (productSearchAsNumber) {
		const products = await prisma.product.findMany({
			select: { id: true, code: true, name: true, sellingPrice: true }, //Put this in a variable
			where: { code: productSearchAsNumber, businessId: businessId },

			orderBy: { name: 'asc' },
		})

		return json({ products })
	}

	const products = await prisma.product.findMany({
		select: { id: true, code: true, name: true, sellingPrice: true },
		where: { name: { contains: productSearch }, businessId: businessId },

		orderBy: { code: 'asc' },
	})

	return json({ products })
}

export function ProductPicker({
	setAddedProductsIds,
	errors,
}: {
	setAddedProductsIds: (ids: string) => void
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

	const products = fetcher.data?.products ?? []
	type Product = (typeof products)[0]

	const [addedProducts, setAddedProducts] = useState<Product[]>([])

	useEffect(() => {
		setAddedProductsIds(addedProducts.map(i => i.id).join(','))
	}, [addedProducts, setAddedProductsIds])

	const addProduct = (product: Product) => {
		if (!addedProducts.find(i => i.id === product.id)) {
			setAddedProducts([...addedProducts, product])
		}
	}

	const removeProduct = (product: Product) => {
		setAddedProducts(addedProducts.filter(i => i.id !== product.id))
	}

	const formRef = useRef<HTMLFormElement>(null)

	const handleFormChange = useDebounce((inputValue: string) => {
		fetcher.submit(
			{ 'product-search': inputValue ?? '' },
			{
				method: 'get',
				action: '/discounts/product-picker',
			},
		)
		setIsSearchBoxOpen(true)
	}, 400)

	return (
		<Card className="relative max-h-[40rem] flex-1 overflow-auto lg:max-w-lg">
			<CardHeader>
				<CardTitle>
					Artículos asociados{' '}
					{addedProducts.length > 0 && (
						<span className="text-muted-foreground">
							({addedProducts.length})
						</span>
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
											name="product-search"
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
										{products.map(product => (
											<CommandItem
												key={product.id}
												className="flex cursor-pointer gap-5 rounded-md p-1 hover:bg-primary/20 "
												onSelect={() => {
													addProduct(product)
													setIsSearchBoxOpen(false)
													formRef.current?.reset()
												}}
											>
												<span className="w-[2.5rem] font-bold">
													{product.code}
												</span>
												<span className="flex-1 ">{product.name}</span>
											</CommandItem>
										))}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>

					{addedProducts.length > 0 && (
						<DiscountItemsList
							canRemove={true}
							addedProducts={addedProducts}
							removeProduct={removeProduct}
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

export type DiscountListProduct = SerializeFrom<
	Pick<Product, 'id' | 'code' | 'name' | 'sellingPrice'>
>

export function DiscountItemsList({
	addedProducts,
	removeProduct,
	canRemove,
	showDetailsLink = false,
}: {
	addedProducts: DiscountListProduct[]
	removeProduct?: (product: DiscountListProduct) => void
	canRemove: boolean
	showDetailsLink?: boolean
}) {
	return (
		<div className="flex flex-col gap-1  ">
			{addedProducts.map(product => (
				<div
					key={product.id}
					className="flex items-center justify-between gap-8 rounded-sm  bg-accent/50 p-2 "
				>
					<div className="flex  gap-1 text-base">
						{showDetailsLink ? (
							<Link
								to={`/inventory/${product.id}`}
								className="flex w-[4rem] items-center gap-1 text-muted-foreground hover:text-foreground"
							>
								<Icon className="shrink-0" name="scan-barcode" />{' '}
								<span>{product.code}</span>
							</Link>
						) : (
							<div className="flex w-[4rem] items-center gap-1 text-muted-foreground ">
								<Icon className="shrink-0" name="scan-barcode" />{' '}
								<span>{product.code}</span>
							</div>
						)}
						<span>{product.name}</span>
					</div>

					{canRemove && removeProduct && (
						<Button
							variant={'destructive'}
							className="text-lg "
							size={'icon'}
							onClick={() => removeProduct(product)}
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
