import { Spacer } from '#app/components/spacer.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
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
import { cn, formatCurrency, getUserImgSrc } from '#app/utils/misc.tsx'
import { Category, Role, User, UserImage } from '@prisma/client'
import {
	ActionFunctionArgs,
	json,
	LoaderFunctionArgs,
	redirectDocument,
	SerializeFrom,
} from '@remix-run/node'
import { Link, Outlet, useLoaderData, useLocation } from '@remix-run/react'

import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { userHasRole, useUser } from '#app/utils/user.ts'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { endOfWeek, startOfWeek } from 'date-fns'
import { z } from 'zod'
import { TransactionStatus } from '../transaction+/_types/transaction-status.ts'
import { Badge } from '#app/components/ui/badge.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const sellers = await prisma.user.findMany({
		where: { businessId },
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

// export async function action({ request }: ActionFunctionArgs) {
// 	const userId = await requireUserWithRole(request, 'Administrador')
// 	const businessId = await getBusinessId(userId)
// 	const formData = await request.formData()
// 	const intent = formData.get('intent')

// 	invariantResponse(intent, 'Intent should be defined.')

// 	switch (intent) {
// 		case CREATE_CATEGORY_KEY: {
// 			return await handleCreateCategory(formData, businessId)
// 		}
// 	}
// }

export default function SellersRoute() {
	const { sellers } = useLoaderData<typeof loader>()

	if (sellers.length === 0) {
		return (
			<div className="flex flex-col gap-4 h-full items-center justify-center rounded-sm border border-dashed text-muted-foreground">
				<p>Sin vendedores registrados en sistema.</p>
				<Button className="flex items-center gap-2">
					<Icon name="user-plus" />
					<span>Registrar nuevo vendedor</span>
				</Button>
			</div>
		)
	}

	return (
		<main className=" h-full">
			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
				<h1 className="text-xl font-semibold">Vendedores</h1>
			</div>
			<Spacer size={'4xs'} />

			<div className="grid h-[85dvh]  items-start gap-4 lg:grid-cols-3 ">
				<div className="flex h-full flex-1 flex-col gap-4 overflow-hidden lg:col-span-1">
					<Card>
						<CardHeader>
							<Button className="flex items-center gap-2">
								<Icon name="user-plus" />
								<span>Registrar nuevo vendedor</span>
							</Button>
						</CardHeader>
					</Card>

					<SellersTable sellers={sellers} />
				</div>
				<div className="lg:col-span-2">
					<Outlet />
				</div>
			</div>
		</main>
	)
}

type SellerDisplayData = Pick<User, 'id' | 'name' | 'email' | 'username'> & {
	roles: Role[]
	image: UserImage | null
}

//Need to create custom type
function SellersTable({
	sellers,
}: {
	sellers: SerializeFrom<SellerDisplayData>[]
}) {
	const location = useLocation()

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
						className={
							'flex items-center justify-between rounded-sm p-2 text-sm hover:bg-secondary '
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
