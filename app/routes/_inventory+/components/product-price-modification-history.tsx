import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#app/components/ui/card.tsx'
import { Icon } from '#app/components/ui/icon.tsx'
import { cn, formatCurrency } from '#app/utils/misc.tsx'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

import { Badge } from '#app/components/ui/badge.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#app/components/ui/table.tsx'
import { ProcessedPriceHistory } from '#app/utils/product-calculations.ts'

export function PriceModificationHistoryCard({
	priceHistory,
}: {
	priceHistory: ProcessedPriceHistory[]
}) {
	return (
		<Card className="">
			<CardHeader>
				<CardTitle>Historial de precios</CardTitle>
				<CardDescription>
					Detalle del cambio de precio de venta para este producto en el tiempo.
				</CardDescription>
			</CardHeader>
			<CardContent className="[&:not(:hover)]:no-scrollbar relative h-[30rem]  overflow-y-auto ">
				<Table>
					<TableHeader className="sticky top-0 z-20 bg-card">
						<TableRow>
							<TableHead>Fecha</TableHead>
							<TableHead className="hidden sm:table-cell">Anterior</TableHead>
							<TableHead className="hidden sm:table-cell">Nuevo</TableHead>
							<TableHead>Cambio</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{priceHistory.map(priceModification => (
							<TableRow key={priceModification.id}>
								<TableCell>
									{format(priceModification.createdAt, "dd'-'MM'-'yyyy", {
										locale: es,
									})}
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									{formatCurrency(priceModification.oldPrice)}
								</TableCell>
								<TableCell className="hidden sm:table-cell">
									{formatCurrency(priceModification.newPrice)}
								</TableCell>
								<TableCell>
									<Badge
										variant={'outline'}
										className={cn(
											'',
											priceModification.newPrice > priceModification.oldPrice &&
												'border-green-600 bg-green-600/30 text-foreground',
											priceModification.newPrice < priceModification.oldPrice &&
												'border-destructive bg-destructive/30 text-foreground',
										)}
									>
										<Icon
											className="mr-1"
											name={
												priceModification.newPrice > priceModification.oldPrice
													? 'arrow-up'
													: priceModification.newPrice <
														  priceModification.oldPrice
														? 'arrow-down'
														: 'arrow-right'
											}
										/>{' '}
										{priceModification.percentChange}%
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
