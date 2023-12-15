import { Button } from '#app/components/ui/button.tsx'
import { type MetaFunction } from '@remix-run/node'
import { Link } from '@remix-run/react'

export const meta: MetaFunction = () => [{ title: 'Epic Notes' }]

export default function Index() {
	return (
		<main className=" flex min-h-screen items-center justify-center ">
			<div className="text-center">
				<h1 className="mb-4 text-3xl font-bold text-foreground/70 sm:text-4xl">
					Sistema de Ventas
				</h1>
				<h1 className="text-4xl font-bold sm:text-6xl">
					Selim Amar y CIA LTDA.
				</h1>
				<Button asChild className="mt-20 text-xl sm:px-20 sm:py-8" size={'lg'}>
					<Link to={"login"}>Ingresar</Link>
				</Button>
			</div>
		</main>
	)
}
