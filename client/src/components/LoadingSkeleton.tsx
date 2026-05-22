/**
 * Loading Skeleton Components
 * Used to provide better UX while content is loading
 */

export const ProjectSkeleton = () => (
  <div className="bg-[#1a1a2e] rounded-lg p-4 animate-pulse">
    <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
    <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
  </div>
);

export const CodeEditorSkeleton = () => (
  <div className="bg-[#1a1a2e] rounded-lg animate-pulse">
    <div className="h-8 bg-gray-700 rounded-t-lg mb-2"></div>
    <div className="p-4 space-y-2">
      <div className="h-4 bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-700 rounded w-full"></div>
      <div className="h-4 bg-gray-700 rounded w-5/6"></div>
    </div>
  </div>
);

export const PreviewFrameSkeleton = () => (
  <div className="bg-[#0a0a0f] rounded-lg animate-pulse overflow-hidden">
    <div className="w-full h-96 bg-gray-700 flex items-center justify-center">
      <div className="text-gray-500">Loading preview...</div>
    </div>
  </div>
);

export const ProjectListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ProjectSkeleton key={i} />
    ))}
  </div>
);

export const LoadingOverlay = ({ isLoading = true }: { isLoading?: boolean }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#1a1a2e] rounded-lg p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-300">Processing your request...</p>
      </div>
    </div>
  );
};

export const ProgressBar = ({ progress = 0 }: { progress?: number }) => {
  const progressPercent = Math.min(progress, 100)
  return (
    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        className="bg-blue-500 h-full transition-all duration-300 ease-out"
        style={{ width: `${progressPercent}%` }}
      ></div>
    </div>
  )
}

export const JobProgressCard = ({ progress = 0, status = 'Processing' }: { progress?: number; status?: string }) => (
  <div className="bg-[#1a1a2e] rounded-lg p-6 border border-blue-500/30">
    <div className="flex items-center justify-between mb-4">
      <p className="text-gray-300 font-medium">{status}</p>
      <span className="text-sm text-gray-500">{progress}%</span>
    </div>
    <ProgressBar progress={progress} />
    <p className="text-xs text-gray-500 mt-2">
      {progress < 30 && 'Preparing generation...'}
      {progress >= 30 && progress < 70 && 'Generating content...'}
      {progress >= 70 && progress < 100 && 'Finalizing...'}
      {progress === 100 && 'Complete!'}
    </p>
  </div>
);
