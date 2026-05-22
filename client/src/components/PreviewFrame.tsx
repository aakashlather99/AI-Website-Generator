import { useRef, useEffect, useState } from 'react';

interface Props {
  code: string;
  className?: string;
}

const PreviewFrame = ({ code, className = '' }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (code) {
      setLoading(true);
      // Small delay to let the iframe render
      const timer = setTimeout(() => setLoading(false), 500);
      return () => clearTimeout(timer);
    }
  }, [code]);

  if (!code) {
    return (
      <div className={`flex items-center justify-center bg-[#0f0f0f] ${className}`}>
        <div className="text-center">
          <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-4 animate-float">
            <i className="fas fa-globe text-blue-400 text-3xl"></i>
          </div>
          <p className="text-gray-500 text-sm">Preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0f0f0f] z-10">
          <div className="text-center">
            <i className="fas fa-spinner fa-spin text-blue-400 text-2xl mb-3 block"></i>
            <p className="text-gray-500 text-sm">Rendering preview...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        srcDoc={code}
        className="border-0 bg-white w-full h-full"
        title="Website Preview"
        sandbox="allow-scripts allow-forms allow-popups"
        style={{ isolation: 'isolate' }}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
};

export default PreviewFrame;
