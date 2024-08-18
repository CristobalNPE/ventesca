import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardHeader } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { cn } from '#app/utils/misc.tsx'
import { type Supplier } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'
import { format as formatRut } from '@validatecl/rut'
import { useMemo, useState } from 'react'

import { getBusinessSuppliers } from '#app/services/suppliers/suppliers-queries.server.ts'
import { useIsUserAdmin, useUser } from '#app/utils/user.ts'
import { LinkWithOrigin } from '#app/components/ui/link-origin.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const suppliers = await getBusinessSuppliers(businessId)

	return json({ suppliers })
}

export default function SuppliersRoute() {
	const { suppliers } = useLoaderData<typeof loader>()

	return (
		<ContentLayout
			limitHeight
			title={`Proveedores • ${suppliers.length} ${suppliers.length === 1 ? 'registrado' : 'registrados'}`}
			actions={<SuppliersActions />}
		>
			<div className="grid h-[85dvh]  items-start gap-4 lg:grid-cols-3 ">
				<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
					<SuppliersCard suppliers={suppliers} />
				</div>
				<div className="lg:col-span-2">
					<Outlet />
				</div>
			</div>
		</ContentLayout>
	)
}

function SuppliersActions() {
	const isAdmin = useIsUserAdmin()
	return (
		<>
			{isAdmin && (
				<Button asChild size="sm" className="flex items-center gap-2">
					<LinkWithOrigin to={'new'} unstable_viewTransition>
						<Icon name="plus" />
						<span>Registrar nuevo Proveedor</span>
					</LinkWithOrigin>
				</Button>
			)}
		</>
	)
}

function SuppliersCard({
	suppliers,
}: {
	suppliers: SerializeFrom<
		Pick<Supplier, 'id' | 'code' | 'rut' | 'fantasyName'>
	>[]
}) {
	const [searchQuery, setSearchQuery] = useState('')

	const filteredSuppliers = useMemo(() => {
		return suppliers.filter(
			(supplier) =>
				supplier.fantasyName
					.toLowerCase()
					.includes(searchQuery.toLowerCase().trim()) ||
				supplier.rut.toLowerCase().includes(searchQuery.toLowerCase().trim()),
		)
	}, [suppliers, searchQuery])

	return (
		<Card className="h-fit">
			<CardHeader className="sticky top-0 z-10 mb-1 flex gap-3 bg-card px-7">
				<div className="relative">
					<Input
						autoFocus
						className="w-full pr-[3rem] "
						type="text"
						placeholder="Buscar proveedor"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					<Icon
						name="magnifying-glass"
						className="absolute bottom-1/2 right-4 translate-y-1/2 transform"
					/>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-1 ">
				{filteredSuppliers.map((supplier) => (
					<LinkWithOrigin
						key={supplier.id}
						prefetch={'intent'}
						unstable_viewTransition
						className={({ isActive }) =>
							cn(
								'flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						preserveSearch
						to={supplier.id}
					>
						<span className="flex items-center text-nowrap font-semibold">
							#{supplier.code.toString().padStart(3, '0')}{' '}
							<Icon name="dot" size="lg" className="shrink-0" />
						</span>

						<span className="flex-1 text-nowrap font-semibold">
							{formatRut(supplier.rut) ?? supplier.rut}
						</span>

						<span className="text-nowrap  text-start  text-muted-foreground">
							{supplier.fantasyName}
						</span>
					</LinkWithOrigin>
				))}
			</CardContent>
		</Card>
	)
}
