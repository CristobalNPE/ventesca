import { getFormProps, useForm } from '@conform-to/react'
import { Form, useActionData } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { type action } from '#app/routes/order+/index.js'
import { formatCurrency, useIsPending } from '#app/utils/misc.tsx'
import { type OrderDetails } from './_types/OrderData.ts'

export const finishOrderActionIntent = 'finish-order'

export const FinishTransactionSchema = z.object({
	intent: z.literal(finishOrderActionIntent),
	orderId: z.string(),
})

export const FinishOrder = ({ order }: { order: OrderDetails }) => {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending({
		formAction: '/order',
	})
	const [form] = useForm({
		id: finishOrderActionIntent,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					disabled={order.productOrders.length === 0}
					size={'lg'}
					className="text-md mt-6 flex h-[3rem] w-full  gap-2 font-bold "
				>
					<Icon className="flex-shrink-0" name="circle-check" size="xl" />
					<span className="leading-tight">Ingresar Venta</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="flex items-center gap-4">
						Confirmar Transacción{' '}
						<span className="rounded-md bg-primary/10 p-1 text-sm uppercase">
							{order.id}
						</span>
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							Confirme los datos de la venta para ingreso:
							<div className="fex mt-4 flex-col gap-1">
								{order.productOrders.map(productOrder => {
									if (productOrder.productDetails) {
										return (
											<div className="flex gap-4" key={productOrder.id}>
												<div className="flex flex-1 gap-2 overflow-clip ">
													<span className="font-bold">
														{productOrder.quantity}x
													</span>
													<span className="uppercase">
														{productOrder.productDetails.name}
													</span>
												</div>
												<span className="w-[4rem] text-right">
													{formatCurrency(productOrder.totalPrice)}
												</span>
											</div>
										)
									}
									return null
								})}
							</div>
							<div className="mt-4 flex flex-col gap-1 ">
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Vendedor:</span>
									<span>{order.seller.name}</span>
								</div>
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Fecha:</span>
									<span>
										{format(new Date(), "d 'de' MMMM 'del' yyyy'", {
											locale: es,
										})}
									</span>
								</div>
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Método de Pago:</span>
									<span>{order.paymentMethod}</span>
								</div>
								{order.directDiscount && (
									<div className="flex gap-4">
										<span className="w-[9rem] font-bold">
											Descuento directo:
										</span>
										<span>{formatCurrency(order.directDiscount)}</span>
									</div>
								)}
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Total:</span>
									<span>{formatCurrency(order.total)}</span>
								</div>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="mt-4 flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form method="POST" action="/order" {...getFormProps(form)}>
						<input type="hidden" name="orderId" value={order.id} />
						<StatusButton
							type="submit"
							name="intent"
							value={finishOrderActionIntent}
							variant="default"
							status={isPending ? 'pending' : form.status ?? 'idle'}
							disabled={isPending}
						>
							<div className="flex items-center gap-2 ">
								<Icon name="checks" className="mr-2" />
								Confirmar y Finalizar
							</div>
						</StatusButton>
						<ErrorList errors={form.errors} id={form.errorId} />
					</Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
