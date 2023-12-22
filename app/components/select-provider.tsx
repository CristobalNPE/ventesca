import { useState } from 'react'
import { Input } from './ui/input.tsx'
import { SelectModal } from './ui/select-modal.tsx'
import { format } from '@validatecl/rut'

export type Provider = {
	id: string
	rut: string
	name: string
	fantasyName: string
}

export function SelectProvider({
	providers,
	selectedProvider,
	setSelectedProvider,
}: {
	providers: Provider[]
	selectedProvider: Provider | null
	setSelectedProvider: React.Dispatch<React.SetStateAction<Provider | null>>
}) {
	const [providerModalOpen, setProviderModalOpen] = useState(false)
	const [providerFilter, setProviderFilter] = useState('')
	const handleProviderFilterChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setProviderFilter(e.target.value)
	}
	const filteredProviders = providers.filter(provider => {
		return (
			provider.name.toLowerCase().includes(providerFilter.toLowerCase()) ||
			provider.rut.includes(providerFilter)
		)
	})

	return (
		<SelectModal
			open={providerModalOpen}
			onOpenChange={setProviderModalOpen}
			title="Proveedor"
			selected={selectedProvider?.name}
		>
			<Input
				autoFocus
				type="text"
				className="mb-4 w-full"
				onChange={handleProviderFilterChange}
				defaultValue={providerFilter}
			/>
			<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
				{filteredProviders.map(provider => (
					<div
						key={provider.id}
						className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/50"
						onClick={() => {
							setSelectedProvider(provider)
							setProviderModalOpen(false)
						}}
					>
						<span className="w-[7rem]">{format(provider.rut)}</span>{' '}
						<span className="border-l-2 pl-2">{provider.name}</span>
					</div>
				))}
			</div>
		</SelectModal>
	)
}
