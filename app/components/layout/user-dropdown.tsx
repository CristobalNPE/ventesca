import { Form, Link, useSubmit } from '@remix-run/react'
import { useRef } from 'react'
import { Icon } from '#app/components/ui/icon.tsx'
import { getUserImgSrc } from '#app/utils/misc.tsx'
import { useUser } from '#app/utils/user.ts'
import { Button } from '../ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuPortal,
	DropdownMenuTrigger,
} from '../ui/dropdown-menu'
interface UserDropdownProps {
	isOpen: boolean | undefined
}

export function UserDropdown({ isOpen }: UserDropdownProps) {
	const user = useUser()
	const submit = useSubmit()
	const formRef = useRef<HTMLFormElement>(null)
	const displayName =
		(user.name || user.username).length > 17
			? (user.name || user.username).slice(0, 17) + '...'
			: user.name || user.username

	const getUserRole = (roles: string[]) => {
		if (roles.includes('Administrador')) return 'Administrador'
		return 'Vendedor'
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					className="group flex rounded p-0 hover:bg-transparent "
					asChild
					variant="ghost"
				>
					<Link
						to={`/users/${user.username}`}
						// this is for progressive enhancement
						onClick={(e) => e.preventDefault()}
						className="ml-1   flex min-w-[3rem] shrink-0  items-center gap-3  px-4 lg:justify-start 2xl:ml-0   "
					>
						<img
							className="aspect-square max-w-[2.5rem]  shrink-0 rounded-full bg-secondary object-cover ring-2 ring-secondary   transition-all  group-hover:scale-105 group-hover:ring-primary"
							alt={user.name ?? user.username}
							src={getUserImgSrc(user.image?.id)}
						/>
						{isOpen && (
							<div className="flex  flex-col">
								<span className="text-body-sm font-bold ">{displayName}</span>
								<span className="text-body-xs font-semibold tracking-wide text-muted-foreground">
									{getUserRole(user.roles.map((rol) => rol.name))}
								</span>
							</div>
						)}
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent className="z-[300]" sideOffset={8} align="end">
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to={`/users/${user.username}`}>
							<Icon className="text-body-md" name="avatar">
								Perfil
							</Icon>
						</Link>
					</DropdownMenuItem>
					<DropdownMenuItem asChild></DropdownMenuItem>
					<DropdownMenuItem
						asChild
						// this prevents the menu from closing before the form submission is completed
						onSelect={(event) => {
							event.preventDefault()
							submit(formRef.current)
						}}
					>
						<Form action="/logout" method="POST" ref={formRef}>
							<Icon className="text-body-md" name="exit">
								<button type="submit">Cerrar Sesión</button>
							</Icon>
						</Form>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
