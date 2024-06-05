import { NavLink, type NavLinkProps, useLocation } from '@remix-run/react'

type LinkWithParamsProps = NavLinkProps & { preserveSearch: boolean }

export function LinkWithParams({
	to,
	preserveSearch,
	children,
	...props
}: LinkWithParamsProps) {
	const location = useLocation()
	return (
		<NavLink {...props} to={`${to}${preserveSearch ? location.search : ''}`}>
			{children}
		</NavLink>
	)
}
