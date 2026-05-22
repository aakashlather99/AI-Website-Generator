interface Props {
  code: string;
  onChange: (code: string) => void;
  language?: string;
}

const CodeEditor = ({ code, onChange, language = 'html' }: Props) => {
  return (
    <div className="h-full flex flex-col bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2 bg-[#12122a] border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
          </div>
          <span className="text-gray-500 text-xs ml-2 font-mono">{language}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(code); }}
            className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition"
          >
            <i className="fas fa-copy mr-1"></i>Copy
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <textarea
          value={code}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full bg-transparent text-green-300 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
          spellCheck={false}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
};

export default CodeEditor;
