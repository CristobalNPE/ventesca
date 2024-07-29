import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Discount } from '@prisma/client'
import { Link } from '@remix-run/react'

export function ProductDiscountsCard({
	associatedDiscounts,
	globalDiscounts,
}: {
	associatedDiscounts: Pick<Discount, 'id' | 'name'>[]
	globalDiscounts: Pick<Discount, 'id' | 'name'>[]
}) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Descuentos Asociados</CardTitle>
				<CardDescription>
					Descuentos activos vinculados al producto y descuentos globales.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{globalDiscounts.length ? (
					<div>
						<p>Descuentos Globales ({globalDiscounts.length})</p>
						{globalDiscounts.map(globalDiscount => (
							<Link
								unstable_viewTransition
								to={`/discounts/${globalDiscount.id}`}
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
								key={globalDiscount.id}
							>
								<Icon name="tag" />
								<span>{globalDiscount.name}</span>
							</Link>
						))}
					</div>
				) : null}
				{associatedDiscounts.length ? (
					<div>
						<p>Descuentos Vinculados ({associatedDiscounts.length})</p>
						{associatedDiscounts.map(discount => (
							<Link
								prefetch="intent"
								unstable_viewTransition
								to={`/discounts/${discount.id}`}
								className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
								key={discount.id}
							>
								<Icon name="tag" />
								<span>{discount.name}</span>
							</Link>
						))}
					</div>
				) : null}
			</CardContent>
			<CardFooter></CardFooter>
		</Card>
	)
}
