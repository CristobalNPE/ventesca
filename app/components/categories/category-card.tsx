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

export function CategoryCard({
	category,
}: {
	category: SerializeFrom<
		Pick<Category, 'id' | 'code' | 'name' | 'description' | 'colorCode'>
	> & { _count: { products: number } }
}) {
	return (
		<Card className="shadow-md ">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<div className="relative flex aspect-square h-7 w-7 items-center justify-center  overflow-hidden rounded-full border">
						<input
							type="color"
							className="absolute h-36  w-36 appearance-none border-none bg-transparent "
							disabled
							value={category.colorCode}
						/>
					</div>
					{category.name}
				</CardTitle>
			</CardHeader>
			<CardContent className={`flex h-[10rem] flex-col gap-4`}>
				<p className="flex-1 text-balance text-muted-foreground">
					{category.description}
				</p>
				<div className="mt-auto flex items-center  justify-between ">
					<span className="">{category._count.products} {category._count.products === 1 ? 'producto' : 'productos'}</span>
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
