import VentescaLogoDark from '#app/routes/_marketing+/logos/ventesca-dark.png'
import VentescaLogoLight from '#app/routes/_marketing+/logos/ventesca-light.png'
import { cn, getBusinessImgSrc } from '#app/utils/misc.tsx'
import { useOptionalUser } from '#app/utils/user.ts'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '../ui/tooltip'


interface BrandProps {
	isOpen: boolean
}
export function Brand({ isOpen }: BrandProps) {
	const user = useOptionalUser()

	const brandName = user?.business.name ?? ''
	const brandLogoId = user?.business.image ? user?.business.image.id : null
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<div className="flex items-center justify-center  gap-2">
						<BrandLogo isOpen={isOpen} brandLogoId={brandLogoId} />

						<h1
							className={cn(
								'max-w-[65%] whitespace-nowrap text-balance text-center   text-lg font-bold transition-[transform,opacity,display] duration-300 ease-in-out',
								isOpen === false
									? 'hidden -translate-x-96 opacity-0'
									: 'translate-x-0 opacity-100',
							)}
						>
							{brandName}
						</h1>
					</div>
				</TooltipTrigger>
				<TooltipContent>
					<p>
						Impulsado por <span className="font-bold">Ventesca</span>
					</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}
function BrandLogo({
	brandLogoId,
	isOpen,
}: {
	brandLogoId: string | null
	isOpen: boolean
}) {
	return (
		<div
			className={cn(
				'flex  h-[3rem] w-[3rem] flex-shrink-0 overflow-clip rounded-md opacity-90 drop-shadow-md ',
				!isOpen && 'h-[3.5rem] w-[3.5rem]',
			)}
		>
			<img
				className="object-cover2 hidden contrast-150 dark:flex"
				src={brandLogoId ? getBusinessImgSrc(brandLogoId) : VentescaLogoLight}
				alt="Ventesca Logo"
			/>
			<img
				className="object-cover2 flex contrast-150 dark:hidden"
				src={brandLogoId ? getBusinessImgSrc(brandLogoId) : VentescaLogoDark}
				alt="Ventesca Logo"
			/>
		</div>
	)
}
