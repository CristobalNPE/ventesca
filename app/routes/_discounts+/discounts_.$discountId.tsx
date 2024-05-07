import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse } from '#app/utils/misc.tsx'
import { LoaderFunctionArgs, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

export async function loader({ request, params }: LoaderFunctionArgs) {
	await requireUserId(request)

	const discount = await prisma.discount.findUnique({
		where: { id: params.discountId },
		select: {
			id: true,
			name: true,
			description: true,
			isActive: true,
			minimumQuantity: true,
			scope: true,
			type: true,
      applicationMethod:true,
			value: true,
			items: { select: { id: true, name: true } },
		},
	})

	invariantResponse(discount, 'Not found', { status: 404 })

	return json({ discount })
}

export default function DiscountRoute() {
	const { discount } = useLoaderData<typeof loader>()

	return (
		<>
			<div>{discount.id}</div>
			<div>{discount.name}</div>
			<div>{discount.description}</div>
			<div>active? : {discount.isActive ? 'active' : 'inactive'}</div>
			<div>{discount.minimumQuantity}</div>
			<div>{discount.scope}</div>
			<div>{discount.type}</div>
			<div>{discount.applicationMethod}</div>
			<div>{discount.value}</div>
      Items:
			{discount.items.map(item => (
				<div key={item.id}>{item.name}</div>
			))}
		</>
	)
}
