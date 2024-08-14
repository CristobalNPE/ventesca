import { Theme } from '#app/utils/theme.server.ts'
import { Button } from '../ui/button'
import { Icon } from '../ui/icon'
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet'
import { Brand } from './brand'
import { Menu } from './menu'
interface SheetMenuProps {
	themeUserPreference: Theme | null
}

export function SheetMenu({ themeUserPreference }: SheetMenuProps) {
	return (
		<Sheet>
			<SheetTrigger className="lg:hidden" asChild>
				<Button className="h-8" variant="outline" size="icon">
					<Icon name="menu-2" />
				</Button>
			</SheetTrigger>
			<SheetContent className="flex h-full flex-col px-3 sm:w-72" side="left">
				<Brand isOpen />
				<Menu isOpen themeUserPreference={themeUserPreference} />
			</SheetContent>
		</Sheet>
	)
}
