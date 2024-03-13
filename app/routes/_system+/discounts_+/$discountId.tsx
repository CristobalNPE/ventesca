import { Button } from '#app/components/ui/button.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData, useNavigate } from '@remix-run/react'
import { format, formatDistance, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import {
	DISCOUNT_REACH_ITEM,
	DISCOUNT_TARGET_TOTAL,
	DISCOUNT_TYPE_PERCENTAGE,
	DiscountTarget,
	DiscountType,
} from './index.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)
	const discount = await prisma.discount.findUnique({
		where: { id: params.discountId },
		select: {
			id: true,
			createdAt: true,
			description: true,
			validFrom: true,
			validUntil: true,
			reach: true,
			target: true,
			type: true,
			value: true,
			isActive: true,
			updatedAt: true,
			minQuantity: true,
			items: { select: { id: true, code: true, name: true } },
			families: { select: { id: true, code: true, description: true } },
		},
	})

	invariantResponse(discount, 'Not found', { status: 404 })

	return json({ discount })
}

export default function DiscountRoute() {
	const navigate = useNavigate()
	const { discount } = useLoaderData<typeof loader>()

	return (
		<div className="flex w-fit flex-col gap-4">
			<div className="mb-4 flex items-center gap-2 text-2xl font-bold tracking-tight">
				<Icon name="tag" /> <span></span>
				<h1 className="">{discount.description}</h1>
			</div>

			<DiscountValidPeriodCard
				validFrom={discount.validFrom}
				validUntil={discount.validUntil}
				isActive={discount.isActive}
			/>
			<DiscountCard
				discountValue={discount.value}
				discountType={discount.type as DiscountType}
				discountTarget={discount.target as DiscountTarget}
			/>

			<DiscountMinQuantityCard minQuantity={discount.minQuantity} />

			{discount.reach === DISCOUNT_REACH_ITEM ? (
				<div className="flex items-center gap-7 rounded-md bg-secondary p-5 text-6xl text-foreground/70">
					<Icon name="package" className="flex-none" />
					<div className="flex flex-col">
						<span className="mb-2 text-3xl text-foreground">
							Artículos asociados
						</span>
						<ul>
							{discount.items.map(item => (
								<li
									key={item.id}
									className="flex cursor-pointer select-none gap-2 text-lg font-semibold tracking-tight hover:text-primary"
									onClick={() => navigate(`/inventory/${item.id}`)}
								>
									<p className="w-[3rem] font-bold">{item.code}</p>
									<p>{item.name}</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			) : (
				<div className="flex items-center gap-7 rounded-md bg-secondary p-5 text-6xl text-foreground/70">
					<Icon name="shapes" className="flex-none" />
					<div className="flex flex-col">
						<span className="mb-2 text-3xl text-foreground">
							Categorías asociadas
						</span>
						<ul>
							{discount.families.map(category => (
								<li
									key={category.id}
									className="flex cursor-pointer select-none gap-2 text-lg font-semibold tracking-tight hover:text-primary"
									onClick={() => navigate(`/categories/${category.id}`)}
								>
									<p className="w-[3rem] font-bold">{category.code}</p>
									<p>{category.description}</p>
								</li>
							))}
						</ul>
					</div>
				</div>
			)}

			<Button className="mt-2" onClick={() => navigate(-1)} variant={'outline'}>
				<Icon name="arrow-left" className="mr-2" />
				Volver
			</Button>
		</div>
	)
}

const DiscountCard = ({
	discountValue,
	discountType,
	discountTarget,
}: {
	discountValue: number
	discountType: DiscountType
	discountTarget: DiscountTarget
}) => {
	const target =
		discountTarget === DISCOUNT_TARGET_TOTAL
			? 'Aplicado sobre el total de artículos incluidos'
			: 'Aplicado individualmente sobre cada articulo incluido'

	const value =
		discountType === DISCOUNT_TYPE_PERCENTAGE
			? `${discountValue}%`
			: `${formatCurrency(discountValue)}`

	const type =
		discountType === DISCOUNT_TYPE_PERCENTAGE
			? 'Descuento porcentual'
			: 'Descuento fijo'

	return (
		<div className="flex items-center gap-7 rounded-md bg-secondary p-5 text-6xl text-foreground/70">
			{discountType === DISCOUNT_TYPE_PERCENTAGE ? (
				<Icon name="percentage" className="flex-none" />
			) : (
				<Icon name="circle-dollar-sign" className="flex-none" />
			)}
			<div className="flex flex-col">
				<span className="mb-2 text-3xl font-bold text-foreground">{value}</span>
				<span className="text-lg ">{type}</span>
				<span className="text-lg ">{target}</span>
			</div>
		</div>
	)
}

const DiscountValidPeriodCard = ({
	validFrom,
	validUntil,
	isActive,
}: {
	validFrom: string
	validUntil: string
	isActive: boolean
}) => {
	const discountIsValid = () => {
		const now = new Date()
		if (validFrom && validUntil) {
			return new Date(validFrom) <= now && new Date(validUntil) >= now
		}
		return false
	}

	const isDiscountActive = discountIsValid() && isActive

	type DiscountState = {
		label: string
		icon: IconName
	}
	const discountState: DiscountState = isDiscountActive
		? { label: 'Activo', icon: 'check' }
		: { label: 'Inactivo', icon: 'cross-1' }

	return (
		<div className="flex justify-between gap-4">
			<div className="text- flex items-center gap-7 rounded-md bg-secondary p-5 text-6xl text-foreground/70">
				<Icon name="clock" className="flex-none" />
				{discountIsValid() ? (
					<div className="flex flex-col gap-1">
						<span className="text-lg ">
							Activa desde el{' '}
							<span className="font-bold tracking-tight">
								{format(new Date(validFrom), "eeee d 'de' MMMM'", {
									locale: es,
								})}
							</span>
						</span>

						<span className="text-lg ">
							Expira en{' '}
							<span className="font-bold">
								{formatDistance(subDays(new Date(), 0), new Date(validUntil), {
									locale: es,
									addSuffix: false,
								})}
							</span>{' '}
							(
							{format(new Date(validUntil), "d 'de' MMMM', ' yyyy", {
								locale: es,
							})}
							)
						</span>
					</div>
				) : (
					<div className="flex flex-col gap-1">
						<span className="text-lg ">
							Activada el{' '}
							<span className="font-bold tracking-tight">
								{format(new Date(validFrom), "eeee d 'de' MMMM'", {
									locale: es,
								})}
							</span>
						</span>

						<span className="text-lg ">
							Expiró hace{' '}
							<span className="font-bold">
								{formatDistance(subDays(new Date(), 0), new Date(validUntil), {
									locale: es,
									addSuffix: false,
								})}
							</span>{' '}
							(
							{format(new Date(validUntil), "d 'de' MMMM', ' yyyy", {
								locale: es,
							})}
							)
						</span>
					</div>
				)}
			</div>
			<div
				className={cn(
					'flex flex-col items-center justify-center gap-1 rounded-md px-6 py-4 text-6xl text-background',
					isDiscountActive ? 'bg-primary' : 'bg-secondary text-foreground',
				)}
			>
				<Icon name={discountState.icon} className="flex-none" />
				<span className="text-xl font-bold uppercase tracking-tight">
					{discountState.label}
				</span>
			</div>
		</div>
	)
}
const DiscountMinQuantityCard = ({ minQuantity }: { minQuantity: number }) => {
	const formattedMinQuantity =
		minQuantity === 1 ? `${minQuantity} unidad` : `${minQuantity} unidades`

	return (
		<div className="flex items-center gap-7 rounded-md bg-secondary p-5 text-6xl text-foreground/70">
			<Icon name="arrow-up" />
			<div className="flex flex-col">
				<span className="mb-2 text-3xl font-bold text-foreground">
					{formattedMinQuantity}
				</span>
				<span className="text-lg ">Compra mínima para aplicar oferta</span>
			</div>
		</div>
	)
}
