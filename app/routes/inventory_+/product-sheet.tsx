import { Button } from '#app/components/ui/button.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { invariant } from '@epic-web/invariant'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'
import React from 'react'

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '#app/components/ui/sheet.tsx'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	const url = new URL(request.url)
	const productId = url.searchParams.get('product-id')
	invariant(typeof productId === 'string', 'itemId is required')

	const product = await prisma.product.findUniqueOrThrow({
		where: { id: productId },
		select: {
			id: true,
			name: true,
			code: true,
			stock: true,
			price: true,
			sellingPrice: true,
			isActive: true,
			supplier: { select: { fantasyName: true } },
		},
	})

	return json({ product })
}

export function ItemDetailsSheet({ itemId }: { itemId: string }) {
	const productFetcher = useFetcher<typeof loader>({
		key: `product-sheet-fetcher`,
	})

	const product = productFetcher.data?.product ?? null

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					onClick={() =>
						productFetcher.submit(
							{ 'product-id': itemId ?? '' },
							{ method: 'get', action: '/inventory/product-sheet' },
						)
					}
					size={'sm'}
					className="h-7 w-7"
					variant={'outline'}
				>
					<Icon className="shrink-0" name="file-text" />
					<span className="sr-only">More</span>
				</Button>
			</SheetTrigger>
			{product ? (
				<SheetContent className="flex flex-col">
					<SheetHeader>
						<SheetTitle className="flex flex-col">
							<span>{product.name}</span>
						</SheetTitle>
						<SheetDescription>Información del articulo</SheetDescription>
					</SheetHeader>
					<div className="flex flex-1 flex-col gap-2">
						<SheetItem icon={'id'} name={'ID'}>
							<span>{product.id.toUpperCase()}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Código'}>
							<span>{product.code}</span>
						</SheetItem>
						<SheetItem icon={'package'} name={'Stock'}>
							<span>
								{product.stock !== 1
									? `${product.stock} unidades.`
									: `${product.stock} unidad.`}
							</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Valor'}>
							<span>{formatCurrency(product.price)}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Precio de Venta'}>
							<span>{formatCurrency(product.sellingPrice)}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Proveedor'}>
							<span>{product.supplier.fantasyName}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Estado'}>
							<span
								className={cn(
									'text-green-600',
									!product.isActive && 'text-destructive',
								)}
							>
								{product.isActive ? 'Disponible' : 'No Disponible'}
							</span>
						</SheetItem>
					</div>
					<Button asChild>
						<Link className="flex w-full gap-2" to={`/inventory/${product.id}`}>
							<Icon name="link-2" />
							<span>Detalles articulo</span>
						</Link>
					</Button>
				</SheetContent>
			) : (
				<SheetContent></SheetContent>
			)}
		</Sheet>
	)
}

function SheetItem({
	icon,
	name,
	children,
}: {
	icon: IconName
	name: string
	children?: React.ReactNode
}) {
	return (
		<div className="border-b-2 pb-2">
			<div className="flex items-center gap-2 font-bold">
				<Icon name={icon} />
				<span>{name}</span>
			</div>
			{children}
		</div>
	)
}
