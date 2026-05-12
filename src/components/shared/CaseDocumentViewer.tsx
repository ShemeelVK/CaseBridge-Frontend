import { useState } from 'react';
import { Paperclip, ExternalLink, ZoomIn, FileText } from 'lucide-react';
import type { CaseDocument } from '../../types/case.types';
import DocumentViewerModal from './DocumentViewerModal';

interface Props {
  documents: CaseDocument[] | undefined;
}

const getExt = (fileName: string) =>
  fileName.split('.').pop()?.toUpperCase() ?? 'FILE';

const EXT_COLORS: Record<string, string> = {
  PDF:  'bg-red-50 text-red-600 border-red-100',
  DOC:  'bg-blue-50 text-blue-600 border-blue-100',
  DOCX: 'bg-blue-50 text-blue-600 border-blue-100',
  TXT:  'bg-gray-50 text-gray-500 border-gray-200',
  JPG:  'bg-purple-50 text-purple-600 border-purple-100',
  JPEG: 'bg-purple-50 text-purple-600 border-purple-100',
  PNG:  'bg-purple-50 text-purple-600 border-purple-100',
  WEBP: 'bg-purple-50 text-purple-600 border-purple-100',
};

// ─── Document pill ────────────────────────────────────────────────────────────
const DocPill = ({ doc, onPreview }: { doc: CaseDocument; onPreview: () => void }) => {
  const ext = getExt(doc.fileName);
  const extColor = EXT_COLORS[ext] ?? 'bg-gray-50 text-gray-500 border-gray-200';

  return (
    <div className="group inline-flex items-center gap-2 pl-2 pr-1 py-1.5 bg-gray-50 hover:bg-white border border-gray-200 hover:border-accent-gold/50 hover:shadow-sm rounded-xl transition-all duration-150">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${extColor}`}>
        {ext}
      </span>
      <span className="text-xs font-medium text-law-slate group-hover:text-law-navy transition-colors truncate max-w-[140px]">
        {doc.fileName}
      </span>

      <div className="flex items-center gap-0.5 ml-1">
        <button
          onClick={onPreview}
          title="Preview"
          className="p-1 rounded-lg text-gray-300 hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <a
          href={doc.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          className="p-1 rounded-lg text-gray-300 hover:text-law-navy hover:bg-law-navy/5 transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const CaseDocumentViewer = ({ documents }: Props) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (!documents || documents.length === 0) return null;

  // Convert types to match DocumentViewerModal's expected shape
  const viewerAttachments = documents.map(doc => ({
    fileUrl: doc.fileUrl,
    fileName: doc.fileName
  }));

  return (
    <>
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Paperclip className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Attachments ({documents.length})
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {documents.map((doc, idx) => (
            <DocPill
              key={doc.id}
              doc={doc}
              onPreview={() => setActiveIdx(idx)}
            />
          ))}
        </div>
      </div>

      {activeIdx !== null && (
        <DocumentViewerModal
          attachments={viewerAttachments}
          initialIndex={activeIdx}
          onClose={() => setActiveIdx(null)}
        />
      )}
    </>
  );
};

export default CaseDocumentViewer;
