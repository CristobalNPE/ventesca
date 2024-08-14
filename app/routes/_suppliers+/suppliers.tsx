import { type Supplier } from '@prisma/client'
import { Label } from '@radix-ui/react-label'
import {
	json,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import {
	Link,
	Outlet,
	useLoaderData,
	useLocation,
	Form,
	useSearchParams,
	useSubmit,
} from '@remix-run/react'
import { format as formatRut } from '@validatecl/rut'
import { useId } from 'react'
import { Spacer } from '#app/components/spacer.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
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
import { cn , useDebounce, useIsPending } from '#app/utils/misc.tsx'


import { userHasRole, useUser } from '#app/utils/user.ts'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const suppliers = await prisma.supplier.findMany({
		where: { businessId },
		select: { id: true, rut: true, fantasyName: true },
	})

	return json({ suppliers })
}

export default function SuppliersRoute() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'Administrador')

	const { suppliers } = useLoaderData<typeof loader>()

	return (
		<ContentLayout title='Proveedores' limitHeight>
			<main className=" h-full">
				<div className="grid h-[85dvh]  items-start gap-4 lg:grid-cols-3 ">
					<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
						{isAdmin ? (
							<Button asChild className="flex items-center gap-2">
								<Link to={'new'}>
									<Icon name="plus" />
									<span>Registrar nuevo Proveedor</span>
								</Link>
							</Button>
						) : null}
						<SuppliersCard suppliers={suppliers} />
					</div>
					<div className="lg:col-span-2">
						<Outlet />
					</div>
				</div>
			</main>
		</ContentLayout>
	)
}

function SuppliersCard({
	suppliers,
}: {
	suppliers: SerializeFrom<Pick<Supplier, 'id' | 'rut' | 'fantasyName'>>[]
}) {


	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 mb-1 flex gap-3 bg-card px-7">
				<CardTitle>Proveedores registrados</CardTitle>
				<CardDescription>
					Actualmente existen {suppliers.length} proveedores registrados en
					sistema.
				</CardDescription>
				<SupplierSearchBar status={'idle'} />
			</CardHeader>
			<CardContent className="flex flex-col gap-1 ">
				{suppliers.map(supplier => (
					<LinkWithParams
						key={supplier.id}
						prefetch={'intent'}
						className={({ isActive }) =>
							cn(
								'flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						preserveSearch
						to={supplier.id}
					>
						<span className="flex-1 text-nowrap font-semibold">
							{formatRut(supplier.rut)}
						</span>

						<span className="w-[15rem] text-nowrap  text-start  text-muted-foreground">
							{supplier.fantasyName}
						</span>
					</LinkWithParams>
				))}
			</CardContent>
		</Card>
	)
}
function SupplierSearchBar({
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
		formAction: '/suppliers',
	})

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action="/suppliers"
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

