import { useLocation } from '@remix-run/react'
import { Button } from '#app/components/ui/button.tsx'

import { Icon } from '#app/components/ui/icon.tsx'

import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { useOrder } from '#app/context/orders/OrderContext.tsx'

export function OrderHeader() {
	const { order } = useOrder()
	const { state } = useLocation()

	return (
		<div className="flex flex-col items-center  justify-between  sm:flex-row ">
			<div className="flex gap-4">
				{/* If comming from POS, back button should go to /pos */}
				<Button variant={'outline'} size={'sm'} asChild>
					<LinkWithParams
						preserveSearch
						prefetch="intent"
						unstable_viewTransition
						to={state?.origin === 'pos' ? '/pos' : '..'}
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
		</div>
	)
}
