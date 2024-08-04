import { useOrder } from '#app/context/orders/OrderContext.tsx'
import { useRef } from 'react'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from '../ui/card'

export function OrderReceiptDisplay() {
	const { order } = useOrder()
	const iframeRef = useRef<HTMLIFrameElement>(null)
	return (
		<Card>
			<CardHeader>
				<CardTitle>Comprobante Disponible</CardTitle>
			</CardHeader>
			<CardContent>
				<iframe
					className="h-[20rem] w-full rounded"
					ref={iframeRef}
					src={`/orders/${order.id}/receipt`}
				/>
			</CardContent>
			<CardFooter>
				<Button
					className="w-full"
					onClick={() => iframeRef.current?.contentWindow?.print()}
					variant={'secondary'}
				>
					<Icon name="printer" className="mr-2" /> Imprimir
				</Button>
			</CardFooter>
		</Card>
	)
}
