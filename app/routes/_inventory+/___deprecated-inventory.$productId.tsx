import { Button } from '#app/components/ui/button.tsx'
import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, useNavigation } from '@remix-run/react'

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'

import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Link } from '@remix-run/react'

import { DiscountScope } from '../_discounts+/_types/discount-reach.ts'
import { Skeleton } from '#app/components/ui/skeleton.tsx'
import { useSpinDelay } from 'spin-delay'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const productPromise = prisma.product.findUnique({
		where: { id: params.productId, businessId },
		select: {
			id: true,
			isActive: true,
			code: true,
			name: true,
			price: true,
			stock: true,
			createdAt: true,
			updatedAt: true,
			sellingPrice: true,
			discounts: { select: { id: true, name: true } },
			category: { select: { description: true, id: true } },
			supplier: { select: { fantasyName: true, id: true } },
		},
	})

	const globalDiscountsPromise = prisma.discount.findMany({
		where: { scope: DiscountScope.GLOBAL },
		select: { id: true, name: true },
	})

	const [product, globalDiscounts] = await Promise.all([
		productPromise,
		globalDiscountsPromise,
	])

	invariantResponse(product, 'Not found', { status: 404 })

	return json({
		product: {
			...product,
		},
		globalDiscounts,
	})
}

export default function ProductRoute() {
	const { product, globalDiscounts } = useLoaderData<typeof loader>()

	const allAssociatedDiscounts = [...globalDiscounts, ...product.discounts]

	const navigation = useNavigation()
	const isLoading = navigation.state === 'loading'

	const shouldShoSkeletonLoader = useSpinDelay(isLoading, {
		delay: 150,
		minDuration: 500,
	})

	if (shouldShoSkeletonLoader) {
		return <ProductSkeleton />
	}
	return (
		<Card className="flex h-full flex-col rounded-none">
			<CardHeader className="flex flex-col items-start bg-muted/50  p-4 ">
				<CardTitle className="flex flex-col gap-2 text-lg ">
					<span className="font-black uppercase tracking-tight">
						{product.name}
					</span>
					<div className="group  flex items-center gap-1 text-muted-foreground">
						<Icon name="scan-barcode" />
						<span>{product.code}</span>
						<Button
							size="icon"
							variant="outline"
							className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Icon name="copy" className="h-3 w-3" />
							<span className="sr-only">Copiar código</span>
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3  overflow-auto p-2 text-sm sm:px-4 sm:py-10 ">
				<div className="flex flex-1 flex-col gap-5 ">
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="package" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Stock disponible</span>
							<span
								className={cn(
									'text-foreground',
									product.stock <= 0 && 'text-destructive',
								)}
							>
								{product.stock <= 0
									? 'Sin stock'
									: product.stock === 1
										? `${product.stock} unidad`
										: `${product.stock} unidades`}
							</span>
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="circle-dollar-sign" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Valor</span>
							<span>{formatCurrency(product.price)}</span>
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="cash" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Precio de Venta</span>
							<span>{formatCurrency(product.sellingPrice)}</span>
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="user" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Proveedor</span>
							<span>{product.supplier.fantasyName}</span>
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="shapes" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Categoría</span>
							<span>{product.category.description}</span>
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="tag" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Descuentos</span>
							{allAssociatedDiscounts.length === 0
								? `Sin descuentos asociados.`
								: allAssociatedDiscounts.length > 1
									? `${allAssociatedDiscounts.length} Descuentos asociados.`
									: `${allAssociatedDiscounts.length} Descuento asociado.`}
						</div>
					</div>
				</div>

				{product.isActive ? (
					<div className="flex items-center gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded bg-green-700 text-3xl text-primary-foreground">
							<Icon name="checks" />
						</div>
						<div className="flex flex-col">
							<span className="text-green-700">Producto Activo</span>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded bg-destructive/50 text-3xl text-primary-foreground">
							<Icon name="cross-1" className="text-foreground-destructive" />
						</div>
						<div className="flex flex-col">
							<span className="text-foreground-destructive">
								Producto Inactivo
							</span>
						</div>
					</div>
				)}
			</CardContent>
			<CardFooter className="flex flex-row items-center justify-center border-t bg-muted/50 p-3">
				<Button size={'pill'} asChild>
					<Link prefetch='intent' to={'details'} className="flex items-center gap-2">
						<Icon name="file-text" />
						<span>Ver Detalles</span>
					</Link>
				</Button>
			</CardFooter>
		</Card>
	)
}

const ProductSkeleton = () => {
	return (
		<Card className="flex h-full flex-col rounded-none">
			<CardHeader className="flex flex-col items-start bg-muted/50  p-4 ">
				<CardTitle className="flex flex-col gap-2 text-lg  ">
					<span className="font-black uppercase tracking-tight ">
						<Skeleton className="h-5 w-64 " />
					</span>
					<div className="group  flex items-center gap-1 text-muted-foreground">
						<Icon name="scan-barcode" />
						<Skeleton className="h-5 w-40 " />
						<Button
							size="icon"
							variant="outline"
							className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<Icon name="copy" className="h-3 w-3" />
							<span className="sr-only">Copiar código</span>
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-3  overflow-auto p-2 text-sm sm:px-4 sm:py-10 ">
				<div className="flex flex-1 flex-col gap-5 ">
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="package" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Stock disponible</span>
							<Skeleton className="h-5 w-24 " />
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="circle-dollar-sign" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Valor</span>
							<Skeleton className="h-5 w-24 " />
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="cash" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Precio de Venta</span>
							<Skeleton className="h-5 w-24 " />
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="user" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Proveedor</span>
							<Skeleton className="h-5 w-36 " />
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="shapes" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Categoría</span>
							<Skeleton className="h-5 w-36 " />
						</div>
					</div>
					<div className="flex gap-3 text-lg">
						<div className="flex h-12 w-12 items-center justify-center rounded border bg-secondary text-3xl text-secondary-foreground">
							<Icon name="tag" />
						</div>
						<div className="flex flex-col">
							<span className="text-muted-foreground">Descuentos</span>
							<Skeleton className="h-5 w-36 " />
						</div>
					</div>
				</div>

				<Skeleton className="h-16 w-full " />
			</CardContent>
			<CardFooter className="flex h-20 flex-row items-center justify-center border-t bg-muted/50 p-3"></CardFooter>
		</Card>
	)
}

//If we need to format a value on the edit modal, we can use the formatFn prop, but we need to also give the value as a Number in order for it to work correctly.

// export const meta: MetaFunction<
// 	typeof loader,
// 	{ 'routes/users+/$username_+/notes': typeof notesLoader }
// > = ({ data, params, matches }) => {
// 	const notesMatch = matches.find(
// 		m => m.id === 'routes/users+/$username_+/notes',
// 	)
// 	const displayName = notesMatch?.data?.owner.name ?? params.username
// 	const noteTitle = data?.note.title ?? 'Note'
// 	const noteContentsSummary =
// 		data && data.note.content.length > 100
// 			? data?.note.content.slice(0, 97) + '...'
// 			: 'No content'
// 	return [
// 		{ title: `${noteTitle} | ${displayName}'s Notes | Epic Notes` },
// 		{
// 			name: 'description',
// 			content: noteContentsSummary,
// 		},
// 	]
// }

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No posee los permisos necesarios.</p>,
				404: ({ params }) => (
					<p>No existe articulo con ID: "{params.productId}"</p>
				),
			}}
		/>
	)
}
