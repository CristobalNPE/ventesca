import { getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { invariantResponse } from '@epic-web/invariant'
import { type Session } from '@prisma/client'
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node'

import { redirect, useFetcher, useLoaderData } from '@remix-run/react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { useId } from 'react'
import { z } from 'zod'
import { DetailsCard } from '#app/components/details-card.tsx'

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
import { Badge } from '#app/components/ui/badge.tsx'
import { Button } from '#app/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { StatusButton } from '#app/components/ui/status-button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
import { getBusinessId } from '#app/utils/auth.server.ts'
import { prisma } from '#app/utils/db.server.ts'
import { getUserImgSrc, useDoubleCheck } from '#app/utils/misc.tsx'
import { requireUserWithRole } from '#app/utils/permissions.server.ts'

const DeleteSellerSessionSchema = z.object({
	sessionId: z.string(),
})

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const businessId = await getBusinessId(userId)

	const seller = await prisma.user.findUnique({
		where: { id: params.sellerId, businessId },
		include: { roles: true, image: true, connections: true, sessions: true },
	})

	invariantResponse(seller, 'Not found', { status: 404 })

	return json({
		seller,
	})
}

type SellerActionArgs = {
	request: Request
	sellerId: string
	formData: FormData
}
const deleteSellerSessionActionIntent = 'delete-seller-session'
const blockSellerAccountActionIntent = 'block-seller-account'
const unblockSellerAccountActionIntent = 'unblock-seller-account'
const deleteSellerAccountActionIntent = 'delete-seller-account'
const editSellerAccountActionIntent = 'edit-seller-account'

export async function action({ request, params }: ActionFunctionArgs) {
	const userId = await requireUserWithRole(request, 'Administrador')
	const formData = await request.formData()
	const intent = formData.get('intent')
	const sellerId = params.sellerId
	invariantResponse(intent, 'Intent should be defined.')
	invariantResponse(sellerId, 'Seller Id should be defined.')

	switch (intent) {
		case deleteSellerSessionActionIntent: {
			return deleteSellerSessionAction({ request, sellerId, formData })
		}
		case blockSellerAccountActionIntent: {
			return blockSellerAccountAction(sellerId)
		}
		case unblockSellerAccountActionIntent: {
			return unblockSellerAccountAction(sellerId)
		}
		case deleteSellerAccountActionIntent: {
			return deleteSellerAccountAction(sellerId)
		}
	}
}

