// src/app/profile/loading.tsx
export default function Loading() {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto"></div>
          <div className="max-w-md mx-auto space-y-4">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }