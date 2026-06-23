import { useEffect, useState } from 'react';
import NavBar from '../components/NavBar';
import PostCard from '../components/PostCard';
import { fetchWorkoutPosts } from '../api/workoutPosts';
import type { WorkoutPost } from '../types/workout';
import { Link, useLocation } from 'react-router-dom';

type Tab = 'all' | 'following';

const LIMIT = 20;

const TimelinePage = () => {
  const location = useLocation();
  const [posts, setPosts] = useState<WorkoutPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [toast, setToast] = useState<string | null>(
    (location.state as { toast?: string } | null)?.toast ?? null,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    fetchWorkoutPosts({ page: 1, limit: LIMIT, feed: 'all' })
      .then((res) => {
        if (cancelled) return;
        setPosts(res.data);
        setTotal(res.total);
      })
      .catch(() => {
        if (cancelled) return;
        setError('投稿の取得に失敗しました。再度お試しください。');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    try {
      const res = await fetchWorkoutPosts({ page: nextPage, limit: LIMIT, feed: 'all' });
      setPosts((prev) => [...prev, ...res.data]);
      setTotal(res.total);
      setPage(nextPage);
    } catch {
      setError('追加読み込みに失敗しました。');
    } finally {
      setLoadingMore(false);
    }
  };

  const hasMore = posts.length < total;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-xl mx-auto px-4 py-6">
        {toast && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800 flex items-center justify-between">
            <span>{toast}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="ml-2 text-yellow-600 hover:text-yellow-800 leading-none"
              aria-label="トーストを閉じる"
            >
              ✕
            </button>
          </div>
        )}

        {/* タブ */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            全体
          </button>
          <button
            onClick={() => setActiveTab('following')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
              activeTab === 'following'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            フォロー中
          </button>
        </div>

        {/* フォロー中タブ: Phase 10 プレースホルダー */}
        {activeTab === 'following' && (
          <div className="text-center py-16 text-gray-400">
            <p>フォロー中タイムラインは Phase 10 で実装予定です。</p>
          </div>
        )}

        {/* 全体タブ */}
        {activeTab === 'all' && (
          <>
            {loading && (
              <div className="text-center py-16 text-gray-400">読み込み中...</div>
            )}

            {error && !loading && (
              <div className="text-center py-16 text-red-500">{error}</div>
            )}

            {!loading && !error && posts.length === 0 && (
              <div className="text-center py-16 text-gray-400">
                まだ投稿がありません。最初の投稿をしてみましょう！
              </div>
            )}

            {!loading && posts.length > 0 && (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}

            {hasMore && !loading && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                  className="bg-white border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-medium py-2 px-6 rounded-lg transition"
                >
                  {loadingMore ? '読み込み中...' : 'もっと見る'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* FAB */}
      <Link
        to="/workout-posts/new"
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition"
        aria-label="投稿する"
      >
        ＋
      </Link>
    </div>
  );
};

export default TimelinePage;
