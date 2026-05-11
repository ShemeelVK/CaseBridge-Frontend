import { useState } from 'react';
import { Paperclip, ExternalLink, X, ZoomIn, FileText, Image as ImageIcon } from 'lucide-react';
import type { CaseDocument } from '../../types/case.types';

interface Props {
  documents: CaseDocument[] | undefined;
}

const IMAGE_EXTS = new Set(['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP', 'SVG']);
const PDF_EXTS   = new Set(['PDF']);

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
};

// ─── Preview Modal ────────────────────────────────────────────────────────────
const PreviewModal = ({
  doc,
  onClose,
}: {
  doc: CaseDocument;
  onClose: () => void;
}) => {
  const ext = getExt(doc.fileName);
  const isImage = IMAGE_EXTS.has(ext);
  const isPdf   = PDF_EXTS.has(ext);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${EXT_COLORS[ext] ?? 'bg-gray-50 text-gray-500 border-gray-200'}`}>
              {ext}
            </span>
            <span className="text-sm font-semibold text-law-navy truncate">{doc.fileName}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={doc.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-law-navy/5 text-law-navy text-xs font-medium hover:bg-law-navy/10 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open in Tab
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-law-navy transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-auto bg-gray-50 min-h-0">
          {isPdf && (
            <iframe
              src={doc.fileUrl}
              className="w-full h-full min-h-[70vh] border-0"
              title={doc.fileName}
            />
          )}
          {isImage && (
            <div className="flex items-center justify-center p-6 h-full min-h-[60vh]">
              <img
                src={doc.fileUrl}
                alt={doc.fileName}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow"
              />
            </div>
          )}
          {!isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <FileText className="w-12 h-12 text-gray-300" />
              <p className="text-sm font-medium text-law-slate">In-app preview not available for this file type.</p>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-accent-gold hover:underline flex items-center gap-1.5"
              >
                <ExternalLink className="w-4 h-4" /> Download / Open
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Document pill ────────────────────────────────────────────────────────────
const DocPill = ({ doc, onPreview }: { doc: CaseDocument; onPreview: () => void }) => {
  const ext = getExt(doc.fileName);
  const extColor = EXT_COLORS[ext] ?? 'bg-gray-50 text-gray-500 border-gray-200';
  const canPreview = IMAGE_EXTS.has(ext) || PDF_EXTS.has(ext);

  return (
    <div className="group inline-flex items-center gap-2 pl-2 pr-1 py-1.5 bg-gray-50 hover:bg-white border border-gray-200 hover:border-accent-gold/50 hover:shadow-sm rounded-xl transition-all duration-150">
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${extColor}`}>
        {ext}
      </span>
      <span className="text-xs font-medium text-law-slate group-hover:text-law-navy transition-colors truncate max-w-[140px]">
        {doc.fileName}
      </span>

      <div className="flex items-center gap-0.5 ml-1">
        {canPreview && (
          <button
            onClick={onPreview}
            title="Preview"
            className="p-1 rounded-lg text-gray-300 hover:text-accent-gold hover:bg-accent-gold/10 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        )}
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
  const [previewDoc, setPreviewDoc] = useState<CaseDocument | null>(null);

  if (!documents || documents.length === 0) return null;

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
          {documents.map(doc => (
            <DocPill
              key={doc.id}
              doc={doc}
              onPreview={() => setPreviewDoc(doc)}
            />
          ))}
        </div>
      </div>

      {previewDoc && (
        <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />
      )}
    </>
  );
};

export default CaseDocumentViewer;
