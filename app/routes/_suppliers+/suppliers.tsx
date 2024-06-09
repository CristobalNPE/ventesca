import { Spacer } from '#app/components/spacer.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
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
import { cn } from '#app/utils/misc.tsx'
import { Supplier } from '@prisma/client'
import { json, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node'
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react'
import { format as formatRut } from '@validatecl/rut'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { useDebounce, useIsPending } from '#app/utils/misc.tsx'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { Label } from '@radix-ui/react-label'
import { Form, useSearchParams, useSubmit } from '@remix-run/react'
import { useId } from 'react'

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
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Proveedores</h1>
			</div>
			<Spacer size={'4xs'} />

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
					<SuppliersTable suppliers={suppliers} />
				</div>
				<div className="lg:col-span-2">
					<Outlet />
				</div>
			</div>
		</main>
	)
}

function SuppliersTable({
	suppliers,
}: {
	suppliers: SerializeFrom<Pick<Supplier, 'id' | 'rut' | 'fantasyName'>>[]
}) {
	const location = useLocation()

	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 bg-card px-7">
				<CardTitle>Proveedores registrados</CardTitle>
				<CardDescription>
					Actualmente existen {suppliers.length} proveedores registrados en
					sistema.
				</CardDescription>
				<SupplierSearchBar status={'idle'} />
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader className="sticky top-[9rem] rounded-t-sm bg-secondary">
						<TableRow>
							<TableHead></TableHead>
							<TableHead>RUT</TableHead>
							<TableHead className="text-right">Empresa</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{suppliers.map(supplier => (
							<TableRow
								key={supplier.id}
								className={cn(
									'duration-0 hover:bg-secondary/30',
									location.pathname.includes(supplier.id) &&
										'bg-secondary/50 hover:bg-secondary/50',
								)}
							>
								<TableCell className="text-xs uppercase">
									<Button size={'sm'} className="h-7 w-7" asChild>
										<LinkWithParams
											prefetch={'intent'}
											className={''}
											preserveSearch
											to={supplier.id}
										>
											<span className="sr-only">Detalles proveedor</span>
											<Icon className="shrink-0" name="file-text" />
										</LinkWithParams>
									</Button>
								</TableCell>
								<TableCell className="text-xs uppercase">
									{formatRut(supplier.rut)}
								</TableCell>

								<TableCell className="text-right font-semibold">
									{supplier.fantasyName}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
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

// async function handleCreateCategory(formData: FormData, businessId: string) {
// 	const submission = await parseWithZod(formData, {
// 		schema: CreateCategorySchema.superRefine(async (data, ctx) => {
// 			const categoryByCode = await prisma.category.findFirst({
// 				select: { id: true, code: true },
// 				where: { businessId, code: data.code },
// 			})

// 			if (categoryByCode) {
// 				ctx.addIssue({
// 					path: ['code'],
// 					code: z.ZodIssueCode.custom,
// 					message: 'El código ya existe.',
// 				})
// 			}
// 		}),

// 		async: true,
// 	})

// 	if (submission.status !== 'success') {
// 		return json(
// 			{ result: submission.reply() },
// 			{ status: submission.status === 'error' ? 400 : 200 },
// 		)
// 	}

// 	const { code, description } = submission.value

// 	const createdCategory = await prisma.category.create({
// 		data: {
// 			code,
// 			description,
// 			business: { connect: { id: businessId } },
// 		},
// 	})

// 	return redirectDocument(`/categories/${createdCategory.id}`)
// }
