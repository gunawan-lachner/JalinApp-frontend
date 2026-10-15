import React from "react"
import { Database, Play, BarChart3 } from "lucide-react"

interface StepIndicatorProps {
  currentStep: number
}

export function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { step: 1, title: "Setup Comparisons", icon: Database },
    { step: 2, title: "Run Analysis", icon: Play },
    { step: 3, title: "View Results", icon: BarChart3 },
  ]

  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map(({ step, title, icon: Icon }, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center space-y-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${
                currentStep >= step
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-400 border-gray-300"
              }`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <span
              className={`text-sm font-medium text-center ${currentStep >= step ? "text-blue-600" : "text-gray-500"}`}
            >
              {title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-20 h-1 rounded-full mx-4 ${currentStep > step ? "bg-blue-600" : "bg-gray-300"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
