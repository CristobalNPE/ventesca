import { type Discount } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'
import { Link } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from '#app/components/ui/sheet.tsx'
import { formatCurrency } from '#app/utils/misc.tsx'

import { discountAppmethodNames } from './_constants/discountAppmethodNames.ts'
import { discountTypeNames } from './_constants/discountTypeNames.ts'
import { DiscountApplicationMethod } from '../../types/discounts/discount-applicationMethod.ts'
import { DiscountScope } from '../../types/discounts/discount-reach.ts'
import { DiscountType } from '../../types/discounts/discount-type.ts'

export function DiscountSheet({
	discount,
}: {
	discount: SerializeFrom<
		Pick<
			Discount,
			| 'id'
			| 'name'
			| 'description'
			| 'validFrom'
			| 'validUntil'
			| 'applicationMethod'
			| 'type'
			| 'minimumQuantity'
			| 'value'
			| 'scope'
		>
	>
}) {
	const formattedDates = `${format(
		new Date(discount.validFrom),
		"dd'/'MM'/'yyyy",
		{ locale: es },
	)} - ${format(new Date(discount.validUntil), "dd'/'MM'/'yyyy", {
		locale: es,
	})}`

	return (
		<Sheet>
			<SheetTrigger asChild>
				<div className="flex cursor-pointer items-center gap-1 px-1  text-sm hover:bg-accent">
					<Icon
						className="shrink-0 text-muted-foreground"
						name={discount.scope === DiscountScope.GLOBAL ? 'world' : 'tag'}
					/>
					<span>{discount.name}</span>
				</div>
			</SheetTrigger>
			<SheetContent className="flex flex-col">
				<SheetHeader>
					<SheetTitle className="flex flex-col">
						<span>Detalles Descuento</span> <span>{discount.name}</span>
					</SheetTitle>
					<SheetDescription>{discount.description}</SheetDescription>
				</SheetHeader>
				<div className="flex flex-1 flex-col gap-2">
					<div className="border-b-2 pb-2 ">
						<div className="flex items-center gap-2 font-bold">
							<Icon name="id" />
							<span>ID</span>
						</div>
						<span>{discount.id.toUpperCase()}</span>
					</div>

					<div className="border-b-2 pb-2 ">
						<div className="flex items-center gap-2 font-bold">
							<Icon name="id" />
							<span>Método de aplicación</span>
						</div>
						<span>
							{discount.applicationMethod === DiscountApplicationMethod.BY_PRODUCT
								? discountAppmethodNames[DiscountApplicationMethod.BY_PRODUCT]
								: discountAppmethodNames[DiscountApplicationMethod.TO_TOTAL]}
						</span>
					</div>

					<div className="border-b-2 pb-2 ">
						<div className="flex items-center gap-2 font-bold">
							<Icon name="id" />
							<span>Tipo de descuento</span>
						</div>
						<span>
							{discount.type === DiscountType.FIXED
								? discountTypeNames[DiscountType.FIXED]
								: discountTypeNames[DiscountType.PERCENTAGE]}
						</span>
					</div>

					<div className="border-b-2 pb-2 ">
						<div className="flex items-center gap-2 font-bold">
							<Icon name="id" />
							<span>Cantidad minima requerida</span>
						</div>
						<span>
							{discount.minimumQuantity}
							{` ${discount.minimumQuantity !== 1 ? 'unidades' : 'unidad'}.`}
						</span>
					</div>

					<div className="border-b-2 pb-2 ">
						<div className="flex items-center gap-2 font-bold">
							<Icon name="id" />
							<span>Valor del Descuento</span>
						</div>
						<span>
							{`${
								discount.type === DiscountType.FIXED
									? formatCurrency(discount.value)
									: `${discount.value}%`
							} `}
						</span>
					</div>

					<div className="border-b-2 pb-2 ">
						<div className="flex items-center gap-2 font-bold">
							<Icon name="id" />
							<span>Periodo de validez</span>
						</div>
						<span>{formattedDates}</span>
					</div>
				</div>
				<Button asChild>
					<Link className="flex w-full gap-2" to={`/discounts/${discount.id}`}>
						<Icon name="link-2" />
						<span>Ir a descuento</span>
					</Link>
				</Button>
			</SheetContent>
		</Sheet>
	)
}
