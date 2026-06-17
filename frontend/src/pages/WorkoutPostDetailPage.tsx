import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { fetchWorkoutPost, deleteWorkoutPost } from '../api/workoutPosts';
import { useAuth } from '../contexts/AuthContext';
import type { WorkoutPost } from '../types/workout';

const WorkoutPostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<WorkoutPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetchWorkoutPost(id)
      .then(setPost)
      .catch(() => setError('投稿の取得に失敗しました。'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteWorkoutPost(id);
      navigate('/');
    } catch {
      setError('削除に失敗しました。再度お試しください。');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = user != null && post != null && user.id === post.userId;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="mb-4">
          <Link to="/" className="text-blue-600 text-sm hover:underline">
            ← タイムラインへ
          </Link>
        </div>

        {loading && (
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        )}

        {error && !loading && (
          <div className="text-center py-16 text-red-500">{error}</div>
        )}

        {!loading && !error && post && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            {/* 投稿者情報 */}
            <div className="flex items-center gap-2 mb-4">
              <span className="font-semibold text-gray-800">{post.user.displayName}</span>
              <span className="text-gray-400 text-sm">@{post.user.username}</span>
              <span className="ml-auto text-gray-400 text-sm">{post.trainedOn}</span>
            </div>

            {/* タイトル */}
            <h1 className="text-xl font-bold text-gray-900 mb-4">{post.title}</h1>

            {/* 種目一覧 */}
            <div className="flex flex-col gap-4 mb-4">
              {post.workoutExercises
                .slice()
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((we) => (
                  <div key={we.id}>
                    <p className="font-semibold text-gray-700 mb-2">{we.exercise.name}</p>
                    <table className="w-full text-sm text-gray-600">
                      <thead>
                        <tr className="text-left text-gray-400 border-b">
                          <th className="pb-1 w-10">セット</th>
                          <th className="pb-1 w-20">重量 (kg)</th>
                          <th className="pb-1 w-12">回数</th>
                          <th className="pb-1">メモ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {we.sets
                          .slice()
                          .sort((a, b) => a.setNumber - b.setNumber)
                          .map((s) => (
                            <tr key={s.id} className="border-b last:border-0">
                              <td className="py-1">
                                {s.setNumber}
                                {s.isPr && (
                                  <span className="ml-1 text-xs text-yellow-500 font-bold">PR</span>
                                )}
                              </td>
                              <td className="py-1">{s.weightKg}</td>
                              <td className="py-1">{s.reps}</td>
                              <td className="py-1 text-gray-400">{s.memo ?? ''}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ))}
            </div>

            {/* 全体メモ */}
            {post.note && (
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.note}</p>
              </div>
            )}

            {/* 削除ボタン（自分の投稿のみ） */}
            {isOwner && !showDeleteConfirm && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition"
                >
                  削除する
                </button>
              </div>
            )}

            {/* 削除確認 */}
            {isOwner && showDeleteConfirm && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 mb-3">この投稿を削除しますか？この操作は元に戻せません。</p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                    className="text-sm text-gray-500 hover:text-gray-700 font-medium transition"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={() => void handleDelete()}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition"
                  >
                    {deleting ? '削除中...' : '削除する'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkoutPostDetailPage;
