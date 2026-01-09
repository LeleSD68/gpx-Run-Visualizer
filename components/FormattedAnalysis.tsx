
import React from 'react';

interface FormattedAnalysisProps {
  text: string;
  className?: string;
}

const FormattedAnalysis: React.FC<FormattedAnalysisProps> = ({ text, className = "" }) => {
  // Se il testo è vuoto (es. all'inizio dello streaming), mostriamo uno spazio per mantenere il layout
  if (!text) return <div className="min-h-[1.5em] animate-pulse bg-slate-700 rounded w-full"></div>;

  const paragraphs = text.split(/\n\n+/);

  return (
    <div className={`space-y-4 text-white font-medium ${className}`}>
      {paragraphs.map((paragraph, pIdx) => {
        const lines = paragraph.split('\n');
        const isList = lines.length > 1 && lines.every(line => line.trim().startsWith('- ') || line.trim().startsWith('* '));

        if (isList) {
          return (
            <ul key={pIdx} className="list-disc list-inside space-y-2 ml-2">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="text-[13px] sm:text-sm leading-relaxed text-slate-50">
                  {renderTextWithStyles(line.trim().substring(2))}
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={pIdx} className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap text-slate-50">
            {renderTextWithStyles(paragraph)}
          </p>
        );
      })}
    </div>
  );
};

function renderTextWithStyles(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-black text-cyan-400 drop-shadow-sm">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i} className="italic text-cyan-100 font-semibold">{part.slice(1, -1)}</em>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default FormattedAnalysis;
