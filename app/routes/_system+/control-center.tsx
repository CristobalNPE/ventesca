import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '#app/components/ui/command.tsx'
import { cn } from '#app/utils/misc.ts'
import { faker } from '@faker-js/faker'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Key } from 'ts-key-enum'

export default function ControlCenter() {
	return (
		<>
			<h1 className="text-2xl">Centro de Pruebas |WARNING|</h1>

			<List />
		</>
	)
}

const useRoveFocus = (size: number) => {
	const [currentFocus, setCurrentFocus] = useState(0)

	useHotkeys(Key.ArrowDown, () =>
		setCurrentFocus(currentFocus === size - 1 ? 0 : currentFocus + 1),
	)
	useHotkeys(Key.ArrowUp, () =>
		setCurrentFocus(currentFocus === 0 ? size - 1 : currentFocus - 1),
	)

	return useMemo(() => [currentFocus, setCurrentFocus] as const, [currentFocus])
}

const List = () => {
	const listData = [
		{
			name: 'Test Name 1',
			email: 'test1@test.com',
		},
		{
			name: 'Test Name 2',
			email: 'test1@test.com',
		},
		{
			name: 'Test Name 3',
			email: 'test1@test.com',
		},
		{
			name: 'Test Name 4',
			email: 'test1@test.com',
		},
		{
			name: 'Test Name 5',
			email: 'test1@test.com',
		},
		{
			name: 'Test Name 6',
			email: 'test1@test.com',
		},
		{
			name: 'Test Name 7',
			email: 'test1@test.com',
		},
	]

	const [focus, setFocus] = useRoveFocus(listData.length ?? 0)

	return (
		<ul role="list" className="divide-y divide-gray-100">
			{listData.map((person, index) => (
				<ListItem
					index={index}
					setFocus={setFocus}
					focus={focus === index}
					{...person}
					key={person.name}
				/>
			))}
		</ul>
	)
}

const ListItem = ({
	name,
	email,
	index,
	focus,
	setFocus,
}: {
	name: string
	email: string
	index: number
	focus: boolean
	setFocus: (index: number) => void
}) => {
	const focusRef = useHotkeys<HTMLLIElement>(
		[Key.ArrowRight, Key.ArrowLeft, Key.Delete, 'v', 'V', 'p', 'P', 'd', 'D'],
		event => {
			switch (event.key) {
				case Key.ArrowRight: {
					console.log(`Right on ${name}`)
					break
				}
				case Key.ArrowLeft: {
					console.log(`Left on ${name}`)
					break
				}
				case 'v':
				case 'V': {
					console.log(`${name} setted to VENTA`)
					break
				}
				case 'p':
				case 'P': {
					console.log(`${name} setted to PROMO`)
					break
				}
				case 'd':
				case 'D': {
					console.log(`${name} setted to DEVOL`)
					break
				}
				case Key.Delete: {
					console.log(`${name} has been removed.`)
					break
				}
			}
		},
		{ preventDefault: true,  },
	)

	useEffect(() => {
		if (focus && focusRef?.current) {
			focusRef?.current.focus()
		}
	}, [focus])

	const handleKeyDown = () => {
		setFocus(index)
	}

	return (
		<li
			onKeyDown={handleKeyDown}
			tabIndex={index}
			ref={focusRef}
			className="flex gap-x-4 px-3 py-5 outline-none hover:bg-secondary focus:bg-green-200"
		>
			<div className="min-w-0">
				<p className="text-sm font-semibold leading-6 text-foreground">
					{name}
				</p>
				<p className="mt-1 truncate text-xs leading-5 text-muted-foreground">
					{email}
				</p>
			</div>
		</li>
	)
}
