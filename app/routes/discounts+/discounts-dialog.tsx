import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '#app/components/ui/alert-dialog.tsx'
import { Button } from '#app/components/ui/button.tsx'
import { DiscountScope } from './_types/discount-reach.ts'

type CommonProps = {}
type SingleItemProps = CommonProps & {
	scope: DiscountScope.SINGLE_ITEM
	itemId: string
}
type CategoryProps = CommonProps & {
	scope: DiscountScope.CATEGORY
	categoryId: string
}
type CreateDiscountDialogProps = SingleItemProps | CategoryProps

export function CreateDiscountDialog(props: CreateDiscountDialogProps) {
	const { scope, ...rest } = props;

  // Type guard to narrow down the type based on the value of scope
  if (scope === DiscountScope.SINGLE_ITEM) {
    const { itemId } = rest as SingleItemProps;
    // Handle props specific to SingleItemProps
    console.log(itemId);
  } else if (scope === DiscountScope.CATEGORY) {
    const { categoryId } = rest as CategoryProps;
    // Handle props specific to CategoryProps
    console.log(categoryId);
  }

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button variant={'outline'}>Crear Promoción</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
					<AlertDialogDescription>
						This action cannot be undone. This will permanently delete your
						account and remove your data from our servers.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction>Continue</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
