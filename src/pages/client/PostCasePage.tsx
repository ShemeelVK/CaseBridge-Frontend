import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Scale, FileText, Tag, IndianRupee, ChevronRight, 
  ArrowLeft, CheckCircle, UploadCloud, X, File as FileIcon, AlertCircle, Loader2 
} from 'lucide-react';
import { caseService } from '../../services/caseService';

const CATEGORIES = [
  'Civil Litigation',
  'Criminal Defence',
  'Corporate & Business',
  'Family & Matrimonial',
  'Property & Real Estate',
  'Intellectual Property',
  'Employment & Labour',
  'Tax & Finance',
  'Consumer Protection',
  'Other',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png'
];

type FormData = {
  title: string;
  description: string;
  category: string;
  budget: string;
};

type UploadStatus = 'queued' | 'uploading' | 'success' | 'error' | 'cancelled';

type UploadedFile = {
  localId: string;
  file: File;
  documentId?: number;
  status: UploadStatus;
  progress: number;
  error?: string;
};

const STEPS = ['Case Details', 'Category & Budget', 'Review'];

const PostCasePage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    budget: '',
  });

  const [uploads, setUploads] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return form.title.trim().length > 3 && form.description.trim().length > 10;
    if (step === 1) return form.category !== '' && Number(form.budget) > 0;
    return true;
  };

  const validateFile = (file: File): string | null => {
    if (file.size === 0) return 'File is empty';
    
    // Check extension fallback (since mime types can be unreliable, especially for docx on windows)
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const isExtensionValid = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeValid = ALLOWED_MIME_TYPES.includes(file.type) || file.type === ''; // Some browsers return empty mime type
    
    if (!isExtensionValid && !isMimeValid) {
      return `Unsupported file type: ${ext || 'unknown'}`;
    }

    if (uploads.some(u => u.file.name === file.name && u.file.size === file.size)) {
      return 'File already added';
    }

    return null; // Valid
  };

  const startUpload = async (localId: string, file: File) => {
    try {
      setUploads(prev => prev.map(u => u.localId === localId ? { ...u, status: 'uploading', progress: 0 } : u));
      
      const result = await caseService.uploadDocuments([file], (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
        setUploads(prev => prev.map(u => u.localId === localId ? { ...u, progress } : u));
      });

      if (result && result.length > 0) {
        setUploads(prev => prev.map(u => u.localId === localId ? { ...u, status: 'success', progress: 100, documentId: result[0].documentId } : u));
      } else {
        throw new Error('No document ID returned');
      }
    } catch (err: any) {
      setUploads(prev => prev.map(u => u.localId === localId ? { 
        ...u, 
        status: 'error', 
        error: err.response?.data?.message || err.message || 'Upload failed' 
      } : u));
    }
  };

  const handleFiles = useCallback((newFiles: File[]) => {
    const newUploads: UploadedFile[] = [];

    newFiles.forEach(file => {
      const error = validateFile(file);
      const localId = crypto.randomUUID();
      
      const uploadItem: UploadedFile = {
        localId,
        file,
        status: error ? 'error' : 'queued',
        progress: 0,
        error: error || undefined
      };
      
      newUploads.push(uploadItem);
    });

    if (newUploads.length > 0) {
      setUploads(prev => [...prev, ...newUploads]);
      
      // Start uploads for valid files
      newUploads.forEach(u => {
        if (u.status === 'queued') {
          startUpload(u.localId, u.file);
        }
      });
    }
  }, [uploads]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeFile = (localId: string) => {
    setUploads(prev => prev.filter(u => u.localId !== localId));
  };

  const retryUpload = (localId: string) => {
    const fileToRetry = uploads.find(u => u.localId === localId);
    if (fileToRetry) {
      startUpload(localId, fileToRetry.file);
    }
  };

  const handleSubmit = async () => {
    // Check if any uploads are still in progress
    if (uploads.some(u => u.status === 'uploading' || u.status === 'queued')) {
      toast.error('Please wait for all documents to finish uploading.');
      return;
    }

    // Check if any uploads failed
    if (uploads.some(u => u.status === 'error')) {
      toast.error('Some documents failed to upload. Please remove them or retry.');
      return;
    }

    try {
      setLoading(true);
      const documentIds = uploads
        .filter(u => u.status === 'success' && u.documentId !== undefined)
        .map(u => u.documentId!);

      await caseService.postCase({
        title: form.title,
        description: form.description,
        category: form.category,
        budget: Number(form.budget),
        documentIds: documentIds.length > 0 ? documentIds : undefined,
      });
      
      toast.success('Your case has been posted to the marketplace!');
      navigate('/client/cases');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to post case. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">

      {/* Back button */}
      <button
        onClick={() => navigate('/client/cases')}
        className="flex items-center gap-2 text-law-slate hover:text-law-navy transition-colors mb-8 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to My Cases
      </button>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-serif text-law-navy mb-2">Post a New Case</h1>
        <p className="text-law-slate">Describe your legal situation and get matched with the right lawyer.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                i < step ? 'bg-accent-gold border-accent-gold text-law-navy' :
                i === step ? 'border-law-navy bg-law-navy text-white' :
                'border-gray-200 bg-white text-gray-400'
              }`}>
                {i < step ? <CheckCircle className="w-5 h-5" /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-medium whitespace-nowrap ${i === step ? 'text-law-navy' : 'text-gray-400'}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 mb-4 transition-all duration-300 ${i < step ? 'bg-accent-gold' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">

        {/* Step 0 – Case Details */}
        {step === 0 && (
          <motion.div key="step0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-law-navy mb-2">
                <Scale className="inline w-4 h-4 mr-1.5 -mt-0.5 text-accent-gold" />
                Case Title *
              </label>
              <input
                id="case-title"
                type="text"
                value={form.title}
                onChange={e => update('title', e.target.value)}
                placeholder="e.g. Property dispute with landlord over lease terms"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-all text-law-navy"
              />
              <p className="text-xs text-gray-400 mt-1.5 ml-1">Be specific — a clear title helps lawyers understand your case quickly.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-law-navy mb-2">
                <FileText className="inline w-4 h-4 mr-1.5 -mt-0.5 text-accent-gold" />
                Case Description *
              </label>
              <textarea
                id="case-description"
                value={form.description}
                onChange={e => update('description', e.target.value)}
                placeholder="Describe the situation in detail — what happened, when, who was involved, and what outcome you are seeking..."
                rows={5}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-all text-law-navy resize-none"
              />
            </div>

            {/* Document Upload Section */}
            <div>
              <label className="block text-sm font-semibold text-law-navy mb-2">
                <UploadCloud className="inline w-4 h-4 mr-1.5 -mt-0.5 text-accent-gold" />
                Supporting Documents (Optional)
              </label>
              
              <div 
                className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-colors duration-200 ${
                  isDragging ? 'border-accent-gold bg-accent-gold/5' : 'border-gray-200 hover:border-accent-gold/50 hover:bg-gray-50'
                }`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <UploadCloud className="w-8 h-8 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-law-navy font-medium mb-1">Drag and drop your files here</p>
                <p className="text-xs text-gray-400 mb-4">Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG</p>
                
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleFiles(Array.from(e.target.files));
                      e.target.value = ''; // reset
                    }
                  }}
                  accept={ALLOWED_EXTENSIONS.join(',')}
                />
                
                <button 
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-law-navy hover:bg-gray-50 transition-colors shadow-sm"
                >
                  Browse Files
                </button>
              </div>

              {/* Upload List */}
              {uploads.length > 0 && (
                <div className="mt-4 space-y-2">
                  <AnimatePresence>
                    {uploads.map(upload => (
                      <motion.div 
                        key={upload.localId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          upload.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="w-8 h-8 rounded bg-white flex items-center justify-center shrink-0 border border-gray-100">
                          <FileIcon className="w-4 h-4 text-law-slate" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-law-navy truncate pr-4">{upload.file.name}</span>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{(upload.file.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          
                          {upload.status === 'uploading' && (
                            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="bg-accent-gold h-1.5 transition-all duration-300" 
                                style={{ width: `${upload.progress}%` }} 
                              />
                            </div>
                          )}
                          {upload.status === 'error' && (
                            <p className="text-xs text-red-500 font-medium">{upload.error}</p>
                          )}
                          {upload.status === 'success' && (
                            <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" /> Uploaded successfully
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pl-2">
                          {upload.status === 'uploading' && (
                            <Loader2 className="w-4 h-4 text-law-slate animate-spin" />
                          )}
                          {upload.status === 'error' && (
                            <button 
                              type="button" 
                              onClick={() => retryUpload(upload.localId)}
                              className="text-xs font-medium text-law-navy hover:underline"
                            >
                              Retry
                            </button>
                          )}
                          <button 
                            type="button" 
                            onClick={() => removeFile(upload.localId)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            disabled={upload.status === 'uploading'}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 1 – Category & Budget */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-law-navy mb-3">
                <Tag className="inline w-4 h-4 mr-1.5 -mt-0.5 text-accent-gold" />
                Legal Category *
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => update('category', cat)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium text-left transition-all duration-150 ${
                      form.category === cat
                        ? 'border-accent-gold bg-accent-gold/10 text-law-navy'
                        : 'border-gray-200 text-gray-600 hover:border-law-navy/30 hover:bg-gray-50'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-law-navy mb-2">
                <IndianRupee className="inline w-4 h-4 mr-1.5 -mt-0.5 text-accent-gold" />
                Your Budget (₹) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">₹</span>
                <input
                  id="case-budget"
                  type="number"
                  min={0}
                  value={form.budget}
                  onChange={e => update('budget', e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-all text-law-navy"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 ml-1">Enter your approximate budget. Lawyers will see this when browsing the marketplace.</p>
            </div>
          </motion.div>
        )}

        {/* Step 2 – Review */}
        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <p className="text-sm text-law-slate mb-4">Please review your case details before submitting.</p>

            {[
              { label: 'Title', value: form.title },
              { label: 'Category', value: form.category },
              { label: 'Budget', value: `₹${Number(form.budget).toLocaleString('en-IN')}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-law-navy w-24 shrink-0">{label}</span>
                <span className="text-sm text-law-slate">{value}</span>
              </div>
            ))}

            <div className="p-4 bg-gray-50 rounded-xl">
              <span className="text-sm font-semibold text-law-navy block mb-1.5">Description</span>
              <p className="text-sm text-law-slate whitespace-pre-wrap">{form.description}</p>
            </div>

            {uploads.filter(u => u.status === 'success').length > 0 && (
              <div className="p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-semibold text-law-navy block mb-2">Attached Documents</span>
                <div className="flex flex-wrap gap-2">
                  {uploads.filter(u => u.status === 'success').map(u => (
                    <div key={u.localId} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-law-slate">
                      <FileIcon className="w-3.5 h-3.5 text-accent-gold" />
                      <span className="truncate max-w-[150px]">{u.file.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start gap-2.5 p-4 bg-accent-gold/10 border border-accent-gold/30 rounded-xl">
              <CheckCircle className="w-5 h-5 text-accent-gold mt-0.5 shrink-0" />
              <p className="text-sm text-law-navy">
                Once submitted, your case will be visible to lawyers in the marketplace. You will be notified when a lawyer claims your case.
              </p>
            </div>
          </motion.div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/client/cases')}
            className="px-6 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-xl bg-law-navy text-white font-semibold flex items-center gap-2 hover:bg-law-navy/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2.5 rounded-xl bg-accent-gold text-law-navy font-bold flex items-center gap-2 hover:bg-[#F3C35C] transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? <div className="w-5 h-5 border-2 border-law-navy/30 border-t-law-navy rounded-full animate-spin" />
                : <><CheckCircle className="w-5 h-5" /> Post Case</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCasePage;
