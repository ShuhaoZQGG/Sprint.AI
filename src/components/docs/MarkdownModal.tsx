import React from 'react';
import { X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkBreaks from 'remark-breaks';
// import DOMPurify from 'dompurify';
// import { marked } from 'marked';

interface Section {
  title: string;
  content: string;
}

interface MarkdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  sections: Section[];
  activeSectionIdx: number;
  setActiveSectionIdx: (idx: number) => void;
  lastUpdated?: string | Date;
}

const MarkdownModal: React.FC<MarkdownModalProps> = ({
  isOpen,
  onClose,
  title,
  sections,
  activeSectionIdx,
  setActiveSectionIdx,
  lastUpdated,
}) => {
  if (!isOpen) return null;

  const activeSection = sections[activeSectionIdx];

  function replaceNewlinesOutsideCodeBlocks(markdown: string): string {
    // Split by code blocks (```...```)
    const parts = markdown.split(/(```[\s\S]*?```)/g);
    return parts
      .map((part, idx, arr) => {
        if (part.startsWith('```') || part.endsWith('```')) {
          console.log(part)
          return part; // code block or ends with code block delimiter, do not replace
        } else {
          console.log(part)
          return part.replace(/\n/g, "&#160; \n");
        }
      })
      .join('').replace(/```&#160;/g, "```\n&#160;")  
    }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black bg-opacity-80"
      style={{ backdropFilter: 'blur(2px)' }}
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-dark-800 rounded-lg shadow-2xl flex flex-col overflow-hidden border border-dark-600">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600 bg-dark-700">
          <div>
            <h2 className="text-white">{title}</h2>
            {lastUpdated && (
              <div className="text-dark-400 mt-1">
                Last updated: {new Date(lastUpdated).toLocaleString()}
              </div>
            )}
            <div className="text-dark-400 mt-1">
              Sections: {sections.length}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-dark-600 transition-colors text-dark-300 hover:text-white"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {/* Section Navigation */}
        {sections.length > 1 && (
          <div className="flex flex-wrap gap-2 px-6 py-2 border-b border-dark-700 bg-dark-800">
            {sections.map((section, idx) => (
              <button
                key={idx}
                className={`px-3 py-1 rounded transition-colors font-medium ${
                  activeSectionIdx === idx
                    ? 'bg-primary-700 text-white'
                    : 'bg-dark-700 hover:bg-primary-700 hover:text-white text-dark-200'
                }`}
                onClick={() => setActiveSectionIdx(idx)}
              >
                {section.title}
              </button>
            ))}
          </div>
        )}
        {/* Markdown Content */}
        <div className="flex-1 overflow-auto bg-dark-800" style={{ minHeight: 300 }}>
          {activeSection ? (
            <div
              className="prose prose-invert max-w-none markdown-reset"
              style={{ color: '#e5e7eb' }}
            >
              <ReactMarkdown
                remarkPlugins={[remarkBreaks]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  h1: ({node, ...props}) => <h1 style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  h2: ({node, ...props}) => <h2 style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  h3: ({node, ...props}) => <h3 style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  h4: ({node, ...props}) => <h4 style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  h5: ({node, ...props}) => <h5 style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  h6: ({node, ...props}) => <h6 style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  p: ({node, ...props}) => <p style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                  li: ({node, ...props}) => <li style={{fontSize: 'revert', fontWeight: 'revert'}} {...props} />,
                }}
              >
                {replaceNewlinesOutsideCodeBlocks(activeSection.content)}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-center text-dark-400">No content</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownModal; 