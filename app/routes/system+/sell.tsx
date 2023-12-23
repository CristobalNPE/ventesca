import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { Input } from '#app/components/ui/input.tsx'
import { ScrollArea } from '#app/components/ui/scroll-area.tsx'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '#app/components/ui/table.tsx'
import { prisma } from '#app/utils/db.server.ts'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { Item } from '@prisma/client'
import { LoaderFunctionArgs, SerializeFrom, json } from '@remix-run/node'
import { useLoaderData } from '@remix-run/react'

import { useEffect, useRef, useState } from 'react'

export async function loader({request}:LoaderFunctionArgs) {
	// const url = new URL(request.url)
	// const code = url.searchParams.get('code')



	const testItem = await prisma.item.findUnique({
		where: { code: 3424 },
		select: {
			id: true,
			code: true,
			name: true,
			sellingPrice: true,
			stock: true,
		},
	})

	return json({ item: testItem } )
}

export default function SellRoute() {
	//? MAYBE WE WANT TO CHECK IF THERE IS A SALE IN PROGRESS every time WE CLICK ON SOMETHING ON THE MENU, TO ALERT THE USER
	//! CHECK OTHER FILTERS AND ADD THE TOLOWERCASE() WHERE NEEDED.

	const { item } = useLoaderData<typeof loader>()
	// const [subtotal, setSubtotal] = useState(0)

	return (
		<>
			<h1 className="text-2xl">Venta de artículos</h1>
			<div className="mt-4 flex justify-between">
				<Input className=" w-[20rem]" />
				<div className="flex gap-4">
					<Button variant={'outline'}>
						<Icon className="mr-2" name="banknote" /> Descargar Cotización
					</Button>
					<Button variant={'destructive'}>
						<Icon name="trash" className="mr-2" /> Descartar Venta
					</Button>
				</div>
			</div>
			<ScrollArea className="my-4 h-[29rem] ">
				<Table className="min-w-full overflow-clip rounded-md ">
					<TableHeader className="  bg-secondary uppercase  ">
						<TableRow className="">
							<TableHead>Código</TableHead>
							<TableHead>V/P/D</TableHead>
							<TableHead className="min-w-[25rem]">
								Descripción Articulo
							</TableHead>
							<TableHead>Precio</TableHead>
							<TableHead>Cantidad</TableHead>

							<TableHead className="text-right">Total</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody className=" bg-background/60">
						{item && <SellRow item={item} transactionType={'VENTA'} />}
					</TableBody>
				</Table>
			</ScrollArea>
			<div className="relative  -bottom-3 mx-auto flex h-[12rem] w-fit justify-between gap-16 rounded-md  bg-secondary py-4 pl-4 pr-6">
				<div className="flex flex-col justify-between gap-2">
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Subtotal:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							$999
						</span>
					</div>
					<div className="flex items-center text-2xl text-foreground/80">
						<span className="w-[12rem] pl-2">Descuentos:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							$0
						</span>
					</div>
					<div className="flex items-center rounded-md bg-background/20 text-2xl font-bold">
						<span className="w-[12rem] pl-2">Total:</span>
						<span className="w-[12rem] rounded-md bg-background/50 p-1">
							$999
						</span>
					</div>
				</div>
				<div className="flex flex-col items-center justify-between">
					<Button className="w-full " variant={'outline'}>
						<Icon className="mr-2" name="banknote" /> Aplicar Descuento
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

const SellRow = ({
	item,
	transactionType,
}: {
	item: SerializeFrom<Pick<Item, 'id' | 'code' | 'name' | 'sellingPrice' | 'stock'>>
	transactionType: StateType
}) => {
	const [totalPrice, setTotalPrice] = useState(item.sellingPrice)
	const [quantity, setQuantity] = useState(1)

	useEffect(() => {
		if (item.sellingPrice) {
			setTotalPrice(item.sellingPrice * quantity)
		}
	}, [quantity, item.sellingPrice])

	return (
		<TableRow className="uppercase">
			<TableCell className="font-bold">{item.code}</TableCell>
			<TableCell className="font-medium">
				<TransactionType initialType={transactionType} />
			</TableCell>
			<TableCell className="font-medium tracking-wider">{item.name}</TableCell>
			<TableCell className="font-medium">
				{formatCurrency(item.sellingPrice)}
			</TableCell>
			<TableCell className="">
				<QuantitySelector
					min={1}
					max={item.stock}
					quantity={quantity}
					setQuantity={setQuantity}
				/>
			</TableCell>
			<TableCell className="text-right font-bold">
				{formatCurrency(totalPrice)}
			</TableCell>
		</TableRow>
	)
}

//Component can have 3 states: VENTA, DEVOL, PREST, and the color of the background will change depending on the state
//The state will be passed as a prop to the component
//Clicking on the component will change the state, cycling through the 3 states
//Clicking on the component will also change the background color, cycling through the 3 colors
//Component can be focused, and when focused it will listen to the keyboard events for the letters V, D, P, and will change the state accordingly

type StateType = 'VENTA' | 'DEVOL' | 'PREST'

const TransactionType = ({ initialType }: { initialType: StateType }) => {
	const [state, setState] = useState<StateType>(initialType)

	const componentRef = useRef<HTMLDivElement>(null)

	const cycleState = () => {
		const nextState =
			state === 'VENTA' ? 'DEVOL' : state === 'DEVOL' ? 'PREST' : 'VENTA'
		setState(nextState)
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		switch (event.key.toUpperCase()) {
			case 'V':
				setState('VENTA')
				break
			case 'D':
				setState('DEVOL')
				break
			case 'P':
				setState('PREST')
				break
		}
	}

	useEffect(() => {
		const currentRef = componentRef.current
		if (currentRef) {
			currentRef.addEventListener('keydown', handleKeyDown)
		}
		return () => {
			if (currentRef) {
				currentRef.removeEventListener('keydown', handleKeyDown)
			}
		}
	}, [])
	return (
		<div
			className={cn(
				'flex w-[4rem] cursor-pointer select-none items-center justify-center rounded-md uppercase',
				state === 'VENTA' && 'bg-primary',
				state === 'DEVOL' && 'bg-orange-500',
				state === 'PREST' && 'bg-blue-500',
			)}
			onClick={cycleState}
			tabIndex={0}
			ref={componentRef}
		>
			{state}
		</div>
	)
}

//Component will have an numbers only input and two buttons, one to increase the value and one to decrease it
//Component will have a min and max value, and will not allow the user to go below or above those values
//Component will have a prop to set the initial value

const QuantitySelector = ({
	min,
	max,
	quantity,
	setQuantity,
}: {
	min: number
	max: number
	quantity: number
	setQuantity: (value: number) => void
}) => {
	const componentRef = useRef<HTMLDivElement>(null)
	console.log(quantity)
	console.log(min)
	console.log(max)

	const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = parseInt(event.target.value, 10)
		if (!isNaN(newValue) && newValue >= min && newValue <= max) {
			setQuantity(newValue)
		}
	}

	const increaseValue = () => {
		const newValue = quantity < max ? quantity + 1 : quantity
		setQuantity(newValue)
	}

	const decreaseValue = () => {
		const newValue = quantity > min ? quantity - 1 : quantity
		setQuantity(newValue)
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
			event.preventDefault()
			increaseValue()
		} else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
			event.preventDefault()
			decreaseValue()
		}
	}

	useEffect(() => {
		const currentRef = componentRef.current
		if (currentRef) {
			currentRef.addEventListener('keydown', handleKeyDown)
		}
		return () => {
			if (currentRef) {
				currentRef.removeEventListener('keydown', handleKeyDown)
			}
		}
	}, [quantity])

	return (
		<div ref={componentRef} className="flex">
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square w-[2rem] p-0"
				onClick={decreaseValue}
				disabled={quantity <= min}
			>
				<Icon size="lg" name="chevron-down" />
			</Button>
			<Input
				className="w-[3rem] [&::-webkit-inner-spin-button]:appearance-none"
				tabIndex={0}
				type="number"
				value={quantity}
				onChange={handleInputChange}
			/>
			<Button
				tabIndex={-1}
				variant={'ghost'}
				className="aspect-square w-[2rem] p-0"
				onClick={increaseValue}
				disabled={quantity >= max}
			>
				<Icon size="lg" name="plus" />
			</Button>
		</div>
	)
}
