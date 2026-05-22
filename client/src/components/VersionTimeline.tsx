import type { Version } from '../types';

interface Props {
  versions: Version[];
  currentVersion: number;
  onRollback: (versionId: number) => void;
}

const VersionTimeline = ({ versions, currentVersion, onRollback }: Props) => {
  if (!versions || versions.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8 text-sm">
        <i className="fas fa-clock-rotate-left text-2xl mb-2 block opacity-50"></i>
        No version history yet
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
      {versions.map((v) => (
        <div
          key={v.id}
          className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
            v.version_number === currentVersion
              ? 'bg-blue-500/10 border-blue-500/30'
              : 'bg-white/5 border-white/10 hover:border-white/20'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
            v.version_number === currentVersion ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-400'
          }`}>
            v{v.version_number}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">
              {v.change_description || `Version ${v.version_number}`}
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              {new Date(v.created_at).toLocaleString()}
            </p>
          </div>
          {v.version_number !== currentVersion && (
            <button
              onClick={() => onRollback(v.id)}
              className="text-blue-400 hover:text-blue-300 text-xs px-2 py-1 rounded-lg hover:bg-blue-500/10 transition shrink-0"
              title="Rollback to this version"
            >
              <i className="fas fa-rotate-left mr-1"></i>Restore
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default VersionTimeline;
