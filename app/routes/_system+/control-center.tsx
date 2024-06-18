import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '#app/components/ui/alert.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { OrderStatus } from '../order+/_types/order-status.ts'


export default function ControlCenter() {

	return (
		<>
			<h1 className="text-2xl">Centro de Control</h1>

		
		</>
	)
}
