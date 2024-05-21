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
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { Discount } from '@prisma/client'
import { SerializeFrom } from '@remix-run/node'
import { Link, useFetcher, useNavigate } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import React from 'react'
import { useSpinDelay } from 'spin-delay'
import { DiscardTransaction } from '../_system+/transaction.discard.tsx'
import { paymentMethodIcons } from './_constants/paymentMethodIcons.ts'
import { TransactionDetails } from './_types/TransactionData.ts'
import {
	allPaymentMethods,
	type PaymentMethod,
} from './_types/payment-method.ts'

export function TransactionIdPanel({
	transactionId,
}: {
	transactionId: string
}) {
	return (
		<PanelCard>
			<div className="absolute -top-4 w-fit select-none rounded-md bg-card px-3 py-1 text-xs">
				ID Transacción
			</div>
			<span className="cursor-pointer rounded-md p-1 font-semibold uppercase text-foreground hover:bg-secondary">
				{transactionId}
			</span>
		</PanelCard>
	)
}

export function TransactionOverviewPanel({
	subtotal,
	discount,
	total,
}: {
	subtotal: number
	discount: number
	total: number
}) {
	return (
		<div className="flex flex-col justify-between gap-2 rounded-md bg-muted p-2 ">
			<div className="flex items-center text-xl text-foreground/80">
				<span className="w-[12rem] pl-2">Subtotal:</span>
				<span className="w-[12rem] rounded-md bg-background/50 p-1">
					{formatCurrency(subtotal)}
				</span>
			</div>
			<div className="flex items-center text-xl text-foreground/80">
				<span className="w-[12rem] pl-2">Descuentos:</span>
				<span className="w-[12rem] rounded-md bg-background/50 p-1">
					{formatCurrency(discount)}
				</span>
			</div>
			<div className="flex items-center rounded-md bg-background/20 text-xl font-bold">
				<span className="w-[12rem] pl-2">Total:</span>
				<span className="w-[12rem] rounded-md bg-background/50 p-1">
					{formatCurrency(total)}
				</span>
			</div>
		</div>
	)
}

export const DiscountsPanel = ({
	activeDiscounts,
}: {
	activeDiscounts: SerializeFrom<Pick<Discount, 'id' | 'name'>>[]
}) => {
	const navigate = useNavigate()

	return (
		<div className="relative flex w-full flex-1  flex-col gap-1 rounded-md bg-muted p-2  ">
			{activeDiscounts.length === 0 ? (
				<div className="flex h-full flex-col items-center justify-center gap-2 rounded-md  bg-background/30 p-1">
					<span className="select-none text-lg text-foreground/50">
						Sin promociones aplicables
					</span>
				</div>
			) : (
				<ScrollArea className="flex h-full flex-col  gap-1 rounded-md bg-background/30   text-sm ">
					<div className="text-md sticky top-0 z-40 flex h-[1.5rem] w-[inherit] select-none items-center justify-center bg-background/70 text-center text-foreground/90">
						Promociones aplicables ({activeDiscounts.length})
					</div>
					<ul className="mt-1 flex flex-col font-semibold tracking-tight">
						{activeDiscounts.map(discount => {
							return (
								<li
									key={discount.id}
									className="w-full cursor-pointer select-none px-1 hover:bg-secondary "
									onClick={() => navigate(`/discounts/${discount.id}`)}
								>
									{discount.name}
								</li>
							)
						})}
					</ul>
				</ScrollArea>
			)}

			<div>
				{/* This will be its own component that opens a modal and changes to set the current direct discount */}
				<Button className="h-8 w-full " variant={'outline'}>
					<Icon className="mr-2" name="tag" /> Descuento Directo
				</Button>
			</div>
		</div>
	)
}

