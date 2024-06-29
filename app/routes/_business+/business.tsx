import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Spacer } from '#app/components/spacer.tsx'
import VentescaLogoDark from '#app/routes/_marketing+/logos/ventesca-dark.png'
import VentescaLogoLight from '#app/routes/_marketing+/logos/ventesca-light.png'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, getBusinessImgSrc } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import { OrderStatus } from '../order+/_types/order-status'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const business = await prisma.business.findUniqueOrThrow({
		include: { image: true },
		where: { id: businessId },
	})

	const numberOfProducts = await prisma.product.count({
		where: { businessId },
	})
	const numberOfCompletedOrders = await prisma.order.count({
		where: { businessId, status: OrderStatus.FINISHED },
	})
	const totalProfits = await prisma.order.aggregate({
		_sum: {
			total: true,
		},
		where: { businessId, status: OrderStatus.FINISHED },
	})

	return json({
		business,
		numberOfProducts,
		numberOfCompletedOrders,
		totalProfits,
	})
}

export default function ProfileRoute() {
	const { business, numberOfProducts, numberOfCompletedOrders, totalProfits } =
		useLoaderData<typeof loader>()

	return (
		<div className="container mb-48 mt-36 flex flex-col items-center justify-center">
			<Spacer size="4xs" />

			<div className="container flex flex-col items-center rounded-3xl bg-muted p-12">
				<div className="relative w-52">
					<div className="absolute -top-40">
						<div className="relative">
							<img
								src={
									business.image
										? getBusinessImgSrc(business.image.id)
										: VentescaLogoDark
								}
								alt={business.name}
								className="hidden h-52 w-52 rounded-full bg-primary object-cover dark:flex"
							/>
							<img
								src={
									business.image
										? getBusinessImgSrc(business.image.id)
										: VentescaLogoLight
								}
								alt={business.name}
								className="flex h-52 w-52 rounded-full bg-primary object-cover dark:hidden"
							/>
						</div>
					</div>
				</div>

				<Spacer size="sm" />

				<div className="flex flex-col items-center">
					<div className="flex flex-wrap items-center justify-center gap-4">
						<h1 className="text-center text-h2">{business.name}</h1>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-4">
						<h1 className="text-center text-h4">{business.address}</h1>
						<h1 className="text-center text-h4">{business.email}</h1>
						<h1 className="text-center text-h4">{business.phone}</h1>
						<h1 className="text-center text-h4">
							{numberOfProducts} productos.
						</h1>
						<h1 className="text-center text-h4">
							{numberOfCompletedOrders} transacciones completadas.
						</h1>
						<h1 className="text-center text-h4">
							{formatCurrency(totalProfits._sum.total)} ganancias totales.
						</h1>
					</div>
				</div>
			</div>
		</div>
	)
}

// export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
// 	const displayName = data?.user.name ?? params.username
// 	return [
// 		{ title: `${displayName} | Epic Notes` },
// 		{
// 			name: 'description',
// 			content: `Profile of ${displayName} on Epic Notes`,
// 		},
// 	]
// }

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				404: ({ params }) => (
					<p>No user with the username "{params.username}" exists</p>
				),
			}}
		/>
	)
}

// import { json, type LoaderFunctionArgs } from '@remix-run/node'
// import { useLoaderData } from '@remix-run/react'
// import { Spacer } from '#app/components/spacer.tsx'
// import { getBusinessId } from '#app/utils/auth.server.ts'
// import { prisma } from '#app/utils/db.server.ts'

// import { requireUserWithRole } from '#app/utils/permissions.server.js'
// import { userHasRole, useUser } from '#app/utils/user.ts'

// export async function loader({ request }: LoaderFunctionArgs) {
// 	const userId = await requireUserWithRole(request, 'Administrador')
// 	const businessId = await getBusinessId(userId)

// 	const business = await prisma.business.findUniqueOrThrow({
// 		where: { id: businessId },
// 	})

// 	return json({ business })
// }

// export default function SuppliersRoute() {
// 	const user = useUser()
// 	const isAdmin = userHasRole(user, 'Administrador')

// 	const { business } = useLoaderData<typeof loader>()

// 	return (
// 		<main className=" h-full">
// 			<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center md:flex-row md:text-left">
// 				<h1 className="text-xl font-semibold">Detalles de la empresa</h1>
// 			</div>
// 			<Spacer size={'4xs'} />

// 			<div className="text-3xl">{business.name}</div>
// 		</main>
// 	)
// }
