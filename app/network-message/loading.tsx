export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <div className="flex-1 max-w-full overflow-hidden">
          <div className="bg-white border-b border-gray-200 px-6 py-4" />
          <div className="p-6 max-w-full">
            <div className="bg-blue-50 rounded-3xl p-6 border border-blue-200 mb-6">
              <div className="animate-pulse">
                <div className="h-6 bg-blue-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-blue-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-96">
                <div className="p-6 bg-white rounded-3xl shadow-sm">
                  <div className="animate-pulse space-y-3">
                    <div className="h-8 bg-gray-200 rounded-2xl"></div>
                    <div className="h-8 bg-gray-200 rounded-2xl"></div>
                    <div className="h-16 bg-gray-200 rounded-2xl"></div>
                    <div className="h-16 bg-gray-200 rounded-2xl"></div>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <div className="p-6 bg-white rounded-3xl shadow-sm">
                  <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-32 bg-gray-200 rounded-2xl"></div>
                    <div className="h-64 bg-gray-200 rounded-2xl"></div>
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