export const PaymentMethodPanel = ({
	currentPaymentMethod,
	transactionId,
}: {
	transactionId: string
	currentPaymentMethod: PaymentMethod
}) => {
	const fetcher = useFetcher({ key: 'set-paymentMethod' })
	const isSubmitting = fetcher.state === 'submitting'
	const showSpinner = useSpinDelay(isSubmitting, {
		delay: 150,
		minDuration: 500,
	})

	return (
		<PanelCard className="relative">
			{showSpinner && (
				<div className="absolute inset-0 z-20 flex animate-spin  items-center justify-center ">
					<Icon className="text-2xl" name="update" />
				</div>
			)}
			<fetcher.Form
				action="/transaction"
				method="post"
				className={cn(
					'flex justify-between',
					showSpinner && 'opacity-50 blur-sm brightness-50',
				)}
			>
				{allPaymentMethods.map((paymentMethodType, index) => (
					<label
						className={`flex w-[5rem] cursor-pointer select-none flex-col items-center justify-center gap-1 rounded-md bg-card p-2 transition-colors duration-150 hover:bg-primary/20 has-[:checked]:bg-primary/90 has-[:checked]:text-background  has-[:disabled]:hover:bg-card `}
						key={index}
						htmlFor={paymentMethodType}
					>
						<input type="hidden" name="intent" value="set-payment-method" />
						<input type="hidden" name="transactionId" value={transactionId} />
						<input
							disabled={isSubmitting}
							defaultChecked={currentPaymentMethod === paymentMethodType}
							className="appearance-none"
							type="radio"
							name={'payment-method'}
							value={paymentMethodType}
							id={paymentMethodType}
							onChange={e => fetcher.submit(e.currentTarget.form)}
						/>
						<Icon
							className="text-xl"
							name={paymentMethodIcons[paymentMethodType]}
						/>
						<span className="text-sm">{paymentMethodType}</span>
					</label>
				))}
			</fetcher.Form>
		</PanelCard>
	)
}

export const TransactionOptionsPanel = ({
	transaction,
}: {
	transaction: TransactionDetails
}) => {
	return (
		<PanelCard>
			<div className="flex gap-4">
				<GenerateTransactionReport transactionId={transaction.id} />
				<ConfirmDeleteTransaction transactionId={transaction.id} />
			</div>

			<ConfirmFinishTransaction transaction={transaction} />
		</PanelCard>
	)
}

const ConfirmFinishTransaction = ({
	transaction,
}: {
	transaction: TransactionDetails
}) => {
	const fetcher = useFetcher({ key: 'complete-transaction' })
	const isSubmitting = fetcher.state !== 'idle'

	const formData = new FormData()
	formData.append('intent', 'complete-transaction')
	formData.append('transactionId', transaction.id)

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
					{isSubmitting ? (
						<Button className="w-[13rem]" disabled>
							<Icon name="update" className="mr-2 animate-spin opacity-80" />
							Confirmando Transacción
						</Button>
					) : (
						<Button
							className="w-[13rem]"
							onClick={() => fetcher.submit(formData, { method: 'POST' })}
						>
							<Icon name="checks" className="mr-2" />
							Confirmar y Finalizar
						</Button>
					)}
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export const ConfirmDeleteTransaction = ({
	transactionId,
}: {
	transactionId: string
}) => {
	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant={'destructive'}
					className="flex aspect-square h-[5.5rem] w-full flex-col items-center justify-center gap-1 px-5"
				>
					<Icon name="trash" className="flex-none text-2xl" />{' '}
					<span className="leading-tight">Descartar Transacción</span>
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar descarte de transacción</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea descartar esta transacción
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter className="flex gap-6">
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<DiscardTransaction id={transactionId} />
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

const GenerateTransactionReport = ({
	transactionId,
}: {
	transactionId: string
}) => {
	return (
		<Button variant={'outline'} asChild>
			<Link
				target="_blank"
				reloadDocument
				to={`/reports/${transactionId}/report-pdf`}
				className="flex aspect-square h-[5.5rem] w-full flex-col items-center justify-center gap-1 px-5 text-center"
			>
				<Icon className="flex-none text-2xl" name="report-money" />{' '}
				<span className="leading-tight">Generar Reporte</span>
			</Link>
		</Button>
	)
}

const PanelCard = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn('relative rounded-md bg-muted p-2', className)}
		{...props}
	/>
))
PanelCard.displayName = 'PanelCard'
