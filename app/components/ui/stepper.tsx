import React, { useState } from 'react'
import { Button } from './button.tsx'
import { Icon } from './icon.tsx'

type StepProps = {
	children: React.ReactNode
	title: string
}
const Step = ({ children, title }: StepProps) => {
	return (
		<>
			<h1 className="my-4 text-center text-2xl">{title}</h1>
			{children}
		</>
	)
}
Step.displayName = 'Step'

function isStepComponent(child: React.ReactNode): child is React.ReactElement {
	return React.isValidElement(child) && child.type === Step
}

type StepperProps = {
	children: React.ReactNode
	title: string
	canProceed: { [key: number]: boolean }
}
const Stepper = ({ children, title, canProceed }: StepperProps) => {
	const stepChildren = React.Children.toArray(children).filter(isStepComponent)
	const totalSteps = stepChildren.length
	const [currentStep, setCurrentStep] = useState(1)

	const FIRST_STEP = 1

	const goToNextStep = () => {
		if (canProceed[currentStep]) {
			setCurrentStep(currentStep + 1)
		}
	}
	const goToPreviousStep = () => {
		setCurrentStep(currentStep - 1)
	}

	return (
		<div className="rounded-md bg-secondary  ">
			<div className="mb-4 flex gap-4 rounded-t-md bg-primary/50 p-4 text-2xl">
				<Icon name="route" />
				<h1>{title}</h1>
			</div>
			<div className="px-4 py-4">
				<div className="flex w-full flex-col items-center justify-center gap-4">
					<div className="flex  aspect-square w-[3rem] items-center justify-center rounded-sm bg-primary/60 p-2 text-3xl font-black text-foreground ">
						{currentStep}
					</div>
				</div>
				{/* Render only Step components */}
				{stepChildren[currentStep - 1]}
				{currentStep !== totalSteps ? (
					<div className="mt-8 flex justify-between">
						<Button
							variant={'ghost'}
							disabled={currentStep === FIRST_STEP}
							onClick={goToPreviousStep}
						>
							<Icon name="arrow-left" className="mr-2" /> Anterior
						</Button>

						<Button
							disabled={currentStep === totalSteps || !canProceed[currentStep]}
							onClick={goToNextStep}
						>
							Siguiente
							<Icon name="arrow-right" className="ml-2" />
						</Button>
					</div>
				) : null}
			</div>
		</div>
	)
}

Stepper.Step = Step

export { Stepper }