export default function SellerRoute() {
	const { seller } = useLoaderData<typeof loader>()

	return (
		<Card className="flex h-[85dvh] animate-slide-left flex-col overflow-hidden">
			<CardHeader className="flex flex-row items-start justify-between bg-muted/50">
				<div className="flex items-center gap-5">
					<img
						className="h-12 w-12 shrink-0  rounded-full border object-cover "
						alt={seller.name ?? seller.username}
						src={getUserImgSrc(seller.image?.id)}
					/>
					<div className="flex flex-col">
						<CardTitle className="group flex items-center gap-2 text-lg ">
							<div className="flex items-center gap-12 text-lg">
								<span>{seller.name}</span>
							</div>
						</CardTitle>
						<CardDescription>
							Fecha registro:
							{format(new Date(seller.createdAt), " dd' de 'MMMM', 'yyyy", {
								locale: es,
							})}
						</CardDescription>
					</div>
					<Badge
						variant={'secondary'}
						className="flex items-center justify-center gap-1"
					>
						{seller.roles[0]?.name}
					</Badge>
				</div>

				{/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size={'sm'} className="h-7 w-7" variant={'outline'}>
              <Icon className="shrink-0" name="dots-vertical" />
              <span className="sr-only">Opciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="flex flex-col gap-2 " align="end">
            <DropdownMenuItem asChild>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="h-8 gap-1"
              >
                <Link to={'edit'}>
                  <Icon name="update" className="h-3.5 w-3.5" />
                  <span className="lg:sr-only xl:not-sr-only xl:whitespace-nowrap">
                    Editar proveedor
                  </span>
                </Link>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <ChangeItemsCategory />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <DeleteSupplier
                id={supplier.id}
                numberOfItems={supplier.items.length}
              />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
			</CardHeader>
			<CardContent className="grid flex-1 gap-10 p-6 text-sm xl:grid-cols-5">
				<div className="col-span-3 flex flex-col gap-4">
					<DetailsCard
						icon={'id'}
						description={'ID'}
						data={seller.id.toUpperCase()}
					/>
					{seller.name ? (
						<DetailsCard
							icon={'user'}
							description={'Nombre'}
							data={seller.name}
						/>
					) : null}
					<DetailsCard
						icon={'id-badge-2'}
						description={'Nombre de usuario'}
						data={seller.username}
					/>
					<DetailsCard
						icon={'envelope-closed'}
						description={'Correo Electrónico'}
						data={seller.email}
					/>
					<DetailsCard
						icon={'laptop'}
						description={'Estado de cuenta'}
						data={seller.isActive ? 'Activa' : 'Bloqueada'}
					/>
				</div>
				<div className="col-span-2 flex flex-col gap-3">
					<DeleteSellerAccount />
					<Button variant={'outline'}>
						<Icon className="mr-2" name="update" />
						Modificar Datos
					</Button>
					<ToggleBlockSellerAccount isUserActive={seller.isActive} />
					<p>
						{seller.sessions.length > 0
							? 'Sesiones activas'
							: 'Sin sesiones activas.'}
					</p>
					{seller.sessions.map(session => (
						<SessionInfoCard key={session.id} session={session} />
					))}
				</div>
			</CardContent>
			<CardFooter className="flex flex-row items-center border-t bg-muted/50 px-6 py-3">
				<div className="text-xs text-muted-foreground">
					Actualizada por ultima vez el{' '}
					{format(
						new Date(seller.updatedAt),
						"dd 'de' MMMM', 'yyyy' a las' hh:mm",
						{
							locale: es,
						},
					)}
				</div>
			</CardFooter>
		</Card>
	)
}

const osIcons: Record<string, IconName> = {
	['Android']: 'brand-android',
	['iOS']: 'brand-apple',
	['MacOS']: 'brand-apple',
	['Windows']: 'brand-windows',
	['UNIX']: 'brand-ubuntu',
	['Linux']: 'brand-ubuntu',
	['Version desconocida']: 'device-desktop',
}

function SessionInfoCard({
	session,
}: {
	session: SerializeFrom<
		Pick<Session, 'id' | 'browser' | 'createdAt' | 'os' | 'version'>
	>
}) {
	const fetcher = useFetcher<typeof deleteSellerSessionAction>({
		key: `${deleteSellerSessionActionIntent}-ID${session.id}`,
	})
	const dc = useDoubleCheck()

	const [form, fields] = useForm({
		id: `${deleteSellerSessionActionIntent}-ID${session.id}`,
		constraint: getZodConstraint(DeleteSellerSessionSchema),
		lastResult: fetcher.data?.result,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: DeleteSellerSessionSchema })
		},
	})

	return (
		<div className="flex items-center justify-between  gap-2 rounded-sm bg-accent p-3">
			<div className="flex gap-3 rounded-sm ">
				<Icon
					className="text-3xl"
					name={osIcons[session.os] || 'device-desktop'}
				/>
				<div>
					<div className="font-bold">{session.os}</div>
					<div className="font-bold">
						{session.browser}{' '}
						<span className="text-muted-foreground">v{session.version}</span>
					</div>
					<div className="mt-1 text-xs text-muted-foreground">
						Activa desde{' '}
						{format(
							new Date(session.createdAt),
							" dd' de 'MMMM' 'yyyy', 'hh:mm aaaa",
							{
								locale: es,
							},
						)}
					</div>
				</div>
			</div>
			<TooltipProvider>
				<Tooltip>
					<TooltipTrigger asChild>
						<fetcher.Form method="POST" {...getFormProps(form)}>
							<input type="hidden" name="sessionId" value={session.id} />
							<StatusButton
								{...dc.getButtonProps({
									type: 'submit',
									name: 'intent',
									value: deleteSellerSessionActionIntent,
								})}
								size={'icon'}
								variant={dc.doubleCheck ? 'destructive' : 'default'}
								status={
									fetcher.state !== 'idle' ? 'pending' : form.status ?? 'idle'
								}
								className="flex h-7 w-7 items-center justify-center"
							>
								<Icon name="exit" />
							</StatusButton>
						</fetcher.Form>
					</TooltipTrigger>
					<TooltipContent>
						<p> {dc.doubleCheck ? 'Confirmar' : 'Cerrar sesión'}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		</div>
	)
}

