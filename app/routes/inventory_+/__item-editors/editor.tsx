import { useFetcher } from '@remix-run/react'
import { useEffect } from 'react'
import { Button } from '#app/components/ui/button.tsx'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '#app/components/ui/dialog.tsx'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from '#app/components/ui/drawer.tsx'
import { Icon, type IconName } from '#app/components/ui/icon.tsx'
import { type action } from '#app/routes/inventory_+/edit.js'

export function Editor({
	fetcherKey,
	icon,
	label,
	value,
	targetValue,
	form,
	submitButton,
	open,
	setOpen,
	formatFn,
}: {
	fetcherKey: string
	icon: IconName
	label: string
	value: string | number
	targetValue: string | number
	form: JSX.Element
	submitButton: JSX.Element
	open: boolean
	setOpen: (value: boolean) => void
	formatFn?: (value: number | null) => string
}) {
	let fetcher = useFetcher<typeof action>({ key: fetcherKey })

	//We close the modal after the submission is successful.
	useEffect(() => {
		if (fetcher.state === 'idle' && fetcher.data?.result.status === 'success') {
			setOpen(false)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fetcher])

	const isMobile = false

	const sanitizedTargetValue = targetValue ? targetValue : value

	const formattedTargetValue = formatFn
		? formatFn(Number(targetValue))
		: sanitizedTargetValue

	const sanitizedValue = value ? value : 'Sin definir'
	const formattedValue =
		formatFn && typeof sanitizedValue === 'number'
			? formatFn(Number(sanitizedValue))
			: sanitizedValue

	if (!isMobile) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogTrigger asChild>
					<Button variant="outline" size={'icon'} className="h-7 w-7">
						<Icon name="pencil-2" />
						<span className="sr-only">Modificar</span>
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Modificar {label}</DialogTitle>
						<DialogDescription>
							Indique el nuevo valor para el campo.
						</DialogDescription>
					</DialogHeader>
					{form}
					<div className="flex items-center justify-between gap-3">
						<div className="flex w-full items-center justify-center gap-3 break-all rounded-md bg-secondary/70 p-3 font-semibold text-muted-foreground">
							<div className="flex flex-col items-center gap-3">
								<Icon name={icon} className="shrink-0 text-3xl" />
								<div className="flex flex-col">
									<span className="text-center uppercase text-foreground">
										{formattedValue}
									</span>
								</div>
							</div>
						</div>
						<div>
							<Icon className="text-5xl" name="arrow-right" />
						</div>
						<div className="flex w-full grow items-center justify-center gap-3 break-all rounded-md bg-secondary/70 p-3 font-semibold text-muted-foreground">
							<div className="flex flex-col items-center gap-3">
								<Icon name={icon} className="shrink-0 text-3xl" />
								<div className="flex flex-col">
									<span className="text-center uppercase text-foreground ">
										{formattedTargetValue}
									</span>
								</div>
							</div>
						</div>
					</div>

					<DialogFooter className="m-auto">{submitButton}</DialogFooter>
				</DialogContent>
			</Dialog>
		)
	}
	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button variant="outline">Edit Profile</Button>
			</DrawerTrigger>
			<DrawerContent>
				<DrawerHeader className="text-left">
					<DrawerTitle>Edit profile</DrawerTitle>
					<DrawerDescription>
						Make changes to your profile here. Click save when you're done.
					</DrawerDescription>
				</DrawerHeader>
				{/* Content Here */}
				<DrawerFooter className="pt-2">
					<DrawerClose asChild>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
