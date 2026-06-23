import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../../components/NavBar';
import UserCard from '../../components/UserCard';
import { getFollowing } from '../../api/follows';
import type { FollowUser } from '../../types/user';

const FollowingPage = () => {
  const { id } = useParams<{ id: string }>();
  const [users, setUsers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getFollowing(id)
      .then((data) => {
        if (cancelled) return;
        setUsers(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('フォロー中ユーザーの取得に失敗しました。');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      setUsers([]);
      setLoading(true);
      setNotFound(false);
      setError(null);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="flex border-b border-gray-200 mb-6">
          <Link
            to={`/users/${id}/followers`}
            className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition"
            data-testid="followers-tab-link"
          >
            フォロワー
          </Link>
          <span className="px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600">
            フォロー中
          </span>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        )}

        {notFound && !loading && (
          <div className="text-center py-16 text-gray-500">
            ユーザーが見つかりません。
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16 text-red-500">{error}</div>
        )}

        {!loading && !notFound && !error && users.length === 0 && (
          <div className="text-center py-16 text-gray-400">フォロー中のユーザーはいません。</div>
        )}

        {!loading && !notFound && !error && users.length > 0 && (
          <div className="flex flex-col gap-3">
            {users.map((u) => (
              <UserCard key={u.id} user={u} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowingPage;
