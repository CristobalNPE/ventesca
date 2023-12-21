import { useState } from 'react'
import { Input } from './ui/input.tsx'
import { SelectModal } from './ui/select-modal.tsx'

export type Category = {
	id: string
	code: number
	description: string
}

export function SelectCategory({
	categories,
	selectedCategory,
	setSelectedCategory,
}: {
	categories: Category[]
	selectedCategory: Category | null
	setSelectedCategory: React.Dispatch<React.SetStateAction<Category | null>>
}) {
	const [categoryModalOpen, setCategoryModalOpen] = useState(false)
	const [categoryFilter, setCategoryFilter] = useState('')
	const handleCategoryFilterChange = (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		setCategoryFilter(e.target.value)
	}
	const filteredCategories = categories.filter(category => {
		return (
			category.description
				.toLowerCase()
				.includes(categoryFilter.toLowerCase()) ||
			category.code.toString().includes(categoryFilter)
		)
	})

	return (
		<SelectModal
			open={categoryModalOpen}
			onOpenChange={setCategoryModalOpen}
			title="Categoría"
			selected={selectedCategory?.description}
		>
			<Input
				autoFocus
				type="text"
				className="mb-4 w-full"
				onChange={handleCategoryFilterChange}
				defaultValue={categoryFilter}
			/>
			<div className="flex max-h-[15rem] flex-col gap-1 overflow-auto">
				{filteredCategories.map(category => (
					<div
						key={category.id}
						className="flex cursor-pointer items-center gap-2 rounded-sm p-1 hover:bg-primary/50"
						onClick={() => {
							setSelectedCategory(category)
							setCategoryModalOpen(false)
						}}
					>
						<span className="w-[7rem]">{category.code}</span>{' '}
						<span className="border-l-2 pl-2">{category.description}</span>
					</div>
				))}
			</div>
		</SelectModal>
	)
}
