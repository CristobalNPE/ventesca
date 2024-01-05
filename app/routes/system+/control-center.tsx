import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

export async function loader({ request }: LoaderFunctionArgs) {
	//Count items with 0 stock
	const itemsWithZeroStock = await prisma.item.count({
		where: {
			stock: 0,
		},
	})

	return json({ itemsWithZeroStock })
}

export default function ControlCenter() {
	const isAdmin = true

	const { itemsWithZeroStock } = useLoaderData<typeof loader>()

	return (
		<>
			<h1 className="text-2xl">Centro de Control</h1>

			<Alert variant="destructive">
				<Icon name="exclamation-circle" size='xl' />
				<AlertTitle>Sin Stock</AlertTitle>
				<AlertDescription>
					{itemsWithZeroStock} artículos no tienen stock y necesitan revision.
				</AlertDescription>
			</Alert>
		</>
	)
}
