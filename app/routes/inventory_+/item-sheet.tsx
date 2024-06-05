import { Button } from '#app/components/ui/button.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { cn, formatCurrency, invariant } from '#app/utils/misc.tsx'

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '#app/components/ui/sheet.tsx'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { Link, useFetcher } from '@remix-run/react'

import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import React from 'react'

export async function loader({ request }: LoaderFunctionArgs) {
	await requireUserId(request)

	const url = new URL(request.url)
	const itemId = url.searchParams.get('item-id')
	invariant(typeof itemId === 'string', 'itemId is required')

	const item = await prisma.item.findUniqueOrThrow({
		where: { id: itemId },
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

	return json({ item })
}

export function ItemDetailsSheet({ itemId }: { itemId: string }) {
	const itemFetcher = useFetcher<typeof loader>({ key: 'item-sheet-fetcher' })

	const item = itemFetcher.data?.item ?? null

	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button
					onClick={() =>
						itemFetcher.submit(
							{ 'item-id': itemId ?? '' },
							{ method: 'get', action: '/inventory/item-sheet' },
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
			{item ? (
				<SheetContent className="flex flex-col">
					<SheetHeader>
						<SheetTitle className="flex flex-col">
							<span>{item.name}</span>
						</SheetTitle>
						<SheetDescription>Información del articulo</SheetDescription>
					</SheetHeader>
					<div className="flex flex-1 flex-col gap-2">
						<SheetItem icon={'id'} name={'ID'}>
							<span>{item.id.toUpperCase()}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Código'}>
							<span>{item.code}</span>
						</SheetItem>
						<SheetItem icon={'package'} name={'Stock'}>
							<span>
								{item.stock !== 1
									? `${item.stock} unidades.`
									: `${item.stock} unidad.`}
							</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Valor'}>
							<span>{formatCurrency(item.price)}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Precio de Venta'}>
							<span>{formatCurrency(item.sellingPrice)}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Proveedor'}>
							<span>{item.supplier.fantasyName}</span>
						</SheetItem>
						<SheetItem icon={'scan-barcode'} name={'Estado'}>
							<span
								className={cn(
									'text-green-600',
									!item.isActive && 'text-destructive',
								)}
							>
								{item.isActive ? 'Disponible' : 'No Disponible'}
							</span>
						</SheetItem>
					</div>
					<Button asChild>
						<Link className="flex w-full gap-2" to={`/inventory/${item.id}`}>
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
