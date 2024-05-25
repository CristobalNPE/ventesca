// import { type LoaderFunctionArgs, json } from '@remix-run/node'
// import { useLoaderData } from '@remix-run/react'
// import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
// import { Icon } from '#app/components/ui/icon.tsx'
// import { prisma } from '#app/utils/db.server.ts'
// import { invariantResponse } from '#app/utils/misc.tsx'

// import { CategoryEditor, action } from './__category-editor.tsx'

// export { action }
// export async function loader({ params }: LoaderFunctionArgs) {
// 	// const userId = await requireUserId(request)

// 	const category = await prisma.category.findFirst({
// 		select: {
// 			id: true,
// 			code: true,
// 			description: true,
// 		},
// 		where: {
// 			id: params.categoryId,
// 		},
// 	})
// 	invariantResponse(category, 'Not found', { status: 404 })

// 	return json({ category })
// }

// export default function ItemEdit() {
// 	const { category } = useLoaderData<typeof loader>()

// 	return (
// 		<div className="flex max-w-[35rem] flex-col  rounded-md bg-secondary">
// 			<div className="flex gap-4 rounded-t-md bg-primary/50 p-3 text-2xl">
// 				<Icon name="route" />
// 				<h1>Modificar categoría</h1>
// 			</div>
// 			<CategoryEditor category={category} />
// 		</div>
// 	)
// }
// export function ErrorBoundary() {
// 	return (
// 		<GeneralErrorBoundary
// 			statusHandlers={{
// 				404: ({ params }) => (
// 					<p>Categoría con ID "{params.itemId}" no existe</p>
// 				),
// 			}}
// 		/>
// 	)
// }
