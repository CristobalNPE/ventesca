import { type IconName } from '#app/components/ui/icon.tsx'
import { useIsUserAdmin } from './user'

type Submenu = {
	href: string
	label: string
	active: boolean
}

type Menu = {
	href: string
	label: string
	active: boolean
	icon: IconName
	submenus: Submenu[]
}

type Group = {
	groupLabel: string
	menus: Menu[]
}

export function getMenuList(pathname: string): Group[] {
	const isAdmin = useIsUserAdmin()

	const menuList: Group[] = [
		{
			groupLabel: '',
			menus: [
				{
					href: '/pos',
					label: 'Punto de Venta',
					active: pathname.includes('/pos'),
					icon: 'cash-register',
					submenus: [],
				},
			],
		},
		{
			groupLabel: 'Logística',
			menus: [
				{
					href: '/orders',
					label: 'Transacciones',
					active: pathname.includes('/orders'),
					icon: 'file-bar-chart',
					submenus: [],
				},
				{
					href: '/inventory',
					label: 'Inventario',
					active: pathname.includes('/inventory'),
					icon: 'package',
					submenus: [],
				},
				{
					href: '/categories',
					label: 'Categorías',
					active: pathname.includes('/categories'),
					icon: 'shapes',
					submenus: [],
				},
				{
					href: '/suppliers',
					label: 'Proveedores',
					active: pathname.includes('/suppliers'),
					icon: 'users',
					submenus: [],
				},
				{
					href: '/discounts',
					label: 'Descuentos',
					active: pathname.includes('/discounts'),
					icon: 'tag',
					submenus: [],
				},
			],
		},
	]

	const adminOnlyLinks: Group = {
		groupLabel: 'Administración',
		menus: [
			{
				href: '/business',
				label: 'Empresa',
				active: pathname.includes('/business'),
				icon: 'briefcase',
				submenus: [],
			},
			{
				href: '/sellers',
				label: 'Vendedores',
				active: pathname.includes('/sellers'),
				icon: 'user-dollar',
				submenus: [],
			},
			{
				href: '/analytics',
				label: 'Analítica',
				active: pathname.includes('/analytics'),
				icon: 'graph',
				submenus: [],
			},
		],
	}

	const secondaryLinks: Group = {
		groupLabel: '',
		menus: [
			{
				href: '/settings',
				label: 'Ajustes',
				active: pathname.includes('/settings'),
				icon: 'settings',
				submenus: [],
			},
		],
	}

	if (isAdmin) {
		menuList.push(adminOnlyLinks)
		menuList.push(secondaryLinks)
	} else {
		menuList.push(secondaryLinks)
	}

	return menuList
}
