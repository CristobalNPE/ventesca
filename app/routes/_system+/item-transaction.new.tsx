import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useFetcher } from '@remix-run/react'

import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { cn, useDebounce } from '#app/utils/misc.tsx'
import {
	forwardRef,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { z } from 'zod'
import { ItemTransactionType } from '../transaction+/_types/item-transactionType.ts'
import { TransactionStatus } from '../transaction+/_types/transaction-status.ts'
import { invariantResponse } from '@epic-web/invariant'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { Toggle } from '#app/components/ui/toggle.tsx'

export async function loader({ request }: LoaderFunctionArgs) {
	throw redirect('/transaction')
}
const SearchSchema = z.object({
	search: z.number(),
})

export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const currentTransaction = await prisma.transaction.findFirst({
		where: {
			sellerId: userId,
			businessId: businessId,
			status: TransactionStatus.PENDING,
		},
		select: { id: true },
	})

	invariantResponse(currentTransaction, 'Debe haber una venta en progreso.')

	const formData = await request.formData()

	const result = SearchSchema.safeParse({
		search: Number(formData.get('search')),
	})

	if (!result.success) {
		return json(
			{
				status: 'error',
				errors: result.error.flatten(),
				message: 'error',
			} as const,
			{
				status: 400,
			},
		)
	}
	const { search } = result.data

	const item = await prisma.item.findFirst({
		where: { code: search, businessId },
		select: {
			id: true,
			sellingPrice: true,
			stock: true,
			isActive: true,
			code: true,
		},
	})
	if (!item) {
		return json({
			status: 'error',
			message: `Articulo código [${search}] no se encuentra en el registro de inventario.`,
		} as const)
	}

	if (!item.isActive) {
		return json({
			status: 'error',
			message: 'Articulo no se encuentra activo.',
		} as const)
	}

	const itemTransaction = await prisma.itemTransaction.findFirst({
		where: {
			transactionId: currentTransaction.id,
			itemId: item.id,
		},
	})

	if (itemTransaction) {
		return json({
			status: 'error',
			message: `Articulo código [${item.code}] ya se encuentra en la transacción.`,
		} as const)
	}

	//Create the default ItemTransaction
	const createdItemTransaction = await prisma.itemTransaction.create({
		data: {
			type: ItemTransactionType.SELL,
			item: { connect: { id: item.id } },
			transaction: { connect: { id: currentTransaction.id } },
			quantity: 1,
			totalPrice: item.sellingPrice,
			totalDiscount: 0,
		},
		select: {
			id: true,
			type: true,
			quantity: true,
			totalDiscount: true,
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
	})

	if (createdItemTransaction.item.stock < 1) {
		return json({
			status: 'warn',
			message: `Articulo código [${createdItemTransaction.item.code}] se encuentra sin stock.`,
		} as const)
	}

	return json({
		status: 'success',
		message: `Articulo código [${createdItemTransaction.item.code}] agregado con éxito`,
	} as const)
}

type ItemReaderProps = {
	status: 'idle' | 'pending' | 'success' | 'error'
	onFocus?: () => void
	autoFocus?: boolean
	autoSubmit?: boolean
}

export const ItemReader = forwardRef<HTMLInputElement, ItemReaderProps>(
	({ status, onFocus, autoFocus = false, autoSubmit = false }, ref) => {
		const [isAutoSubmit, setIsAutoSubmit] = useState(autoSubmit)

		const id = useId()

		const [value, setValue] = useState('')
		const fetcher = useFetcher<typeof action>({
			key: `add-item-transaction-ID${id}`,
		})
		const data = fetcher.data
		const isSubmitting = fetcher.state !== 'idle'

		const innerRef = useRef<HTMLInputElement>(null)
		useImperativeHandle(ref, () => innerRef.current!)

		const handleFormChange = useDebounce((form: HTMLFormElement) => {
			fetcher.submit(form)
		}, 400)

		useEffect(() => {
			if (data?.status === 'success' && fetcher.state === 'idle') {
				setValue('')
			} else {
				const input = innerRef.current
				if (input) {
					input.focus()
					input.select()
				}
			}
		}, [data?.status, fetcher.state])
		console.log(isAutoSubmit)

		return (
			<div className="flex items-center gap-4">
				<fetcher.Form
					onSubmit={e => {
						e.preventDefault()
						handleFormChange(e.currentTarget)
					}}
					method="POST"
					action="/item-transaction/new"
					className="flex  items-center  gap-2 rounded-md border-2 bg-background"
					onChange={e => isAutoSubmit && handleFormChange(e.currentTarget)}
				>
					<div className="">
						<Label htmlFor={id} className="sr-only">
							Búsqueda articulo
						</Label>
						<Input
							value={value}
							onChange={e => setValue(e.target.value)}
							ref={innerRef}
							type="number"
							name="search"
							id={id}
							placeholder="Código articulo"
							className="w-[10rem] border-none sm:w-[20rem] [&::-webkit-inner-spin-button]:appearance-none"
							autoFocus={autoFocus}
							disabled={isSubmitting}
						/>
					</div>
					<div className="flex">
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger asChild>
									<StatusButton
										type="submit"
										status={isSubmitting ? 'pending' : status}
										className="flex w-full items-center justify-center border-none"
										variant={'outline'}
										size="sm"
									>
										<Icon name="scan" size="md" />
										<span className="sr-only">Buscar</span>
									</StatusButton>
								</TooltipTrigger>
								<TooltipContent>
									<p>Buscar articulo</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
					</div>
				</fetcher.Form>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Toggle
								className={cn(
									'border-2 border-foreground',
									isAutoSubmit &&
										'duration-[10000ms] border-secondary  bg-foreground text-background brightness-150 hover:bg-muted-foreground hover:text-accent',
								)}
								variant={'outline'}
								pressed={isAutoSubmit}
								onPressedChange={() => setIsAutoSubmit(prevState => !prevState)}
								aria-label={
									isAutoSubmit
										? 'Desactivar escaneo automático'
										: 'Activar escaneo automático'
								}
							>
								<Icon name="scan-barcode" />
							</Toggle>
						</TooltipTrigger>
						<TooltipContent>
							<p>
								{isAutoSubmit
									? 'Desactivar escaneo automático'
									: 'Activar escaneo automático'}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>

				{data?.status && data?.status !== 'success' ? (
					<div
						className={cn(
							'flex select-none items-center gap-2 rounded-md bg-destructive p-2 text-xs text-destructive-foreground',
							data?.status === 'warn' && 'bg-primary text-primary-foreground',
						)}
					>
						<Icon
							name={
								data.status === 'error'
									? 'exclamation-circle'
									: 'alert-triangle'
							}
							size="sm"
							className="flex-none"
						/>
						<span>{data?.message}</span>
					</div>
				) : null}
			</div>
		)
	},
)
