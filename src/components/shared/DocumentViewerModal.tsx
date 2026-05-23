import { useState } from 'react';
import {
  X, ExternalLink, Download, FileText,
  ChevronLeft, ChevronRight, Image as ImageIcon,
  FileWarning
} from 'lucide-react';

export interface AttachmentItem {
  fileUrl: string;
  fileName: string;
}

interface Props {
  attachments: AttachmentItem[];
  initialIndex?: number;
  onClose: () => void;
}

const IMAGE_EXTS = new Set(['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'SVG']);
const PDF_EXTS   = new Set(['PDF']);

const getExt = (name: string) => name.split('.').pop()?.toUpperCase() ?? 'FILE';

const EXT_BADGE: Record<string, string> = {
  PDF:  'bg-red-100 text-red-600',
  DOC:  'bg-blue-100 text-blue-600',
  DOCX: 'bg-blue-100 text-blue-600',
  TXT:  'bg-gray-100 text-gray-500',
  JPG:  'bg-purple-100 text-purple-600',
  JPEG: 'bg-purple-100 text-purple-600',
  PNG:  'bg-purple-100 text-purple-600',
  WEBP: 'bg-purple-100 text-purple-600',
};

const DocumentViewerModal = ({ attachments, initialIndex = 0, onClose }: Props) => {
  const [activeIdx, setActiveIdx] = useState(initialIndex);

  if (attachments.length === 0) return null;
  const current = attachments[activeIdx];
  const ext = getExt(current.fileName);
  const isPdf = PDF_EXTS.has(ext);
  const isImage = IMAGE_EXTS.has(ext);
  const hasMultiple = attachments.length > 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-3"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden"
        style={{ height: 'min(90vh, 900px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0 bg-white z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ${EXT_BADGE[ext] ?? 'bg-gray-100 text-gray-500'}`}>
              {ext}
            </div>
            <span className="text-sm font-semibold text-law-navy truncate">{current.fileName}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-4">
            <a
              href={current.fileUrl}
              download={current.fileName}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-50 text-law-slate text-xs font-medium hover:bg-gray-100 transition-colors border border-gray-200"
              title="Download"
            >
              <Download className="w-3.5 h-3.5" /> Download
            </a>
            <a
              href={current.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-law-navy/5 text-law-navy text-xs font-medium hover:bg-law-navy/10 transition-colors border border-law-navy/10"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Tab
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-law-navy transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Multi-file tabs (if >1 attachment) ─────────────────────────── */}
        {hasMultiple && (
          <div className="flex items-center gap-2 px-6 py-2 border-b border-gray-100 bg-gray-50 overflow-x-auto shrink-0">
            {attachments.map((a, i) => {
              const aExt = getExt(a.fileName);
              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                    i === activeIdx
                      ? 'bg-law-navy text-white shadow-sm'
                      : 'bg-white text-law-slate border border-gray-200 hover:border-law-navy/30 hover:text-law-navy'
                  }`}
                >
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${i === activeIdx ? 'bg-white/20 text-white' : EXT_BADGE[aExt] ?? 'bg-gray-100 text-gray-500'}`}>
                    {aExt}
                  </span>
                  <span className="max-w-[120px] truncate">{a.fileName}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Viewer body ─────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden bg-gray-100 min-h-0">
          {isPdf && (
            <iframe
              key={current.fileUrl}
              src={current.fileUrl}
              title={current.fileName}
              className="w-full h-full border-0"
              style={{ minHeight: 0 }}
            />
          )}

          {isImage && (
            <div className="flex items-center justify-center h-full p-8 overflow-auto">
              <img
                src={current.fileUrl}
                alt={current.fileName}
                className="max-w-full max-h-full object-contain rounded-2xl shadow-xl"
              />
            </div>
          )}

          {!isPdf && !isImage && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gray-200 flex items-center justify-center">
                <FileWarning className="w-9 h-9 text-gray-400" />
              </div>
              <p className="text-base font-semibold text-law-navy">In-app preview unavailable</p>
              <p className="text-sm text-law-slate">
                <span className="font-bold">{ext}</span> files cannot be previewed in the browser.
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={current.fileUrl}
                  download={current.fileName}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-law-navy text-white text-sm font-semibold hover:bg-law-navy/90 transition-colors shadow-md"
                >
                  <Download className="w-4 h-4" /> Download File
                </a>
                <a
                  href={current.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-law-navy text-sm font-semibold hover:bg-gray-200 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" /> Open in Browser
                </a>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer navigation (if >1 file) ─────────────────────────────── */}
        {hasMultiple && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white shrink-0">
            <button
              disabled={activeIdx === 0}
              onClick={() => setActiveIdx(i => i - 1)}
              className="flex items-center gap-1.5 text-xs font-medium text-law-slate hover:text-law-navy disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs text-gray-400 font-medium">
              {activeIdx + 1} of {attachments.length}
            </span>
            <button
              disabled={activeIdx === attachments.length - 1}
              onClick={() => setActiveIdx(i => i + 1)}
              className="flex items-center gap-1.5 text-xs font-medium text-law-slate hover:text-law-navy disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewerModal;
