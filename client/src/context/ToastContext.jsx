import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`glass-strong rounded-xl border px-4 py-3 shadow-2xl flex items-center gap-3 min-w-[280px] max-w-sm animate-[slideIn_0.3s_ease-out]`}
              style={{
                borderColor: toast.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(79, 70, 229, 0.3)',
              }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ color: toast.type === 'error' ? '#ef4444' : '#6366f1' }}
              >
                {toast.type === 'error' ? 'error' : 'check_circle'}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface flex-1">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-on-surface-variant hover:text-on-surface transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
