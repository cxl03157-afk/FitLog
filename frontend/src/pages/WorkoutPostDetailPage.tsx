import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import NavBar from '../components/NavBar';
import { fetchWorkoutPost, deleteWorkoutPost } from '../api/workoutPosts';
import { fetchComments, createComment, deleteComment } from '../api/comments';
import { useAuth } from '../contexts/AuthContext';
import { useLikeToggle } from '../hooks/useLikeToggle';
import type { WorkoutPost, WorkoutComment } from '../types/workout';

const WorkoutPostDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<WorkoutPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [comments, setComments] = useState<WorkoutComment[]>([]);
  const [commentContent, setCommentContent] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [confirmDeleteCommentId, setConfirmDeleteCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetchWorkoutPost(id)
      .then(setPost)
      .catch(() => setError('投稿の取得に失敗しました。'))
      .finally(() => setLoading(false));

    fetchComments(id)
      .then(setComments)
      .catch(() => {/* コメント取得失敗は投稿表示を妨げない */});
  }, [id]);

  const likeToggle = useLikeToggle(
    id ?? '',
    post?.isLiked ?? false,
    post?.likeCount ?? 0,
  );

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

  const handleCommentSubmit = async () => {
    if (!id || !commentContent.trim()) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const newComment = await createComment(id, commentContent.trim());
      setComments((prev) => [...prev, newComment]);
      setCommentContent('');
    } catch {
      setCommentError('コメントの投稿に失敗しました。');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    setDeletingCommentId(commentId);
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setConfirmDeleteCommentId(null);
    } catch {
      setCommentError('コメントの削除に失敗しました。');
    } finally {
      setDeletingCommentId(null);
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
          <>
            <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
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

              {/* 投稿画像 */}
              {post.postImages.length > 0 && (
                <div className={`grid gap-2 mb-4 ${post.postImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.postImages.map((img) => (
                    <img
                      key={img.id}
                      src={img.imageUrl}
                      alt=""
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* 全体メモ */}
              {post.note && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{post.note}</p>
                </div>
              )}

              {/* ナイスボタン */}
              <div className="flex items-center gap-4 py-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => void likeToggle.handleLikeToggle()}
                  disabled={likeToggle.isLikeLoading}
                  className={`flex items-center gap-1.5 text-sm font-medium transition disabled:opacity-50 ${
                    likeToggle.isLiked ? 'text-orange-500' : 'text-gray-400 hover:text-orange-400'
                  }`}
                >
                  <span
                    className={`transition-transform ${likeToggle.isLiked ? 'scale-125' : 'scale-100'}`}
                  >
                    👍
                  </span>
                  ナイス！ {likeToggle.likeCount}
                </button>
                <span className="text-sm text-gray-400">
                  💬 {comments.length}
                </span>
              </div>

              {/* 削除ボタン（自分の投稿のみ） */}
              {isOwner && !showDeleteConfirm && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium transition"
                  >
                    削除する
                  </button>
                </div>
              )}

              {/* 削除確認 */}
              {isOwner && showDeleteConfirm && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-700 mb-3">この投稿を削除しますか？この操作は元に戻せません。</p>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={deleting}
                      className="text-sm text-gray-500 hover:text-gray-700 font-medium transition"
                    >
                      キャンセル
                    </button>
                    <button
                      type="button"
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

            {/* コメントセクション */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <h2 className="text-base font-bold text-gray-800 mb-4">コメント</h2>

              {/* コメント一覧 */}
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 mb-4">コメントはまだありません。</p>
              ) : (
                <ul className="flex flex-col gap-3 mb-4">
                  {comments.map((c) => (
                    <li key={c.id} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-gray-800">
                            {c.user.displayName}
                          </span>
                          <span className="text-xs text-gray-400">@{c.user.username}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {new Date(c.createdAt).toLocaleDateString('ja-JP')}
                          </span>
                          {user?.id === c.userId && (
                            confirmDeleteCommentId === c.id ? (
                              <span className="flex items-center gap-1 text-xs">
                                <button
                                  type="button"
                                  onClick={() => void handleCommentDelete(c.id)}
                                  disabled={deletingCommentId === c.id}
                                  className="text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
                                >
                                  {deletingCommentId === c.id ? '削除中...' : '削除'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteCommentId(null)}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  キャンセル
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteCommentId(c.id)}
                                className="text-xs text-gray-400 hover:text-red-500 transition"
                                aria-label="コメントを削除"
                              >
                                🗑️
                              </button>
                            )
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                    </li>
                  ))}
                </ul>
              )}

              {commentError && (
                <p className="text-sm text-red-500 mb-2">{commentError}</p>
              )}

              {/* コメント入力フォーム */}
              <div className="flex flex-col gap-2">
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  maxLength={280}
                  placeholder="コメントを入力... (最大280文字)"
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{commentContent.length} / 280</span>
                  <button
                    type="button"
                    onClick={() => void handleCommentSubmit()}
                    disabled={commentSubmitting || !commentContent.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-semibold py-1.5 px-4 rounded-lg transition"
                  >
                    {commentSubmitting ? '投稿中...' : '送信'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WorkoutPostDetailPage;
