import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function DatabaseCompareLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar Skeleton */}
        <div className="w-64 bg-white border-r border-gray-200">
          <div className="p-4 space-y-4">
            <Skeleton className="h-8 w-32 rounded-xl" />
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1">
          {/* Header Skeleton */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <Skeleton className="h-4 w-48 rounded-lg" />
          </div>

          <div className="p-6">
            <div className="space-y-6">
              {/* Hero Section Skeleton */}
              <Card className="rounded-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <div className="space-y-2">
                          <Skeleton className="h-6 w-80 rounded-lg" />
                          <Skeleton className="h-4 w-96 rounded-lg" />
                        </div>
                      </div>
                      <div className="flex items-center space-x-6">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <Skeleton key={i} className="h-4 w-32 rounded-lg" />
                        ))}
                      </div>
                    </div>
                    <Skeleton className="h-20 w-32 rounded-2xl" />
                  </div>
                </CardContent>
              </Card>

              {/* Workflow Card Skeleton */}
              <Card className="rounded-2xl">
                <CardHeader className="bg-gray-50 border-b rounded-t-2xl">
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-5 w-5 rounded-lg" />
                    <Skeleton className="h-5 w-40 rounded-lg" />
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {/* Step Indicators Skeleton */}
                  <div className="flex items-center justify-between mb-8">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex flex-col items-center space-y-3">
                        <div className="flex items-center space-x-4">
                          <Skeleton className="h-12 w-12 rounded-2xl" />
                          {i < 2 && <Skeleton className="w-20 h-1 rounded-full" />}
                        </div>
                        <Skeleton className="h-4 w-24 rounded-lg" />
                      </div>
                    ))}
                  </div>

                  {/* Setup Form Skeleton */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-48 rounded-lg" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>

                    <Card className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-2xl">
                      <CardHeader className="rounded-t-2xl">
                        <Skeleton className="h-5 w-36 rounded-lg" />
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                              <Skeleton className="h-4 w-32 rounded-lg" />
                              <Skeleton className="h-11 w-full rounded-xl" />
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className="space-y-2">
                              <Skeleton className="h-4 w-24 rounded-lg" />
                              <Skeleton className="h-11 w-full rounded-xl" />
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Skeleton className="h-10 w-32 rounded-xl" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Options Skeleton */}
                    <Card className="rounded-2xl">
                      <CardHeader className="rounded-t-2xl">
                        <Skeleton className="h-5 w-36 rounded-lg" />
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="p-4 border border-gray-200 rounded-2xl">
                              <div className="flex items-start space-x-3">
                                <Skeleton className="h-4 w-4 rounded-md mt-1" />
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center space-x-2">
                                    <Skeleton className="h-4 w-4 rounded-lg" />
                                    <Skeleton className="h-4 w-20 rounded-lg" />
                                  </div>
                                  <Skeleton className="h-3 w-full rounded-lg" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
