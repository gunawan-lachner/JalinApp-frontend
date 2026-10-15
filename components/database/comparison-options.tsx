import { Database, AlertCircle, CheckCircle, Type, Space } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"

interface ComparisonOptionsProps {
  compareOptions: {
    compare_all: boolean
    only_in_source: boolean
    only_in_target: boolean
    different_records: boolean
    identical_records: boolean
    ignore_case: boolean
    ignore_trailing_spaces: boolean
  }
  setCompareOptions: (options: any) => void
}

export function ComparisonOptions({ compareOptions, setCompareOptions }: ComparisonOptionsProps) {
  const options = [
    {
      key: "only_in_source",
      label: "Only in Source",
      description: "Records existing only in source tables",
      icon: Database,
      color: "blue",
    },
    {
      key: "only_in_target",
      label: "Only in Target",
      description: "Records existing only in target tables",
      icon: Database,
      color: "orange",
    },
    {
      key: "different_records",
      label: "Different Records",
      description: "Records with different values",
      icon: AlertCircle,
      color: "red",
    },
    {
      key: "identical_records",
      label: "Identical Records",
      description: "Records that are exactly the same",
      icon: CheckCircle,
      color: "green",
    },
    {
      key: "ignore_case",
      label: "Ignore Case",
      description: "Case-insensitive comparison",
      icon: Type,
      color: "purple",
    },
    {
      key: "ignore_trailing_spaces",
      label: "Ignore Trailing Spaces",
      description: "Ignore spaces at end of values",
      icon: Space,
      color: "indigo",
    },
  ]

  return (
    <Card className="rounded-2xl">
      <CardHeader className="rounded-t-2xl">
        <CardTitle className="text-base">Comparison Options</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {options.map(({ key, label, description, icon: Icon, color }) => (
            <div
              key={key}
              className="flex items-start space-x-3 p-4 border border-gray-200 rounded-2xl hover:border-gray-300 transition-colors"
            >
              <Checkbox
                checked={compareOptions[key as keyof typeof compareOptions]}
                onCheckedChange={(checked) => setCompareOptions((prev: any) => ({ ...prev, [key]: !!checked }))}
                className="mt-1 rounded-md"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <Icon className={`h-4 w-4 text-${color}-600`} />
                  <div className="font-medium text-sm text-gray-800">{label}</div>
                </div>
                <div className="text-xs text-gray-500">{description}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
