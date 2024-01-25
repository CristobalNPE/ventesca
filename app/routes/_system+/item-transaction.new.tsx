import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { useFetcher } from '@remix-run/react'

import { TYPE_SELL } from '#app/components/item-transaction-row.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse, useDebounce } from '#app/utils/misc.tsx'
import { getTransactionId } from '#app/utils/transaction.server.ts'
import {
	forwardRef,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { z } from 'zod'

export async function loader({ request }: LoaderFunctionArgs) {
	throw redirect('/sell')
}
const SearchSchema = z.object({
	search: z.number(),
})

export async function action({ request }: ActionFunctionArgs) {
	await requireUserId(request)
	const transactionId = await getTransactionId(request)

	invariantResponse(transactionId, 'Debe haber una venta en progreso.')

	const formData = await request.formData()

	const result = SearchSchema.safeParse({
		search: Number(formData.get('search')),
	})

	if (!result.success) {
		return json({ status: 'error', errors: result.error.flatten() } as const, {
			status: 400,
		})
	}
	const { search } = result.data

	const item = await prisma.item.findUnique({
		where: { code: search },
		select: {
			id: true,
			sellingPrice: true,
			stock: true,
		},
	})
	if (!item) {
		return json({ status: 'not-found' } as const)
	}

	//Check if there is an itemTransaction with that item already
	const itemTransaction = await prisma.itemTransaction.findFirst({
		where: {
			transactionId,
			itemId: item.id,
		},
	})

	if (itemTransaction) {
		//consider sending a message to the user that the item is already in the transaction
		return json({ status: 'duplicated' } as const)
	}

	//Create the default ItemTransaction
	await prisma.itemTransaction.create({
		data: {
			type: TYPE_SELL,
			item: { connect: { id: item.id } },
			transaction: { connect: { id: transactionId } },
			quantity: 1,
			totalPrice: item.sellingPrice ?? 0, //Can be null because of bad DB data, but we don't want to crash the app.
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

	return json({ status: 'success' } as const)
}

type ItemReaderProps = {
	status: 'idle' | 'pending' | 'success' | 'error'
	onFocus?: () => void
	autoFocus?: boolean
	autoSubmit?: boolean
}

export const ItemReader = forwardRef<HTMLInputElement, ItemReaderProps>(
	({ status, onFocus, autoFocus = false, autoSubmit = false }, ref) => {
		const id = useId()

		const [value, setValue] = useState('')
		const fetcher = useFetcher<typeof action>({ key: 'add-item-transaction' })
		const data = fetcher.data
		const isSubmitting = fetcher.state !== 'idle'

		const [message, setMessage] = useState<string | null>(null)

		const innerRef = useRef<HTMLInputElement>(null)
		useImperativeHandle(ref, () => innerRef.current!)

		useEffect(() => {
			if (data?.status === 'success') setMessage(null)
			if (data?.status === 'not-found') setMessage('Artículo no registrado.')
			if (data?.status === 'duplicated')
				setMessage('Artículo ya está en la lista.')
		}, [data?.status])

		const handleFormChange = useDebounce((form: HTMLFormElement) => {
			fetcher.submit(form)
		}, 400)

		useEffect(() => {
			setMessage(null)
		}, [value])

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

		return (
			<div className="relative ">
				<fetcher.Form
					onSubmit={e => {
						e.preventDefault()
						handleFormChange(e.currentTarget)
					}}
					method="POST"
					action="/item-transaction/new"
					className="flex  items-center justify-center gap-2 rounded-md border-[1px] border-secondary bg-background"
					onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
				>
					<div className="flex-1">
						<Label htmlFor={id} className="sr-only">
							Search
						</Label>
						<Input
							value={value}
							onChange={e => setValue(e.target.value)}
							ref={innerRef}
							type="number"
							name="search"
							id={id}
							placeholder="Búsqueda Código"
							className="w-[10rem] border-none sm:w-[20rem] [&::-webkit-inner-spin-button]:appearance-none"
							autoFocus={autoFocus}
							disabled={isSubmitting}
						/>
					</div>
					<div>
						<StatusButton
							type="submit"
							status={isSubmitting ? 'pending' : status}
							className="flex w-full items-center justify-center border-none"
							variant={'outline'}
							size="sm"
						>
							<Icon name="scan-barcode" size="md" />
							<span className="sr-only">Buscar</span>
						</StatusButton>
					</div>
				</fetcher.Form>

				{message && (
					<div className="absolute right-14 top-[10px] flex select-none items-center gap-1 rounded-md bg-destructive/30 p-1 text-xs text-foreground">
						<Icon name="exclamation-circle" size="sm" className="flex-none" />
						<span>{message}</span>
					</div>
				)}
			</div>
		)
	},
)
