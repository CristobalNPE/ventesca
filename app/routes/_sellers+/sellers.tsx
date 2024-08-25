import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card, CardContent, CardHeader } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc } from '#app/utils/misc.tsx'
import { type Role, type User, type UserImage } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData } from '@remix-run/react'

import { Input } from '#app/components/ui/input.js'
import { LinkWithOrigin } from '#app/components/ui/link-origin.js'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { useIsUserAdmin } from '#app/utils/user.ts'
import { useMemo, useState } from 'react'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const sellers = await prisma.user.findMany({
		where: { businessId, isDeleted: false },
		select: {
			id: true,
			username: true,
			name: true,
			roles: true,
			image: true,
			email: true,
		},
	})

	return json({ sellers: sellers.filter((seller) => seller.id !== userId) })
}

export default function SellersRoute() {
	const { sellers } = useLoaderData<typeof loader>()

	return (
		<ContentLayout
			title={`Vendedores • ${sellers.length} ${sellers.length === 1 ? 'registrado' : 'registrados'}`}
			actions={!!sellers.length && <SellersActions />}
			limitHeight
		>
			<div className="grid h-[85dvh]   items-start gap-4 lg:grid-cols-3 ">
				{!!sellers.length ? (
					<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
						<SellersCard sellers={sellers} />
					</div>
				) : (
					<EmptySellers />
				)}

				<div className="lg:col-span-2">
					<Outlet />
				</div>
			</div>
		</ContentLayout>
	)
}

function EmptySellers() {
	const isAdmin = useIsUserAdmin()
	return (
		<div className="flex h-full flex-1 flex-col items-center justify-center gap-2 rounded-md bg-card lg:col-span-1">
			<Icon name="user-dollar" className="h-16 w-16" />
			<p className="text-center text-muted-foreground">
				Aún no hay vendedores registrados
			</p>
			{isAdmin && (
				<Button asChild className="flex items-center gap-2">
					<Link to={'new'}>
						<Icon name="user-plus" />
						<span>Registrar nuevo vendedor</span>
					</Link>
				</Button>
			)}
		</div>
	)
}

function SellersActions() {
	const isAdmin = useIsUserAdmin()

	return (
		<>
			{isAdmin && (
				<Button asChild size={"sm"} className="flex items-center gap-2">
					<LinkWithOrigin unstable_viewTransition to={'new'}>
						<Icon name="user-plus" />
						<span>Registrar nuevo vendedor</span>
					</LinkWithOrigin>
				</Button>
			)}
		</>
	)
}

type SellerDisplayData = Pick<User, 'id' | 'name' | 'email' | 'username'> & {
	roles: Role[]
	image: UserImage | null
}

function SellersCard({
	sellers,
}: {
	sellers: SerializeFrom<SellerDisplayData>[]
}) {
	const [searchQuery, setSearchQuery] = useState('')
	const filteredSellers = useMemo(() => {
		return sellers.filter(
			(seller) =>
				seller.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
				seller.email?.toLowerCase().includes(searchQuery.toLowerCase().trim()),
		)
	}, [sellers, searchQuery])

	return (
		<Card className="h-fit">
			<CardHeader className="sticky top-0 z-10 bg-card px-7">
				<div className="relative">
					<Input
						autoFocus
						className="w-full pr-[3rem]"
						type="text"
						placeholder="Buscar vendedor"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
					/>
					<Icon
						name="magnifying-glass"
						className="absolute bottom-1/2 right-4 translate-y-1/2 transform"
					/>
				</div>
			</CardHeader>
			<CardContent className="flex w-full flex-col gap-3">
				{filteredSellers.map((seller) => (
					<LinkWithOrigin
						key={seller.id}
						prefetch={'intent'}
						preserveSearch
						unstable_viewTransition
						className={({ isActive }) =>
							cn(
								' flex flex-wrap items-center  justify-between gap-2 overflow-clip rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						to={seller.id}
					>
						<div className="flex flex-wrap items-center gap-4  ">
							<span className="sr-only">Detalles vendedor</span>
							<img
								className="h-8 w-8 shrink-0  rounded-full border object-cover  "
								alt={seller.name ?? seller.username}
								src={getUserImgSrc(seller.image?.id)}
							/>

							<div className="flex flex-col   ">
								<span className="font-bold">{seller.name}</span>
								<span className="text-muted-foreground ">{seller.email}</span>
							</div>
						</div>

						<div className="ml-auto  text-right">
							<Badge variant={'default'}>{seller.roles[0]?.name}</Badge>
						</div>
					</LinkWithOrigin>
				))}
			</CardContent>
		</Card>
	)
}
