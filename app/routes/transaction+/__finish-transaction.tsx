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
import { type action } from '#app/routes/transaction+/index.tsx'
import { formatCurrency, useIsPending } from '#app/utils/misc.tsx'
import { type TransactionDetails } from './_types/TransactionData.ts'

export const FINISH_TRANSACTION_KEY = 'finish-transaction'

export const FinishTransactionSchema = z.object({
	intent: z.literal(FINISH_TRANSACTION_KEY),
	transactionId: z.string(),
})

export const FinishTransaction = ({
	transaction,
}: {
	transaction: TransactionDetails
}) => {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending({
		formAction: '/transaction',
	})
	const [form] = useForm({
		id: FINISH_TRANSACTION_KEY,
		lastResult: actionData?.result,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					disabled={transaction.itemTransactions.length === 0}
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
							{transaction.id}
						</span>
					</AlertDialogTitle>
					<AlertDialogDescription asChild>
						<div>
							Confirme los datos de la venta para ingreso:
							<div className="fex mt-4 flex-col gap-1">
								{transaction.itemTransactions.map(itemTransaction => {
									if (itemTransaction.item) {
										return (
											<div className="flex gap-4" key={itemTransaction.id}>
												<div className="flex flex-1 gap-2 overflow-clip ">
													<span className="font-bold">
														{itemTransaction.quantity}x
													</span>
													<span className="uppercase">
														{itemTransaction.item.name}
													</span>
												</div>
												<span className="w-[4rem] text-right">
													{formatCurrency(itemTransaction.totalPrice)}
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
									<span>{transaction.seller.name}</span>
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
									<span>{transaction.paymentMethod}</span>
								</div>
								{transaction.directDiscount && (
									<div className="flex gap-4">
										<span className="w-[9rem] font-bold">
											Descuento directo:
										</span>
										<span>{formatCurrency(transaction.directDiscount)}</span>
									</div>
								)}
								<div className="flex gap-4">
									<span className="w-[9rem] font-bold">Total:</span>
									<span>{formatCurrency(transaction.total)}</span>
								</div>
							</div>
						</div>
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="mt-4 flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<Form method="POST" action="/transaction" {...getFormProps(form)}>
						<input type="hidden" name="transactionId" value={transaction.id} />
						<StatusButton
							type="submit"
							name="intent"
							value={FINISH_TRANSACTION_KEY}
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
