import { Button } from '#app/components/ui/button.tsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { CardDescription, CardTitle } from '#app/components/ui/card.tsx'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.js'
import { Icon } from '#app/components/ui/icon.tsx'
import { OrderStatus } from '../../types/orders/order-status.ts'

import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { useOrder } from '#app/context/orders/OrderContext.tsx'
import { useRef } from 'react'
import { DeleteOrder } from '#app/routes/_orders+/__delete-order.tsx'

export function OrderHeader({ isAdmin }: { isAdmin: boolean }) {
	const { order } = useOrder()
	const iframeRef = useRef<HTMLIFrameElement>(null)

	return (
		<div className="flex flex-col items-center  justify-between  sm:flex-row ">
			<div className="flex gap-4">
				<Button variant={'outline'} size={'sm'} asChild>
					<LinkWithParams
						preserveSearch
						prefetch="intent"
						unstable_viewTransition
						to={'..'}
						relative="path"
					>
						<Icon name={'chevron-left'} size="sm" />
						<span className="sr-only">Volver</span>
					</LinkWithParams>
				</Button>
				<h1 className="text-h5 md:text-h4">
					Transacción #{order.id.slice(-6).toUpperCase()}
				</h1>
			</div>
			<div className="flex items-center gap-1 ">
				<iframe
					className="hidden"
					ref={iframeRef}
					src={`${order.id}/receipt`}
				/>
				{order.status === OrderStatus.FINISHED ? (
					<div className="flex gap-6">
						{isAdmin ? (
							<div className="flex gap-1">
								<Button size="sm" variant="outline" className="h-8 gap-1">
									<Icon name="pencil-2" className="h-3.5 w-3.5" />
									<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
										Modificar transacción
									</span>
								</Button>
								<DeleteOrder id={order.id} />
							</div>
						) : null}
						<Button
							onClick={() => iframeRef.current?.contentWindow?.print()}
							size="sm"
							className="h-8 gap-1"
						>
							<Icon name="printer" className="h-3.5 w-3.5" />
							<span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
								Imprimir comprobante
							</span>
						</Button>
					</div>
				) : null}
			</div>
		</div>
	)
}
