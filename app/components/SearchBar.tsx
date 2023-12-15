import { Form, useSearchParams, useSubmit } from '@remix-run/react'
import { useId } from 'react'
import { useDebounce, useIsPending } from '#app/utils/misc.tsx'
import { Icon, type IconName } from './ui/icon.tsx'
import { Input } from './ui/input.tsx'
import { Label } from './ui/label.tsx'
import { StatusButton } from './ui/status-button.tsx'

export function SearchBar({
	status,
	onFocus,
	autoFocus = false,
	autoSubmit = false,
	formAction,
	queryName,
	label,
	icon,
}: {
	status: 'idle' | 'pending' | 'success' | 'error'
	onFocus?: () => void
	autoFocus?: boolean
	autoSubmit?: boolean
	formAction: string
	queryName: string
	label: string
	icon: IconName
}) {
	const id = useId()
	const [searchParams] = useSearchParams()
	const submit = useSubmit()
	const isSubmitting = useIsPending({
		formMethod: 'GET',
		formAction: formAction,
	})

	const handleFormChange = useDebounce((form: HTMLFormElement) => {
		submit(form)
	}, 400)

	return (
		<Form
			method="GET"
			action={formAction}
			className="flex flex-wrap items-center justify-center gap-2"
			onChange={e => autoSubmit && handleFormChange(e.currentTarget)}
		>
			<div className="flex-1">
				<Label htmlFor={id} className="sr-only">
					Search
				</Label>
				<Input
					onFocus={onFocus}
					type="search"
					name={queryName}
					id={id}
					defaultValue={searchParams.get('search') ?? ''}
					placeholder={label}
					className="w-[10rem] sm:w-[20rem] [&::-webkit-inner-spin-button]:appearance-none"
					autoFocus={autoFocus}
				/>
			</div>
			<div>
				<StatusButton
					type="submit"
					status={isSubmitting ? 'pending' : status}
					className="flex w-full items-center justify-center"
					size="sm"
				>
					<Icon name={icon} size="md" />
					<span className="sr-only">Buscar</span>
				</StatusButton>
			</div>
		</Form>
	)
}
