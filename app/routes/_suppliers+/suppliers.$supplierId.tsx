import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Card } from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import { requireUserWithRole } from '#app/utils/permissions.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import { useIsUserAdmin, useUser } from '#app/utils/user.ts'

import { AssociatedProductsCard } from '#app/components/suppliers/supplier-associated-products-card.tsx'
import {
	DeleteSupplier,
	deleteSupplierActionIntent,
	DeleteSupplierSchema,
} from '#app/components/suppliers/supplier-delete.tsx'
import { SupplierDetails } from '#app/components/suppliers/supplier-details.tsx'
import { TopSupplierProductsChart } from '#app/components/suppliers/supplier-top-products-chart.tsx'
import { LinkWithOrigin } from '#app/components/ui/link-origin.tsx'
import { SupplierProvider } from '#app/context/suppliers/SupplierContext.tsx'
import { getDefaultSupplier } from '#app/services/suppliers/suppliers-queries.server.ts'
import { getSupplierTopSellingProducts } from '#app/services/suppliers/supplier-analytics.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const supplier = await prisma.supplier.findUnique({
		where: { id: params.supplierId, businessId },
		select: {
			id: true,
			code: true,
			address: true,
			rut: true,
			name: true,
			city: true,
			fantasyName: true,
			phone: true,
			email: true,
			createdAt: true,
			updatedAt: true,
			products: { select: { id: true, code: true, name: true } },
			isEssential: true,
		},
	})

	invariantResponse(supplier, 'Not Found', { status: 404 })

	const topSellingProducts = await getSupplierTopSellingProducts(supplier.id)

	return json({ supplier, topSellingProducts })
}

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)
	const formData = await request.formData()
	const intent = formData.get('intent')
	invariantResponse(intent, 'Intent should be defined.')
	switch (intent) {
		case deleteSupplierActionIntent: {
			return await deleteSupplierAction({ formData, businessId })
		}
	}
}

export default function SupplierRoute() {
	const loaderData = useLoaderData<typeof loader>()
	const user = useUser()
	const isAdmin = useIsUserAdmin()
	const canModify = isAdmin && !loaderData.supplier.isEssential

	return (
		<SupplierProvider data={loaderData}>
			<main className="">
				<section className="grid gap-4 xl:grid-cols-2 ">
					<SupplierDetails />
					<div className="flex flex-col gap-4">
						{canModify && <ActionsCard />}
						<AssociatedProductsCard />
						<TopSupplierProductsChart />
					</div>
				</section>
			</main>
		</SupplierProvider>
	)
}

function ActionsCard() {
	return (
		<Card className="flex h-fit flex-col gap-4 p-4 sm:flex-row">
			<Button className="w-full" size={'sm'} asChild>
				<LinkWithOrigin to={`edit`} unstable_viewTransition>
					<Icon name="pencil-2">Modificar datos</Icon>
				</LinkWithOrigin>
			</Button>
			<DeleteSupplier />
		</Card>
	)
}

async function deleteSupplierAction({
	formData,
	businessId,
}: {
	formData: FormData
	businessId: string
}) {
	const submission = parseWithZod(formData, {
		schema: DeleteSupplierSchema,
	})

	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}

	const { supplierId } = submission.value

	const supplier = await prisma.supplier.findFirst({
		select: { id: true, fantasyName: true, products: true },
		where: { id: supplierId },
	})

	const defaultSupplier = await getDefaultSupplier(businessId)

	invariantResponse(supplier, 'Supplier not found', { status: 404 })

	await prisma.$transaction(async (tx) => {
		//Move all products to default supplier
		await tx.product.updateMany({
			where: { supplierId: supplier.id },
			data: { supplierId: defaultSupplier.id },
		})

		await tx.supplier.delete({ where: { id: supplier.id } })
	})

	const description =
		supplier.products.length === 0
			? `Proveedor "${supplier.fantasyName}" eliminado.`
			: supplier.products.length === 1
				? `Proveedor "${supplier.fantasyName}" eliminado. Producto '${supplier.products[0]!.name}' movido a '${defaultSupplier.fantasyName}'`
				: `Proveedor "${supplier.fantasyName}" eliminado. ${supplier.products.length} productos movidos a '${defaultSupplier.fantasyName}'`

	return redirectWithToast(`/suppliers`, {
		type: 'success',
		title: 'Proveedor eliminado',
		description,
	})
}

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>No tiene los permisos necesarios.</p>,
				404: ({ params }) => (
					<div className="flex flex-col items-center justify-center gap-2">
						<Icon className="text-5xl" name="exclamation-circle" />
						<p>No existe proveedor con ID:</p>
						<p className="text-lg">"{params.supplierId}"</p>
					</div>
				),
			}}
		/>
	)
}
