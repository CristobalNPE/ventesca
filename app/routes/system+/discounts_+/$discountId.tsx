import { Icon } from '#app/components/ui/icon.tsx'
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
			createdAt: true,
			description: true,
			validFrom: true,
			validUntil: true,
			reach: true,
			target: true,
			type: true,
			value: true,
      isActive: true,
			updatedAt: true,
			minQuantity: true,
			items: { select: { id: true, code: true, name: true } },
			families: { select: { id: true, code: true, description: true } },
		},
	})

	invariantResponse(discount, 'Not found', { status: 404 })

	return json({ discount })
}

export default function DiscountRoute() {
	const { discount } = useLoaderData<typeof loader>()

	return (
		<div>
			<div className="">
				<Icon name="tag" /> <span></span>
			</div>
      <h1 className='text-2xl'>{discount.description}</h1>
			<p>{discount.value}</p>
      <p>{discount.type}</p>
      <p>{discount.target}</p>
      <p>{discount.reach}</p>
      <p>{discount.minQuantity}</p>
      <p>{discount.validFrom}</p>
      <p>{discount.validUntil}</p>
      <p>{discount.isActive?"true":"false"}</p>

			{discount.reach === 'by-item' ? (
				<div className='bg-secondary mt-5'>
					<h2>Items asociados</h2>
					<ul>
						{discount.items.map(item => (
							<li key={item.id}>
								<p>{item.code}</p>
								<p>{item.name}</p>
							</li>
						))}
					</ul>
				</div>
			) : (
				<div className='bg-secondary mt-5'>
					<h2>Categorías asociadas</h2>
					<ul>
						{discount.families.map(category => (
							<li key={category.id}>
								<p>{category.code}</p>
								<p>{category.description}</p>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
