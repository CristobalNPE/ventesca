import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { LinkWithParams } from '#app/components/ui/link-params.tsx'
import { type Category } from '@prisma/client'
import { type SerializeFrom } from '@remix-run/node'

import { Button } from '#app/components/ui/button.tsx'
import { CategoryColorIndicator } from './category-color-indicator'

export function CategoryCard({
	category,
}: {
	category: SerializeFrom<
		Pick<Category, 'id' | 'code' | 'name' | 'description' | 'colorCode'>
	> & { _count: { products: number } }
}) {
	return (
		<Card className="min-w-[17rem] shadow-md hover:z-30">
			<CardHeader>
				<CardTitle className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<CategoryColorIndicator colorCode={category.colorCode} />
						<span>{category.name}</span>
					</div>
					<span className="whitespace-nowrap text-sm tracking-wide text-muted-foreground">
						# {category.code.toString().padStart(3, '0')}
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className={`flex h-[10rem] flex-col gap-4`}>
				<p className="flex-1 text-balance text-muted-foreground">
					{category.description}
				</p>
				<div className="mt-auto flex items-center  justify-between ">
					<span className="">
						{category._count.products}{' '}
						{category._count.products === 1 ? 'producto' : 'productos'}
					</span>
					<Button variant={'secondary'} asChild>
						<LinkWithParams
							to={category.id}
							preserveSearch
							prefetch="intent"
							unstable_viewTransition
						>
							Ver Detalles
						</LinkWithParams>
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
