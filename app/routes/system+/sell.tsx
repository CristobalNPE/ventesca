import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { formatCurrency, invariantResponse } from '#app/utils/misc.tsx'
import {
	getTransactionId,
	transactionKey,
	transactionSessionStorage,
} from '#app/utils/transaction.server.ts'
import { ActionFunctionArgs, LoaderFunctionArgs, json } from '@remix-run/node'
import { useFetchers, useLoaderData } from '@remix-run/react'

import { ItemTransactionRow } from '#app/components/item-transaction-row.tsx'
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
import { ItemReader } from './item-transaction.new.tsx'
import { DiscardTransaction } from './transaction.discard.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	const transactionId = await getTransactionId(request)
	const userId = await requireUserId(request)
	if (!transactionId) {
		const transactionSession = await transactionSessionStorage.getSession(
			request.headers.get('cookie'),
		)

		const newTransaction = await prisma.transaction.create({
			data: {
				seller: { connect: { id: userId } },
				status: 'PENDIENTE',
				subtotal: 0,
				total: 0,
				discount: 0,
			},
			select: {
				id: true,
				status: true,
				createdAt: true,
				total: true,
				seller: { select: { name: true } },
				items: {
					select: {
						id: true,
						type: true,
						item: true,
						quantity: true,
						totalPrice: true,
					},
				},
			},
		})

		transactionSession.set(transactionKey, newTransaction.id)
		return json(
			{ transaction: newTransaction },
			{
				headers: {
					'Set-Cookie':
						await transactionSessionStorage.commitSession(transactionSession),
				},
			},
		)
	}

	const currentTransaction = await prisma.transaction.findUnique({
		where: { id: transactionId },
		select: {
			id: true,
			status: true,
			createdAt: true,
			total: true,
			seller: { select: { name: true } },
			items: {
				select: {
					id: true,
					type: true,
					quantity: true,
					totalPrice: true,
					item: {
						select: {
							id: true,
							code: true,
							name: true,
							sellingPrice: true,
							stock: true,
						},
					},
				},
			},
		},
	})

	invariantResponse(currentTransaction, 'No es posible cargar la transacción.')

	return json({ transaction: currentTransaction })
}

export async function action({ request }: ActionFunctionArgs) {
	return json({ status: 'success' } as const)
}


type ItemTransactionRow = {
	crsf: string
	id:string
	type: string
	quantity: number
	totalPrice: number
}
export default function SellRoute() {
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { transaction } = useLoaderData<typeof loader>()

	let allItemTransactions = transaction.items

	//We might need to use a state for allItemTransactions, so we can add and remove items from it and apply some optimistic UI.

	// const removeItemTransactionFromStateById = (id: string) => {
	// 	 const newItems = items.filter(item => item.id !== id)
	// 	 setItems(newItems)

	// }
	let fetchers = useFetchers()
	let optimisticTransactions = fetchers.reduce<ItemTransactionRow[]>((memo,f) => {
		if (f.formData) {
			let data = Object.fromEntries(f.formData)
			memo.push(data)
		}
		return memo
	},[])
	console.log(optimisticTransactions)

	allItemTransactions = [...allItemTransactions, ...optimisticTransactions]


	const subtotal = allItemTransactions
		.map(itemTransaction => itemTransaction.totalPrice)
		.reduce((a, b) => a + b, 0)

	const discount = 0

	return (
		<>
			<div className="flex items-center justify-between">
				<h1 className="text-2xl">Venta de artículos</h1>
				<h1 className="text-md text-foreground/80">
					ID Transacción:{' '}
					<span className="cursor-pointer rounded-md p-1 uppercase text-foreground hover:bg-secondary">
						{transaction?.id}
					</span>
				</h1>
			</div>
			<div className="mt-4 flex justify-between">
				<ItemReader autoFocus autoSubmit status={'idle'} />
				<div className="flex gap-4">
					<Button variant={'outline'}>
						<Icon className="mr-2" name="banknote" /> Descargar Cotización
					</Button>

					<ConfirmDeleteTransaction transactionId={transaction.id} />
				</div>
			</div>
			<ScrollArea className="my-4 h-[29rem] ">
				<Table className="min-w-full overflow-clip rounded-md ">
					<TableHeader className="  bg-secondary uppercase  ">
						<TableRow className="">
							<TableHead className="w-[50px]"></TableHead>
							<TableHead className="w-[100px]">Código</TableHead>
							<TableHead className="w-[100px]">
								<span className="tracking-widest">V/P/D</span>
							</TableHead>
							<TableHead className="">Descripción Articulo</TableHead>
							<TableHead>Precio</TableHead>
							<TableHead className="">Cantidad</TableHead>

							<TableHead className="text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className=" bg-background/60">
						{transaction &&
							allItemTransactions.map(itemTransaction => {
								if (itemTransaction.item) {
									return (
										<ItemTransactionRow
											itemTransaction={itemTransaction}
											key={itemTransaction.item.id}
											item={itemTransaction.item}
										/>
									)
								} else return null
							})}
					</TableBody>
				</Table>
			</ScrollArea>

			<div className="mx-auto flex h-[10.5rem] w-fit justify-between gap-16 rounded-md  bg-secondary py-4 pl-4 pr-6">
				<div className="flex flex-col justify-between gap-2">
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Subtotal:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							{formatCurrency(subtotal)}
						</span>
					</div>
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Descuentos:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							{formatCurrency(discount)}
						</span>
					</div>
					<div className="flex items-center rounded-md bg-background/20 text-2xl font-bold">
						<span className="w-[12rem] pl-2">Total:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							{formatCurrency(subtotal - discount)}
						</span>
					</div>
				</div>
				<div className="flex flex-col items-center justify-between">
					<Button className="w-full " variant={'outline'}>
						<Icon className="mr-2" name="tag" /> Aplicar Descuento
						{/* Abre un modal con selección de descuentos creados en las sección de Promociones
							También permite aplicar Descuentos directos en porcentaje o monto fijo
						*/}
					</Button>

					<Button size={'lg'} className="flex w-full  gap-2 ">
						<Icon name="check" size="lg" />
						<span className="">Ingresar Venta</span>
					</Button>
				</div>
			</div>
		</>
	)
}

const ConfirmDeleteTransaction = ({
	transactionId,
}: {
	transactionId: string
}) => {
	return (
		<AlertDialog>
			<AlertDialogTrigger>
				<Button variant={'destructive'}>
					<Icon name="trash" className="mr-2" /> Descartar Venta
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar descarte de venta</AlertDialogTitle>
					<AlertDialogDescription>
						Por favor confirme que desea descartar esta venta
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
