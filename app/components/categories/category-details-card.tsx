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
import { Button } from '../ui/button'
import { Link } from '@remix-run/react'

export function CategoryDetailsCard({ isAdmin }: { isAdmin: boolean }) {
	const { category } = useCategory()

	const canEdit = isAdmin && !category.isEssential

	return (
		<Card className='min-h-[27rem] flex flex-col '>
			<CardHeader className="flex flex-row items-center justify-between ">
				<CardTitle>Detalles de la categoría</CardTitle>
				<CategoryColorIndicator colorCode={category.colorCode} />
			</CardHeader>
			<CardContent className="grid gap-6 flex-1">
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
			<CardFooter className="flex  flex-row items-center justify-between gap-4 border-t bg-muted/50 py-3 px-6  text-muted-foreground">
				<span className="flex items-center gap-1 text-xs">
					<Icon size="sm" name="clock" /> Última modificación{' '}
					{formatRelative(subDays(category.updatedAt, 0), new Date(), {
						locale: es,
					})}
				</span>
				{canEdit && (
					<Button size={'sm'} asChild>
						<Link to={`edit`} unstable_viewTransition>
							<Icon name="pencil-2">Modificar datos</Icon>
						</Link>
					</Button>
				)}
			</CardFooter>
		</Card>
	)
}
