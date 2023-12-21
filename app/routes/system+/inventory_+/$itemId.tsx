import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { redirectWithToast } from '#app/utils/toast.server.ts'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import { formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { z } from 'zod'
import { ErrorList } from '#app/components/forms.tsx'
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import { prisma } from '#app/utils/db.server.ts'
import {
	formatCurrency,
	invariantResponse,
	useIsPending,
} from '#app/utils/misc.tsx'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const item = await prisma.item.findUnique({
		where: { id: params.itemId },
		select: {
			id: true,
			code: true,
			name: true,
			price: true,
			stock: true,
			createdAt: true,
			updatedAt: true,
			sellingPrice: true,
			family: { select: { description: true, id: true } },
			provider: { select: { fantasyName: true, id: true } },
		},
	})

	invariantResponse(item, 'Not found', { status: 404 })

	return json({
		item: {
			...item,
			updatedAt: formatRelative(subDays(item.updatedAt, 0), new Date(), {
				locale: es,
			}),
		},
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-item'),
	itemId: z.string(),
})

export async function action({ request }: ActionFunctionArgs) {
	// const userId = await requireUserId(request)
	const formData = await request.formData()
	await validateCSRF(formData, request.headers)
	const submission = parse(formData, {
		schema: DeleteFormSchema,
	})
	if (submission.intent !== 'submit') {
		return json({ status: 'idle', submission } as const)
	}
	if (!submission.value) {
		return json({ status: 'error', submission } as const, { status: 400 })
	}

	const { itemId } = submission.value

	const item = await prisma.item.findFirst({
		select: { id: true, name: true },
		where: { id: itemId },
	})
	invariantResponse(item, 'Not found', { status: 404 })

	await prisma.item.delete({ where: { id: item.id } })

	return redirectWithToast(`/system/inventory`, {
		type: 'success',
		title: 'Articulo eliminado',
		description: `Articulo ${item.name} ha sido eliminado con éxito.`,
	})
}

export default function ItemRoute() {
	const { item } = useLoaderData<typeof loader>()

	return (
		<>
			<div className="my-4 flex flex-col gap-4 text-2xl">
				{item.family ? (
					<Badge
						className="my-2 flex w-fit items-center gap-2"
						variant={'secondary'}
					>
						<Icon name="shapes" />
						{item.family.description}
					</Badge>
				) : (
					'Sin clasificar'
				)}
				<div className="flex items-center gap-4">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger className="cursor-default select-text">
								<span className="text-3xl font-semibold">{item.name}</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>ID: {item.id}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<div className="flex items-center gap-2 text-foreground/70">
					<Icon name="scan-barcode" />
					Código:<span className="">{item.code}</span>
				</div>
			</div>

			<div className="mt-8 flex items-center gap-2 text-lg text-foreground/70">
				<Icon name="clock" />
				<span>Ultima actualización {item.updatedAt}</span>
			</div>

			<div className="my-4 flex gap-4 ">
				<div className="relative  h-[13rem] w-[13rem] rounded-md bg-secondary p-4">
					<Icon
						name="package"
						className="absolute inset-24 scale-[8.5] opacity-5"
					/>
					<div className="flex flex-col items-center">
						<p className="mt-10 text-7xl font-bold">{item.stock}</p>
						<p className="text-3xl capitalize">
							{item.stock > 1 || item.stock === 0 ? 'unidades' : 'unidad'}
						</p>
						<p className="text-xl capitalize text-foreground/60">
							{item.stock > 1 || item.stock === 0
								? 'disponibles'
								: 'disponible'}
						</p>
					</div>
				</div>
				<div className="flex flex-col gap-4 ">
					<Link
						to={item.provider ? `/system/providers/${item.provider.id}` : '#'}
						className="flex min-h-[6rem] w-[26rem] cursor-pointer rounded-md bg-secondary p-4"
					>
						<div className="mr-4 grid w-[5rem] place-items-center">
							<Icon name="user" className="scale-[4.5] opacity-5" />
						</div>
						<div className="flex w-full flex-col">
							<p className="text-xl capitalize text-foreground/60">Proveedor</p>
							<p className="text-2xl capitalize">
								{item.provider
									? item.provider.fantasyName
									: 'Sin proveedor definido.'}
							</p>
						</div>
					</Link>
					<div className="flex h-[6rem] w-[26rem] rounded-md bg-secondary p-4">
						<div className="mr-4 grid w-[5rem] place-items-center">
							<Icon
								name="circle-dollar-sign"
								className="scale-[4.5] opacity-5"
							/>
						</div>
						<div className="flex w-full justify-between pr-4">
							<div className="flex flex-col ">
								<p className="text-xl capitalize text-foreground/60">Valor</p>
								<p className="text-2xl ">{formatCurrency(item.price)}</p>
							</div>
							<div className="flex flex-col ">
								<p className="text-xl capitalize text-foreground/60">
									Precio de venta
								</p>
								<p className="text-2xl font-black">
									{formatCurrency(item.sellingPrice)}
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<div className="mt-8 flex max-w-[40rem] justify-between">
				<Button variant={'ghost'} asChild>
					<Link to={'..'} relative="path" className="flex items-center gap-2">
						<Icon name="arrow-left" />
						<span>Volver al Inventario</span>
					</Link>
				</Button>

				<div className="flex gap-4">
					<AlertDialog>
						<AlertDialogTrigger>
							<Button variant={'secondary'} className="flex items-center gap-2">
								<Icon name="trash" />
								<span>Eliminar</span>
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Confirmar eliminación de articulo
								</AlertDialogTitle>
								<AlertDialogDescription>
									Esta acción no se puede deshacer. Por favor confirme que desea
									eliminar el articulo.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter className="flex gap-6">
								<AlertDialogCancel>Cancelar</AlertDialogCancel>
								<DeleteItem id={item.id} />
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
					<Button variant={'default'} asChild>
						<Link to={'edit'} className="flex items-center gap-2">
							<Icon name="update" />
							<span>Editar</span>
						</Link>
					</Button>
				</div>
			</div>
		</>
	)
}

export function DeleteItem({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-item',
		lastSubmission: actionData?.submission,
	})

	return (
		<Form method="POST" {...form.props}>
			<AuthenticityTokenInput />
			<input type="hidden" name="itemId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-item"
				variant="destructive"
				status={isPending ? 'pending' : actionData?.status ?? 'idle'}
				disabled={isPending}
			>
				<div className="flex items-center gap-2">
					<Icon name="trash" />
					<span>Eliminar</span>
				</div>
			</StatusButton>
			<ErrorList errors={form.errors} id={form.errorId} />
		</Form>
	)
}

// export const meta: MetaFunction<
// 	typeof loader,
// 	{ 'routes/users+/$username_+/notes': typeof notesLoader }
// > = ({ data, params, matches }) => {
// 	const notesMatch = matches.find(
// 		m => m.id === 'routes/users+/$username_+/notes',
// 	)
// 	const displayName = notesMatch?.data?.owner.name ?? params.username
// 	const noteTitle = data?.note.title ?? 'Note'
// 	const noteContentsSummary =
// 		data && data.note.content.length > 100
// 			? data?.note.content.slice(0, 97) + '...'
// 			: 'No content'
// 	return [
// 		{ title: `${noteTitle} | ${displayName}'s Notes | Epic Notes` },
// 		{
// 			name: 'description',
// 			content: noteContentsSummary,
// 		},
// 	]
// }

export function ErrorBoundary() {
	return (
		<GeneralErrorBoundary
			statusHandlers={{
				403: () => <p>You are not allowed to do that</p>,
				404: ({ params }) => (
					<p>No existe articulo con ID: "{params.itemId}"</p>
				),
			}}
		/>
	)
}
