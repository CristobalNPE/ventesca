import { ReactNode } from 'react'

export function RouteHeader({
	title,
	children,
}: {
	title: string
	children?: ReactNode
}) {
	return (
		<div className="flex flex-col items-center justify-between gap-2 border-b-2 border-secondary pb-3 text-center xl:flex-row xl:text-left ">
			<h1 className="text-xl font-semibold">{title}</h1>
			{children && <div className=''>{children}</div>}
		</div>
	)
}
