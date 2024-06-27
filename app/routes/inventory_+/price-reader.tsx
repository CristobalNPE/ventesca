import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, useDebounce } from '#app/utils/misc.tsx'
import { json, LoaderFunctionArgs } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Icon } from '#app/components/ui/icon.tsx'
import { useRef } from 'react'
import { Spacer } from '#app/components/spacer.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const productPriceSearch = url.searchParams.get('product-price-search')

	if (productPriceSearch === null) return null

	const product = await prisma.product.findFirst({
		where: { code: productPriceSearch, businessId },
		select: {
			id: true,
			code: true,
			name: true,
			stock: true,
			sellingPrice: true,
			discounts: true,
		},
	})

	return json({ product })
}

export function ProductPriceReader({
	open,
	setOpen,
}: {
	open: boolean
	setOpen: (open: boolean) => void
}) {
	const fetcher = useFetcher<typeof loader>({
		key: 'product-price-reader',
	})
	const product = fetcher.data ? fetcher.data.product : null
	const inputRef = useRef<HTMLInputElement>(null)
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
			<DialogContent className='max-w-xl'>
				<DialogHeader>
					<DialogTitle>Consulta de Precio</DialogTitle>
					<DialogDescription className="flex flex-col gap-4 ">
						<div className="flex items-center  gap-2 rounded p-2">
							<Icon name="scan-barcode" className="text-2xl" />
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

						{product ? (
							<div className="flex items-center justify-between gap-12 rounded bg-accent p-4 text-foreground">
								<div className=" flex flex-col">
									<Link
										to={`/inventory/${product.id}`}
										className="text-xl font-bold underline-offset-4 hover:text-primary hover:underline"
									>
										{product.name}
									</Link>
									<span className="text-muted-foreground">
										{product.stock === 0
											? 'Sin existencias registradas en inventario.'
											: product.stock === 1
												? `${product.stock} unidad disponible.`
												: `${product.stock} unidades disponibles.`}
									</span>
								</div>
								<div className='flex flex-col items-center'>
									<span className="text-3xl font-bold ">
										{formatCurrency(product.sellingPrice)}
										
									</span>
									<span className='text-muted-foreground leading-none text-xs'>Precio base</span>
								</div>
							</div>
						) : null}
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	)
}
