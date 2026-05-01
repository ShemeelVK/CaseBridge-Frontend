import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Scale, FileText, Tag, IndianRupee, ChevronRight, ArrowLeft, CheckCircle } from 'lucide-react';
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

type FormData = {
  title: string;
  description: string;
  category: string;
  budget: string;
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

  const update = (field: keyof FormData, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return form.title.trim().length > 3 && form.description.trim().length > 10;
    if (step === 1) return form.category !== '' && Number(form.budget) > 0;
    return true;
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      await caseService.postCase({
        title: form.title,
        description: form.description,
        category: form.category,
        budget: Number(form.budget),
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
                rows={7}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent-gold focus:border-transparent outline-none transition-all text-law-navy resize-none"
              />
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
