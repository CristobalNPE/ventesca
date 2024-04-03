import {
	type LoaderFunctionArgs,
	redirect,
	type MetaFunction,
} from '@remix-run/node'
import { Link } from '@remix-run/react'
import { Button } from '#app/components/ui/button.tsx'
import { getUserId } from '#app/utils/auth.server.ts'

export const meta: MetaFunction = () => [{ title: 'Sistema de Ventas' }]

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await getUserId(request)
	if (userId) {
		throw redirect('/sell')
	}
	return null
}

export default function Index() {
	return (
		<main className=" flex h-full items-center justify-center ">
			<div className="text-center">
				<h1 className="mb-4 text-3xl font-bold text-foreground/70 sm:text-4xl">
					Sistema de Ventas
				</h1>
				<h1 className="text-4xl font-bold sm:text-6xl">
					Selim Amar y CIA LTDA.
				</h1>
				<Button asChild className="mt-20 text-xl sm:px-20 sm:py-8" size={'lg'}>
					<Link to={'login'}>Ingresar</Link>
				</Button>
			</div>
		</main>
	)
}
