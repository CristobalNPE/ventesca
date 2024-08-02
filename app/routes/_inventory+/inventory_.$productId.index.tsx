import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, IconName } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency } from '#app/utils/misc.tsx'
import { invariantResponse } from '@epic-web/invariant'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { format, formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

import {
	calculateMarkupPercentage,
	calculateProfitMargin,
} from '#app/utils/inventory/product-calculations.ts'
import { userIsAdmin } from '#app/utils/user.ts'
import { CardContentItem } from '#app/components/card-content-item.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const product = await prisma.product.findUnique({
		where: { id: params.productId, businessId },
	})

	invariantResponse(product, 'Not found', { status: 404 })

	return json({ product })
}

export default function ProductDetails() {
	const { product } = useLoaderData<typeof loader>()
	const isAdmin = userIsAdmin()

	const profitMargin = calculateProfitMargin({
		sellingPrice: product.sellingPrice,
		cost: product.price,
	})

	const markupPercentage = calculateMarkupPercentage({
		sellingPrice: product.sellingPrice,
		cost: product.price,
	})

	return (
		<Card>
			<div className="flex justify-between gap-4 p-6">
				<div className="flex flex-col space-y-1.5 ">
					<CardTitle>Detalles del producto</CardTitle>
					<CardDescription>
						Registrado en sistema el{' '}
						{format(product.createdAt, "dd'/'MM'/'yyyy 'a las' HH:MM", {
							locale: es,
						})}
						hrs.
					</CardDescription>
				</div>
				{isAdmin ? (
					<Button size={'sm'} asChild>
						<Link
							to={'edit'}
							unstable_viewTransition
							className="flex items-center gap-2"
						>
							<Icon name="pencil-2" />
							<span className="hidden sm:flex">Modificar</span>
						</Link>
					</Button>
				) : null}
			</div>
			<CardContent className="flex flex-col gap-6">
				<CardContentItem icon={'id'} title={'Nombre'} content={product.name} />
				<CardContentItem
					icon={'scan-barcode'}
					title={'Código'}
					content={product.code}
				/>
				<CardContentItem
					icon={'moneybag'}
					title={'Costo'}
					content={formatCurrency(product.price)}
				/>
				<CardContentItem
					icon={'trending-up'}
					title={'Margen de ganancia'}
					content={`${formatCurrency(profitMargin)} (${markupPercentage}%)`}
				/>
			</CardContent>
			<CardFooter className="flex  flex-row items-center justify-end border-t bg-muted/50 p-3 text-sm text-muted-foreground">
				<span className="flex items-center gap-2">
					<Icon size="sm" name="clock" /> Última modificación{' '}
					{formatRelative(subDays(product.updatedAt, 0), new Date(), {
						locale: es,
					})}
				</span>
			</CardFooter>
		</Card>
	)
}