async function deleteSellerSessionAction({
	sellerId,
	formData,
}: SellerActionArgs) {
	const submission = await parseWithZod(formData, {
		schema: DeleteSellerSessionSchema,
	})
	if (submission.status !== 'success') {
		return json(
			{ result: submission.reply() },
			{ status: submission.status === 'error' ? 400 : 200 },
		)
	}
	const { sessionId } = submission.value

	await prisma.session.delete({
		where: { userId: sellerId, id: sessionId },
	})

	return json({
		result: submission.reply(),
	})
}

function ToggleBlockSellerAccount({ isUserActive }: { isUserActive: boolean }) {
	const id = useId()
	const fetcher = isUserActive
		? useFetcher<typeof blockSellerAccountAction>({
				key: `${blockSellerAccountActionIntent}-ID${id}`,
			})
		: useFetcher<typeof unblockSellerAccountAction>({
				key: `${unblockSellerAccountActionIntent}-ID${id}`,
			})

	return (
		<fetcher.Form method="POST">
			{isUserActive ? (
				<StatusButton
					type="submit"
					name="intent"
					value={blockSellerAccountActionIntent}
					variant={'outline'}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
					className="w-full "
				>
					<Icon className="mr-2" name="lock" />
					<span>Bloquear Cuenta</span>
				</StatusButton>
			) : (
				<StatusButton
					type="submit"
					name="intent"
					value={unblockSellerAccountActionIntent}
					variant={'outline'}
					status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
					className="w-full"
					iconName={'lock-open'}
				>
					<Icon className="mr-2" name="lock-open" />
					<span>Desbloquear Cuenta</span>
				</StatusButton>
			)}
		</fetcher.Form>
	)
}

async function blockSellerAccountAction(sellerId: string) {
	await prisma.session.deleteMany({
		where: { userId: sellerId },
	})

	await prisma.user.update({
		data: { isActive: false },
		where: { id: sellerId },
	})

	return json({ status: 'success' })
}

async function unblockSellerAccountAction(sellerId: string) {
	await prisma.user.update({
		data: { isActive: true },
		where: { id: sellerId },
	})

	return json({ status: 'success' })
}

function DeleteSellerAccount() {
	const id = useId()
	const fetcher = useFetcher<typeof blockSellerAccountAction>({
		key: `${deleteSellerAccountActionIntent}-ID${id}`,
	})

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'outline'}>
					<Icon className="mr-2" name="trash" />
					Eliminar Permanentemente
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Confirmar eliminación de vendedor</AlertDialogTitle>
					<AlertDialogDescription>
						Esta acción no se puede revertir. La cuenta del vendedor se
						eliminará de los registros y ya no podrá ser utilizada ni
						administrada.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancelar</AlertDialogCancel>
					<fetcher.Form method="POST">
						<StatusButton
							type="submit"
							name="intent"
							value={deleteSellerAccountActionIntent}
							variant={'destructive'}
							status={fetcher.state !== 'idle' ? 'pending' : 'idle'}
							className="w-full "
						>
							<Icon className="mr-2" name="lock" />
							<span>Eliminar Permanentemente</span>
						</StatusButton>
					</fetcher.Form>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

async function deleteSellerAccountAction(sellerId: string) {
	await prisma.session.deleteMany({
		where: { userId: sellerId },
	})
	await prisma.user.update({
		data: { isActive: false, isDeleted: true },
		where: { id: sellerId },
	})

	return redirect("/sellers")
}
