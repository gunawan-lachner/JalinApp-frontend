import { Sidebar } from "@/components/layout/sidebar"

export default function QueriesLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Sidebar activeSection="/queries" />

        <div className="flex-1 max-w-full overflow-hidden">
          {/* Header with Breadcrumb Skeleton */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-2 text-sm text-gray-500 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-20"></div>
              <span>/</span>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>

          <div className="p-6 max-w-full">
            {/* Hero Section Skeleton */}
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6 animate-pulse">
              <div className="h-6 bg-blue-200 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-blue-200 rounded w-1/2"></div>
            </div>

            {/* Connection Selection and Mode Switch Skeleton */}
            <div className="bg-white shadow-sm border-0 rounded-3xl p-6 mb-6 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-10 bg-gray-200 rounded-2xl w-64"></div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-6 w-10 bg-gray-200 rounded-full"></div>
                  <div className="h-10 w-32 bg-gray-200 rounded-2xl"></div>
                </div>
              </div>
            </div>

            {/* Main Content Layout Skeletons */}
            <div className="flex gap-6">
              {/* Query List Sidebar Skeleton */}
              <div className="w-96 bg-white shadow-sm border-0 rounded-3xl p-6 animate-pulse">
                <div className="flex space-x-1 mb-4">
                  <div className="h-8 bg-gray-200 rounded-2xl w-24"></div>
                  <div className="h-8 bg-gray-200 rounded-2xl w-24"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded-2xl mb-4"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="p-3 rounded-2xl bg-gray-100 h-20">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3 mt-2"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content Area Skeleton */}
              <div className="flex-1 bg-white shadow-sm border-0 rounded-3xl p-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>

                <div className="space-y-6">
                  {/* Parameters Section Skeleton */}
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                    <div className="h-10 bg-gray-200 rounded-2xl mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>

                  {/* SQL Query Section Skeleton */}
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                    <div className="h-32 bg-gray-200 rounded-2xl"></div>
                  </div>

                  {/* Results Section Skeleton */}
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                    <div className="h-48 bg-gray-200 rounded-xl"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
