import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { getBusinessId, requireUserId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { useDebounce } from '#app/utils/misc.tsx'
import { json, LoaderFunctionArgs } from '@remix-run/node'
import { useFetcher, useNavigate } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'

export enum VerifySearchStatus {
	FOUND = 'found',
	NOT_FOUND = 'not-found',
	INVALID = 'invalid',
}

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const businessId = await getBusinessId(userId)

	const url = new URL(request.url)
	const orderSearch = url.searchParams.get('order-verify-search')

	console.log(orderSearch)
	if (orderSearch === null || orderSearch === '' || orderSearch.length < 6)
		return json({ order: null, status: VerifySearchStatus.INVALID })

	const order = await prisma.order.findFirst({
		where: { id: { contains: orderSearch }, businessId },
		select: {
			id: true,
		},
	})

	if (order) {
		console.log(JSON.stringify(order))
		return json({ order, status: VerifySearchStatus.FOUND })
	}
	return json({ order, status: VerifySearchStatus.NOT_FOUND })
}

export function VerifyOrderDialog({ trigger }: { trigger?: React.ReactNode }) {
	const inputRef = useRef<HTMLInputElement>(null)

	const [open, setOpen] = useState(false)

	const fetcher = useFetcher<typeof loader>({
		key: 'order-verify-search',
	})
	const order = fetcher.data ? fetcher.data.order : null
	const statusFromFetcher = fetcher.data
		? fetcher.data.status
		: VerifySearchStatus.INVALID
	const [status, setStatus] = useState(VerifySearchStatus.INVALID)

	useEffect(() => {
		setStatus(VerifySearchStatus.INVALID)
	}, [open])

	useEffect(() => {
		setStatus(statusFromFetcher)
	}, [statusFromFetcher])

	const navigate = useNavigate()

	const navigateToDetails = () => {
		if (!order) return
		navigate(`/reports/${order.id}`)
		if (inputRef.current !== null) {
			inputRef.current.value = ''
		}

		setOpen(false)
	}

	const handleFormChange = useDebounce((inputValue: string) => {
		fetcher.submit(
			{ 'order-verify-search': inputValue ?? '' },
			{
				method: 'get',
				action: `/reports/verify-order`,
			},
		)
		inputRef.current?.focus()
		inputRef.current?.select()
	}, 400)
	return (
		<Dialog
			open={open}
			onOpenChange={() => {
				setOpen(prev => !prev)
			}}
		>
			<DialogTrigger asChild>
				{trigger ? (
					trigger
				) : (
					<Button variant="outline" size="sm" className="h-7 gap-1 text-sm">
						<Icon name="qrcode" className="h-3.5 w-3.5" />
						<span className="sr-only sm:not-sr-only">
							Verificar Transacción
						</span>
					</Button>
				)}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Verificar Transacción</DialogTitle>
					<DialogDescription asChild>
						<div className="flex flex-col gap-4">
							<p>
								Escanee el Código QR del comprobante o ingrese el ID de
								transacción manualmente:
							</p>

							<div
								className="flex w-full items-center gap-4 rounded-xl border bg-secondary p-4 shadow-sm"
								onClick={() => inputRef.current?.focus()}
							>
								<div className="relative  ">
									<Icon
										name="qrcode"
										className="h-[7rem] w-[7rem] text-primary  "
									/>
									{status !== VerifySearchStatus.INVALID ? (
										<div>
											{status === VerifySearchStatus.FOUND ? (
												<Icon
													name="checks"
													className="absolute left-8 top-8 h-[3rem] w-[3rem] animate-slide-top rounded-full bg-green-600 p-2 text-foreground"
												/>
											) : (
												<Icon
													name="cross-1"
													className="absolute left-8 top-8 h-[3rem] w-[3rem] animate-slide-top rounded-full bg-destructive p-2 text-foreground"
												/>
											)}
										</div>
									) : null}
								</div>
								<Input
									autoFocus
									ref={inputRef}
									type="text"
									name="order-verify-search"
									placeholder="Búsqueda por código"
									className="border-none [&::-webkit-inner-spin-button]:appearance-none"
									onChange={e => {
										handleFormChange(e.target.value)
									}}
								/>
							</div>
							{status !== VerifySearchStatus.INVALID ? (
								<div className="flex items-center justify-center">
									{status === VerifySearchStatus.FOUND ? (
										<div className="font-semibold text-green-600">
											<span>Transacción válida:</span>
											<Button
												variant={'link'}
												onClick={() => navigateToDetails()}
											>
												Ver Detalles
											</Button>
										</div>
									) : (
										<div className="font-semibold text-destructive">
											<span>Transacción inválida o código incorrecto.</span>
										</div>
									)}
								</div>
							) : null}
						</div>
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	)
}
