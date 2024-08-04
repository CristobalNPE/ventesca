import { useEffect, useState } from 'react'
import { useHydrated } from './useHydrated'

type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
const breakpoints: Record<Breakpoint, number> = {
	xs: 0,
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280,
	'2xl': 1536,
}

export function useResponsive() {
	const [breakpoint, setBreakpoint] = useState<Breakpoint>('xs')
	const isHydrated = useHydrated()

	useEffect(() => {
		if (typeof window !== 'undefined') {
			const handleResize = () => {
				const width = window.innerWidth
				const newBreakpoint =
					(Object.keys(breakpoints) as Breakpoint[])
						.reverse()
						.find(key => width >= breakpoints[key]) || 'xs'
				setBreakpoint(newBreakpoint)
			}
			window.addEventListener('resize', handleResize)
			handleResize()
			return () => window.removeEventListener('resize', handleResize)
		}
	}, [])

	return {
		breakpoint,
		isClient: isHydrated,
		isAtLeast: (bp: Breakpoint) => breakpoints[breakpoint] >= breakpoints[bp],
		isAtMost: (bp: Breakpoint) => breakpoints[breakpoint] <= breakpoints[bp],
	}
}
