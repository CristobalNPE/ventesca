import { CategoryDetailsCard } from '#app/components/categories/category-details-card.js'
import { useIsUserAdmin } from '#app/utils/user.ts'

export default function CategoryDetails() {
	const isAdmin = useIsUserAdmin()
	return <CategoryDetailsCard isAdmin={isAdmin} />
}
