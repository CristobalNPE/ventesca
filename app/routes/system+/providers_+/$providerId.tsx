import { useForm } from '@conform-to/react'
import { parse } from '@conform-to/zod'
import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { format } from '@validatecl/rut'
import { formatRelative, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'
import { z } from 'zod'
import { GeneralErrorBoundary } from '#app/components/error-boundary.tsx'

import { ErrorList } from '#app/components/forms.tsx'
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
import { Button } from '#app/components/ui/button.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { validateCSRF } from '#app/utils/csrf.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { invariantResponse, useIsPending } from '#app/utils/misc.tsx'
import { redirectWithToast } from '#app/utils/toast.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const provider = await prisma.provider.findUnique({
		where: { id: params.providerId },
		select: {
			id: true,
			rut: true,

			name: true,
			address: true,
			phone: true,
			city: true,
			fantasyName: true,
			fax: true,
			createdAt: true,
			updatedAt: true,
		},
	})
	invariantResponse(provider, 'Not found', { status: 404 })
	const providerItemsCount = await prisma.item.count({
		where: { providerId: provider.id },
	})

	return json({
		provider: {
			...provider,

			updatedAt: formatRelative(subDays(provider.updatedAt, 0), new Date(), {
				locale: es,
			}),
		},
		providerItemsCount,
	})
}

const DeleteFormSchema = z.object({
	intent: z.literal('delete-provider'),
	providerId: z.string(),
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

	const { providerId } = submission.value

	const provider = await prisma.provider.findFirst({
		select: { id: true, name: true },
		where: { id: providerId },
	})
	invariantResponse(provider, 'Not found', { status: 404 })

	await prisma.provider.delete({ where: { id: provider.id } })

	return redirectWithToast(`/system/providers`, {
		type: 'success',
		title: 'Proveedor eliminado',
		description: `El proveedor ${provider.name} ha sido eliminado con éxito.`,
	})
}

export default function ProviderRoute() {
	const isAdmin = true
	const { provider, providerItemsCount } = useLoaderData<typeof loader>()
	const address = provider.address
		? provider.address
		: 'Sin dirección definida.'
	const phone = provider.phone ? provider.phone : 'Sin teléfono definido.'
	const city = provider.city ? provider.city : 'Sin ciudad definida.'
	const fax = provider.fax ? provider.fax : 'Sin fax definido.'

	return (
		<>
			<div className="mb-4 flex flex-col gap-4 text-2xl">
				<div className="flex items-center gap-4">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger className="cursor-default select-text">
								<span className="text-3xl font-semibold">
									{provider.fantasyName}
								</span>
							</TooltipTrigger>
							<TooltipContent>
								<p>ID: {provider.id}</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
				<div className="flex items-center gap-2 text-foreground/70">
					<Icon name="user" />
					<span className="">{provider.name}</span>
				</div>
			</div>

			<div className="mt-8 flex items-center gap-2 text-lg text-foreground/70">
				<Icon name="clock" />
				<span>Ultima actualización {provider.updatedAt}</span>
			</div>

			<div className="my-4 flex max-w-[40rem] flex-col gap-4 ">
				<div className="flex w-full gap-4">
					<Link
						to={`/system/inventory?by-provider=${provider.id}`}
						className="relative  h-[13rem] w-[13rem] rounded-md bg-secondary p-4"
					>
						<Icon
							name="package"
							className="absolute inset-24 scale-[8.5] opacity-5"
						/>
						<div className="flex flex-col items-center">
							<p className="mt-10 text-7xl font-bold">{providerItemsCount}</p>
							<p className="text-3xl capitalize">
								{providerItemsCount > 1 || providerItemsCount === 0
									? 'artículos'
									: 'articulo'}
							</p>
							<p className="text-xl capitalize text-foreground/60">
								{providerItemsCount > 1 || providerItemsCount === 0
									? 'asociados'
									: 'asociado'}
							</p>
						</div>
					</Link>
					<div className="flex flex-1 flex-col gap-4">
						<InfoCard title="RUT" data={format(provider.rut)} icon="id" />
						<InfoCard title="Teléfono" data={phone} icon="phone" />
					</div>
				</div>
				<div className="flex flex-col gap-4">
					<InfoCard title="Dirección" data={address} icon="map-pin-filled" />
					<InfoCard title="Ciudad" data={city} icon="map" />
					<InfoCard title="Fax" data={fax} icon="printer" />
				</div>
				<div className="mt-4 flex max-w-[40rem] justify-between">
					<Button variant={'ghost'} asChild>
						<Link to={'..'} relative="path" className="flex items-center gap-2">
							<Icon name="arrow-left" />
							<span>Volver al Inventario</span>
						</Link>
					</Button>

					{isAdmin && (
						<div className="flex gap-4">
							<AlertDialog>
								<AlertDialogTrigger>
									<Button
										variant={'secondary'}
										className="flex items-center gap-2"
									>
										<Icon name="trash" />
										<span>Eliminar</span>
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>
											Confirmar eliminación de proveedor
										</AlertDialogTitle>
										<AlertDialogDescription>
											<br />
											{providerItemsCount !== 0 &&
												`Eliminar a ${
													provider.name
												} del registro también eliminara  ${
													providerItemsCount > 1
														? `los ${providerItemsCount}`
														: 'el'
												}  ${
													providerItemsCount > 1 ? 'artículos' : 'articulo'
												} ${
													providerItemsCount > 1 ? 'asociados' : 'asociado'
												} a este proveedor.`}
											{providerItemsCount !== 0 && (
												<>
													<br />
													<br />
												</>
											)}
											Esta acción no se puede deshacer. Por favor confirme que
											desea eliminar el proveedor y su(s) artículo(s)
											asociado(s).
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter className="flex gap-6">
										<AlertDialogCancel>Cancelar</AlertDialogCancel>

										<DeleteProvider id={provider.id} />
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
							<Button variant={'default'} asChild>
								<Link
									to={'edit'}
									relative="path"
									className="flex items-center gap-2"
								>
									<Icon name="update" />
									<span>Editar</span>
								</Link>
							</Button>
						</div>
					)}
				</div>
			</div>
		</>
	)
}

export function DeleteProvider({ id }: { id: string }) {
	const actionData = useActionData<typeof action>()
	const isPending = useIsPending()
	const [form] = useForm({
		id: 'delete-provider',
		lastSubmission: actionData?.submission,
	})

	return (
		<Form method="POST" {...form.props}>
			<AuthenticityTokenInput />
			<input type="hidden" name="providerId" value={id} />
			<StatusButton
				type="submit"
				name="intent"
				value="delete-provider"
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
					<p>No existe proveedor con ID: "{params.itemId}"</p>
				),
			}}
		/>
	)
}

export function InfoCard({
	title,
	data,
	icon,
}: {
	title: string
	data: string
	icon: IconName
}) {
	return (
		<div className="flex min-h-[6rem] w-full rounded-md bg-secondary p-4">
			<div className="mr-4 grid w-[5rem] place-items-center">
				<Icon name={icon} className="scale-[3.5] opacity-5" />
			</div>
			<div className="flex w-full flex-col">
				<p className="text-lg uppercase text-foreground/60">{title}</p>
				<p className="text-lg uppercase">{data}</p>
			</div>
		</div>
	)
}
