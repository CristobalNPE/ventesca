import { useFetcher } from '@remix-run/react'

import {
	forwardRef,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
} from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { Label } from '#app/components/ui/label.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { Toggle } from '#app/components/ui/toggle.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { type addProductOrderActionType } from '#app/routes/pos+/product-order-actions.js'
import { cn, useDebounce } from '#app/utils/misc.tsx'


export const addProductOrderActionIntent = 'add-product-order'
export const AddProductOrderSchema = z.object({
	intent: z.literal(addProductOrderActionIntent),
	search: z.string(),
})

type ProductReaderProps = {
	status: 'idle' | 'pending' | 'success' | 'error'
	onFocus?: () => void
	autoFocus?: boolean
	autoSubmit?: boolean
}

export const ProductReader = forwardRef<HTMLInputElement, ProductReaderProps>(
	({ status, onFocus, autoFocus = false, autoSubmit = false }, ref) => {
		const [isAutoSubmit, setIsAutoSubmit] = useState(autoSubmit)

		const id = useId()

		const [value, setValue] = useState('')
		const fetcher = useFetcher<addProductOrderActionType>({
			key: `${addProductOrderActionIntent}-ID${id}`,
		})
		const data = fetcher.data
		const isSubmitting = fetcher.state !== 'idle'

		const innerRef = useRef<HTMLInputElement>(null)
		useImperativeHandle(ref, () => innerRef.current!)

		const handleFormChange = useDebounce((form: HTMLFormElement) => {
			fetcher.submit(form)
		}, 400)

		useEffect(() => {
			const input = innerRef.current
			if (data?.status === 'success' && fetcher.state === 'idle') {
				setValue('')
			}
			if (input) {
				input.focus()
				input.select()
			}
		}, [data?.status, fetcher.state])


		useEffect(() => {
			if (data?.status && data?.status !== 'success'){
				toast.info(data?.message)
			}
		}, [data?.status]);

		return (
			<div className="flex items-center gap-4 ">
				<fetcher.Form
					onSubmit={e => {
						e.preventDefault()
						handleFormChange(e.currentTarget)
					}}
					method="POST"
					action="/pos/product-order-actions"
					className="flex  items-center  gap-2 rounded-md border-2 bg-background"
					onChange={e => isAutoSubmit && handleFormChange(e.currentTarget)}
				>
					<input
						type="hidden"
						name="intent"
						value={addProductOrderActionIntent}
					/>
					<div className="">
						<Label htmlFor={id} className="sr-only">
							Búsqueda articulo
						</Label>
						<Input
							value={value}
							onChange={e => setValue(e.target.value)}
							ref={innerRef}
							type="text"
							autoComplete="off"
							name="search"
							id={id}
							placeholder="[F1] Código articulo "
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
										tabIndex={-1}
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
								tabIndex={-1}
								className={cn(
									'border-2 border-foreground',
									isAutoSubmit &&
										'border-secondary  bg-foreground text-background brightness-150 hover:bg-muted-foreground hover:text-accent',
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

				{/* {data?.status && data?.status !== 'success' ? (
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
				) : null} */}
			</div>
		)
	},
)
