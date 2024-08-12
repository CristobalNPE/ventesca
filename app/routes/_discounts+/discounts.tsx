import { json, type LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	Link,
	useLoaderData,
	useNavigate,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { useId, useRef } from 'react'
import { PaginationBar } from '#app/components/pagination-bar.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { DataCard } from '#app/components/ui/data-card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, useDebounce, useIsPending } from '#app/utils/misc.tsx'
// import { updateDiscountValidity } from './discounts_.$discountId'


export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const $top = Number(url.searchParams.get('$top')) || 5
	const $skip = Number(url.searchParams.get('$skip')) || 0
	const searchTerm = url.searchParams.get('search') ?? ''

	const discounts = await prisma.discount.findMany({
		take: $top,
		skip: $skip,
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true,
			description: true,
			validFrom: true,
			validUntil: true,
			isActive: true,
		},
		where: {
			businessId,
			name: { contains: searchTerm },
		},
	})

	//Check discounts state (isActive) before sending it to the page.
	// for (let discount of discounts) {
	// 	await updateDiscountValidity(discount)
	// }
	const amountOfActiveDiscounts = await prisma.discount.count({
		where: { isActive: true, businessId },
	})
	return json({ discounts, amountOfActiveDiscounts })
}

export default function DiscountsPage() {
	const { discounts, amountOfActiveDiscounts } = useLoaderData<typeof loader>()
	const isAdmin = true

	const divRef = useRef<HTMLDivElement>(null)

	const scrollToElement = () => {
		const { current } = divRef
		if (current !== null) {
			current?.scrollIntoView({ behavior: 'smooth' })
		}
	}

	return (
		<main className="flex flex-col">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Descuentos y Promociones</h1>
				{isAdmin && (
					<Button variant={'outline'} asChild>
						<Link
							onClick={() => scrollToElement()}
							preventScrollReset={true}
							to={'new'}
							className="flex items-center justify-center gap-2"
						>
							<Icon name="plus" />
							<span>Registrar Descuento</span>
						</Link>
					</Button>
				)}
			</div>
			<Spacer size={'4xs'} />
			<div className="flex flex-col  ">
				{/* <div className="grid gap-4 md:grid-cols-2 md:gap-8">
					<DataCard
						title={'Descuentos Activos'}
						value={amountOfActiveDiscounts.toString()}
						icon={'tag'}
						subtext={'22 descuentos expiran pronto.'}
					/>
					<DataCard
						title={'Descuento Destacado'}
						value={'Descuento Invierno 2024'}
						icon={'tag'}
						subtext={'Utilizado 42 veces.'}
					/>
				</div> */}
				{/* <Spacer size={'4xs'} /> */}
				<DiscountsTableCard totalDiscounts={0} discounts={discounts} />
			</div>
		</main>
	)
}

type DiscountData = {
	id: string
	name: string
	description: string
	isActive: boolean
}
function DiscountsTableCard({
	discounts,
	totalDiscounts,
}: {
	discounts: DiscountData[]
	totalDiscounts: number
}) {
	const navigate = useNavigate()

	return (
		<Card className="   xl:col-span-2">
			<CardHeader className="flex flex-col items-center text-center md:flex-row md:justify-between md:text-left">
				<div className="grid gap-2">
					<CardTitle>Descuentos</CardTitle>
					<CardDescription>
						Mostrando {discounts.length} de {totalDiscounts} descuentos
						registrados.
					</CardDescription>
				</div>

				<DiscountSearchBar status="idle" autoSubmit />
			</CardHeader>
			<CardContent className="h-full ">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Detalles</TableHead>

							<TableHead className="text-right">Estado</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody>
						{discounts.map(discount => (
							<TableRow
								key={discount.id}
								className="cursor-pointer"
								onClick={() => navigate(discount.id)}
							>
								<TableCell>
									<div className="font-medium uppercase">{discount.name}</div>
									<div className="text-xs uppercase text-muted-foreground">
										{discount.description}
									</div>
								</TableCell>

								<TableCell className="text-right">
									<Badge
										variant={'outline'}
										className={cn(
											discount.isActive ? 'text-primary' : 'text-destructive',
										)}
									>
										{discount.isActive ? 'Activo' : 'Inactivo'}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
			<CardFooter className="flex justify-center md:justify-end">
				<PaginationBar top={50} total={totalDiscounts} />
			</CardFooter>
		</Card>
	)
}

function DiscountSearchBar({
	status,
	autoFocus = false,
	autoSubmit = false,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'

	autoFocus?: boolean
	autoSubmit?: boolean
}) {
	const id = useId()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'GET',
		formAction: '/inventory',
	})

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action="/inventory"
			className="flex flex-wrap items-center justify-center gap-1"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<Label htmlFor={id} className="sr-only">
					Buscar
				</Label>
				<Input
					type="text"
					name="search"
					id={id}
					defaultValue={searchParams.get('search') ?? ''}
					placeholder="Búsqueda"
					className=" [&::-webkit-inner-spin-button]:appearance-none"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
					size="sm"
				>
					<Icon name="magnifying-glass" size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</div>
		</Form>
	)
}
