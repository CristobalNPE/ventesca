import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, useDebounce } from '#app/utils/misc.tsx'
import { json, LoaderFunctionArgs } from '@remix-run/node'
import { Link, useFetcher, useNavigate } from '@remix-run/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Button } from '#app/components/ui/button.tsx'
import { Product } from '@prisma/client'

enum VerifySearchStatus {
	FOUND = 'found',
	NOT_FOUND = 'not-found',
	INVALID = 'invalid',
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const productPriceSearch = url.searchParams.get('product-price-search')

	if (productPriceSearch === null || productPriceSearch === '')
		return json({ product: null, status: VerifySearchStatus.INVALID })

	const product = await prisma.product.findFirst({
		where: { code: productPriceSearch, businessId },
		select: {
			id: true,
			code: true,
			name: true,
			stock: true,
			sellingPrice: true,
		},
	})

	if (product) {
		return json({ product, status: VerifySearchStatus.FOUND })
	}
	return json({ product, status: VerifySearchStatus.NOT_FOUND })
}

export function ProductPriceReader({
	open,
	setOpen,
}: {
	open: boolean
	setOpen: (open: boolean) => void
}) {
	const { productState, fetcher } = useProductFetcher()
	const navigate = useNavigate()
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (!open) {
			fetcher.load(`/inventory/price-reader?product-price-search=`)
		}
		if (open) {
			inputRef.current?.focus()
			inputRef.current?.select()
		}
	}, [open, fetcher])

	const navigateToDetails = useCallback(() => {
		if (!productState.product) return
		navigate(`/inventory/${productState.product.id}`)
		if (inputRef.current !== null) {
			inputRef.current.value = ''
		}
		setOpen(false)
	}, [productState.product, navigate, setOpen])

	const handleFormChange = useDebounce((inputValue: string) => {
		fetcher.submit(
			{ 'product-price-search': inputValue ?? '' },
			{
				method: 'get',
				action: `/inventory/price-reader`,
			},
		)

		inputRef.current?.focus()
		inputRef.current?.select()
	}, 400)

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>Consulta de Precio</DialogTitle>
					<DialogDescription asChild>
						<div className="flex flex-col gap-4 ">
							<p>Escanee el Código del producto o ingrese manualmente:</p>
							<div
								className="flex w-full items-center gap-4 rounded-xl border bg-secondary p-4 shadow-sm"
								onClick={() => inputRef.current?.focus()}
							>
								<div className="relative  ">
									<Icon
										name="scan-barcode"
										className="h-[7rem] w-[7rem] text-primary  "
									/>

									{productState.product &&
									productState.status === VerifySearchStatus.FOUND ? (
										<Icon
											name="checks"
											className="absolute left-8 top-8 h-[3rem] w-[3rem] animate-slide-top rounded-full bg-green-600 p-2 text-foreground"
										/>
									) : productState.status === VerifySearchStatus.NOT_FOUND ? (
										<Icon
											name="cross-1"
											className="absolute left-8 top-8 h-[3rem] w-[3rem] animate-slide-top rounded-full bg-destructive p-2 text-foreground"
										/>
									) : null}
								</div>

								<Input
									autoFocus
									ref={inputRef}
									type="text"
									name="product-price-reader"
									placeholder="Búsqueda por código"
									className="border-none [&::-webkit-inner-spin-button]:appearance-none"
									onChange={e => {
										handleFormChange(e.target.value)
									}}
								/>
							</div>
							{productState.product &&
							productState.status !== VerifySearchStatus.INVALID ? (
								<div className="flex animate-slide-top items-center justify-between gap-12 rounded bg-accent p-4 text-foreground">
									<div className=" flex flex-col">
										<Button
											className="p-0 text-xl font-bold underline-offset-4 hover:text-primary hover:underline"
											variant={'link'}
											onClick={() => navigateToDetails()}
										>
											{productState.product.name}
										</Button>
										<span className="text-muted-foreground">
											{productState.product.stock === 0
												? 'Sin existencias registradas en inventario.'
												: productState.product.stock === 1
													? `${productState.product.stock} unidad disponible.`
													: `${productState.product.stock} unidades disponibles.`}
										</span>
									</div>
									<div className="flex flex-col items-center">
										<span className="text-3xl font-bold ">
											{formatCurrency(productState.product.sellingPrice)}
										</span>
										<span className="text-xs leading-none text-muted-foreground">
											Precio base
										</span>
									</div>
								</div>
							) : null}
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	)
}

function useProductFetcher() {
	const fetcher = useFetcher<typeof loader>({ key: 'product-price-reader' })
	const [productState, setProductState] = useState<{
		product: Pick<
			Product,
			'id' | 'code' | 'name' | 'stock' | 'sellingPrice'
		> | null
		status: VerifySearchStatus
	}>({
		product: null,
		status: VerifySearchStatus.INVALID,
	})

	useEffect(() => {
		if (fetcher.data) {
			setProductState({
				product: fetcher.data.product,
				status: fetcher.data.status,
			})
		}
	}, [fetcher.data])

	return { productState, fetcher }
}
