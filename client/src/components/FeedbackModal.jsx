import { useState } from 'react';

const CATEGORIES = [
  { value: 'general', label: 'General Feedback' },
  { value: 'bug', label: 'Bug Report' },
  { value: 'feature', label: 'Feature Request' },
];

export default function FeedbackModal({ open, onClose }) {
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setCategory('general');
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-container/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md glass-panel rounded-xl border border-outline-variant/30 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-headline-md text-headline-md text-on-surface">Send Feedback</h3>
            <button
              onClick={onClose}
              className="text-on-surface-variant hover:text-on-surface p-1 rounded-md hover:bg-surface-variant/20 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <span className="material-symbols-outlined text-[48px] text-emerald-400">check_circle</span>
              <p className="font-body-md text-body-md text-on-surface">Thanks for your feedback!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-label-sm text-[12px] font-semibold text-outline mb-2 uppercase tracking-wide">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={5}
                  required
                  className="w-full bg-surface-container/20 border border-outline-variant/30 rounded-lg text-on-surface font-body-md p-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 hover:text-on-surface font-label-md text-label-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!message.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-electric text-on-primary hover:bg-indigo-electric/90 font-label-md text-label-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send Feedback
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
