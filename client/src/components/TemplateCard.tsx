import type { Template } from '../types';

interface Props {
  template: Template;
  onUse: (template: Template) => void;
}

const TemplateCard = ({ template, onUse }: Props) => {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden group hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
      <div className="h-40 bg-gradient-to-br from-blue-900/30 to-purple-900/30 flex items-center justify-center relative overflow-hidden">
        {template.thumbnail_url ? (
          <img src={template.thumbnail_url} alt={template.title} className="w-full h-full object-cover" />
        ) : (
          <i className="fas fa-globe text-white/20 text-5xl group-hover:text-blue-400/40 transition"></i>
        )}
        {template.is_premium && (
          <div className="absolute top-2 right-2 bg-yellow-500/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
            <i className="fas fa-crown mr-0.5"></i>PRO
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/50 text-gray-300 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          {template.framework}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm mb-1">{template.title}</h3>
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{template.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">
            <i className="fas fa-chart-simple mr-1"></i>{template.usage_count} uses
          </span>
          <button
            onClick={() => onUse(template)}
            className="text-blue-400 hover:text-blue-300 text-xs font-medium px-3 py-1 rounded-lg hover:bg-blue-500/10 transition"
          >
            <i className="fas fa-play mr-1"></i>Use Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateCard;
