import { format, formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'

import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'

import { CardContentItem } from '#app/components/card-content-item.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { useCategory } from '#app/context/categories/CategoryContext.tsx'
import { CategoryColorIndicator } from './category-color-indicator'

export function CategoryDetails() {
	const { category } = useCategory()
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between ">
				<CardTitle>Detalles de la categoría</CardTitle>
				<CategoryColorIndicator colorCode={category.colorCode} />
			</CardHeader>
			<CardContent className="grid gap-6">
				<CardContentItem
					icon={'hash'}
					title={'Código'}
					content={category.code.toString().padStart(3, '0')}
				/>
				<CardContentItem icon={'id'} title={'Nombre'} content={category.name} />
				<CardContentItem
					icon={'file-text'}
					title={'Descripción'}
					content={category.description}
				/>
				<CardContentItem
					icon={'calendar'}
					title={'Fecha registro'}
					content={format(category.createdAt, "dd'/'MM'/'yyyy 'a las' HH:MM", {
						locale: es,
					})}
				/>
			</CardContent>
			<CardFooter className="flex  flex-row items-center justify-end border-t bg-muted/50 p-3 text-sm text-muted-foreground">
				<span className="flex items-center gap-1">
					<Icon size="sm" name="clock" /> Última modificación{' '}
					{formatRelative(subDays(category.updatedAt, 0), new Date(), {
						locale: es,
					})}
				</span>
			</CardFooter>
		</Card>
	)
}
