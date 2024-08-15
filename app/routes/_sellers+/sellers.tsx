import { type Role, type User, type UserImage } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react'
import { ContentLayout } from '#app/components/layout/content-layout.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, getUserImgSrc } from '#app/utils/misc.tsx'

import { requireUserWithRole } from '#app/utils/permissions.server.ts'

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

	return json({ sellers: sellers.filter(seller => seller.id !== userId) })
}

export default function SellersRoute() {
	const { sellers } = useLoaderData<typeof loader>()

	return (
		<ContentLayout
			title="Vendedores"
			actions={
				<Button asChild className="flex items-center gap-2">
					<Link to={'new'}>
						<Icon name="user-plus" />
						<span>Registrar nuevo vendedor</span>
					</Link>
				</Button>
			}
		>
			<main className=" h-full">
				<div className="grid h-[85dvh]  items-start gap-4 lg:grid-cols-3 ">
					<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
						{sellers.length === 0 ? (
							<div className="flex h-full flex-col items-center justify-center gap-4 rounded-sm border border-dashed text-muted-foreground">
								<p>Sin vendedores registrados en sistema.</p>
								<Button asChild className="flex items-center gap-2">
									<Link to={'new'}>
										<Icon name="user-plus" />
										<span>Registrar nuevo vendedor</span>
									</Link>
								</Button>
							</div>
						) : (
							<>
								<Card>
									<CardHeader>
										<Button asChild className="flex items-center gap-2">
											<Link to={'new'}>
												<Icon name="user-plus" />
												<span>Registrar nuevo vendedor</span>
											</Link>
										</Button>
									</CardHeader>
								</Card>
								<SellersCard sellers={sellers} />
							</>
						)}
					</div>
					<div className="lg:col-span-2">
						<Outlet />
					</div>
				</div>
			</main>
		</ContentLayout>
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
	return (
		<Card className="no-scrollbar relative  h-full flex-grow overflow-y-auto">
			<CardHeader className="sticky top-0 z-10 bg-card px-7">
				<CardTitle>Vendedores registrados</CardTitle>
				<CardDescription>
					Actualmente existen {sellers.length} vendedores registrados en
					sistema.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex w-full flex-col gap-3">
				{sellers.map(seller => (
					<LinkWithParams
						key={seller.id}
						prefetch={'intent'}
						preserveSearch
						className={({ isActive }) =>
							cn(
								'flex flex-wrap items-center justify-between gap-2 rounded-sm border-2 border-l-8 border-transparent border-b-secondary/30 border-l-secondary/80 p-2 text-sm transition-colors hover:bg-secondary ',
								isActive && 'border-primary/10 bg-secondary',
							)
						}
						to={seller.id}
					>
						<div className="flex items-center gap-4">
							<span className="sr-only">Detalles vendedor</span>
							<img
								className="h-8 w-8 shrink-0  rounded-full border object-cover  "
								alt={seller.name ?? seller.username}
								src={getUserImgSrc(seller.image?.id)}
							/>

							<div className="flex flex-col">
								<span className="font-bold">{seller.name}</span>
								<span className="text-muted-foreground">{seller.email}</span>
							</div>
						</div>

						<div className="text-right">
							<Badge variant={'default'}>{seller.roles[0]?.name}</Badge>
						</div>
					</LinkWithParams>
				))}
			</CardContent>
		</Card>
	)
}
