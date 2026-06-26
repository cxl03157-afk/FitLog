import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type ToastType = 'success' | 'error';

type Toast = {
  type: ToastType;
  message: string;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A・B: 閉じるボタン / setTimeout コールバックから呼ぶ経路
  const hideToast = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setToast(null);
  }, []);

  // C: 新 Toast 表示
  const showToast = useCallback(
    (type: ToastType, message: string) => {
      if (message.trim() === '') return;
      hideToast();
      setToast({ type, message });
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setToast(null);
      }, 5000);
    },
    [hideToast],
  );

  // D: unmount 時 — timer だけ clear し setToast は呼ばない
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const contextValue = useMemo<ToastContextValue>(
    () => ({ showToast }),
    [showToast],
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 w-full max-w-xs sm:max-w-sm">
        {toast !== null && (
          <div
            role={toast.type === 'success' ? 'status' : 'alert'}
            className={`flex items-center justify-between gap-3 rounded-lg px-4 py-3 shadow-lg text-white ${
              toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
            }`}
          >
            <span className="text-sm">{toast.message}</span>
            <button
              type="button"
              onClick={hideToast}
              aria-label="通知を閉じる"
              className="shrink-0 text-white/80 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-white rounded"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
};
