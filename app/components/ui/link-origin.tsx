import { NavLinkProps, useLocation } from '@remix-run/react'
import { LinkWithParams } from './link-params'

type LinkWithOriginProps = NavLinkProps & { preserveSearch?: boolean }

export function LinkWithOrigin({
	to,
	preserveSearch = true,
	children,
	...props
}: LinkWithOriginProps) {
	const { pathname, search } = useLocation()

	return (
		<LinkWithParams
			{...props}
			to={`${to}${preserveSearch ? search : ''}`}
			state={{ origin: pathname }}
		>
			{children}
		</LinkWithParams>
	)
}
