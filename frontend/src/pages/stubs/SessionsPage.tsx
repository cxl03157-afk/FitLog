import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  getSessions,
  revokeSession,
  revokeAllOtherSessions,
  type SessionInfo,
} from '../../api/sessions';

const SessionsPage = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);
  const [refetchFailed, setRefetchFailed] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSessions()
      .then((data) => {
        if (cancelled) return;
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchError('セッション一覧の取得に失敗しました。');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastError) return;
    const t = setTimeout(() => setToastError(null), 5000);
    return () => clearTimeout(t);
  }, [toastError]);

  const handleCurrentDeviceLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login', {
        state: {
          logoutError:
            'サーバーとの通信に失敗しました。画面上はログアウトしましたが、セッションの失効に失敗した可能性があります。',
        },
      });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (revoking) return;
    setRevoking(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
    } catch {
      setToastError('セッションの削除に失敗しました。');
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    if (revokingAll) return;
    setRevokingAll(true);
    setRefetchFailed(false);
    try {
      await revokeAllOtherSessions();
      try {
        const data = await getSessions();
        setSessions(data);
      } catch {
        setRefetchFailed(true);
      }
    } catch {
      setToastError('全端末ログアウトに失敗しました。');
    } finally {
      setRevokingAll(false);
    }
  };

  const handleReloadSessions = () => {
    setRefetchFailed(false);
    setLoading(true);
    getSessions()
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => {
        setFetchError('セッション一覧の取得に失敗しました。');
        setLoading(false);
      });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-500">{fetchError}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold text-gray-800 mb-6">ログイン中のデバイス</h1>

      {toastError && (
        <div
          className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 flex items-center justify-between"
          data-testid="toast-error"
        >
          <span>{toastError}</span>
          <button
            onClick={() => setToastError(null)}
            className="ml-4 text-red-400 hover:text-red-600"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      )}

      {refetchFailed && (
        <div
          className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between"
          data-testid="refetch-error"
        >
          <span>ログアウトには成功しましたが、一覧の再取得に失敗しました。</span>
          <button
            onClick={handleReloadSessions}
            className="ml-4 text-yellow-700 underline hover:text-yellow-900 text-sm"
          >
            再読み込み
          </button>
        </div>
      )}

      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm">セッションはありません。</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((s) => (
            <li
              key={s.sessionId}
              className="bg-white border border-gray-200 rounded-xl px-4 py-4 flex items-start justify-between gap-4"
              data-testid={`session-item-${s.sessionId}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {s.isCurrent && (
                    <span
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium"
                      data-testid="current-badge"
                    >
                      現在の端末
                    </span>
                  )}
                  {s.deviceName && (
                    <span className="text-sm font-medium text-gray-800">{s.deviceName}</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{s.userAgent}</p>
                <p className="text-xs text-gray-500">{s.ipAddress}</p>
                <p className="text-xs text-gray-400 mt-1">
                  最終利用: {formatDate(s.lastUsedAt)}
                </p>
              </div>
              <button
                onClick={() =>
                  s.isCurrent
                    ? void handleCurrentDeviceLogout()
                    : void handleRevokeSession(s.sessionId)
                }
                disabled={revoking === s.sessionId}
                className="text-sm text-red-500 hover:text-red-700 disabled:text-gray-400 transition whitespace-nowrap"
                data-testid={`logout-button-${s.sessionId}`}
              >
                {revoking === s.sessionId ? '処理中...' : 'ログアウト'}
              </button>
            </li>
          ))}
        </ul>
      )}

      {sessions.some((s) => !s.isCurrent) && (
        <div className="mt-6">
          <button
            onClick={() => void handleRevokeAll()}
            disabled={revokingAll}
            className="text-sm text-gray-600 hover:text-gray-800 disabled:text-gray-400 border border-gray-300 rounded-lg px-4 py-2 transition"
            data-testid="revoke-all-button"
          >
            {revokingAll ? '処理中...' : 'この端末を除く全端末をログアウト'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
