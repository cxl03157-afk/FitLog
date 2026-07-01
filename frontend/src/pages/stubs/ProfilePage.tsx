import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import NavBar from '../../components/NavBar';
import PostCard from '../../components/PostCard';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  type UpdateProfileDto,
} from '../../api/users';
import { followUser, unfollowUser } from '../../api/follows';
import { fetchWorkoutPosts } from '../../api/workoutPosts';
import { useAuth } from '../../contexts/AuthContext';
import type { UserProfile } from '../../types/user';
import type { WorkoutPost } from '../../types/workout';

const ALLOWED_AVATAR_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_AVATAR_SIZE = 10 * 1024 * 1024;

const ProfilePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, updateCurrentUser } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [posts, setPosts] = useState<WorkoutPost[]>([]);

  const [followLoading, setFollowLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === id;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getProfile(id)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setEditDisplayName(p.displayName);
        setEditBio(p.bio ?? '');
      })
      .catch((err) => {
        if (cancelled) return;
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true);
        } else {
          setError('ユーザー情報の取得に失敗しました。');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      setProfile(null);
      setLoading(true);
      setNotFound(false);
      setError(null);
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    fetchWorkoutPosts({ userId: id, limit: 20 })
      .then((res) => {
        if (!cancelled) setPosts(res.data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      setPosts([]);
    };
  }, [id]);

  const handleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (profile.isFollowing) {
        await unfollowUser(profile.id);
        setProfile((prev) =>
          prev
            ? { ...prev, isFollowing: false, followerCount: Math.max(0, prev.followerCount - 1) }
            : prev,
        );
      } else {
        await followUser(profile.id);
        setProfile((prev) =>
          prev ? { ...prev, isFollowing: true, followerCount: prev.followerCount + 1 } : prev,
        );
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setProfile((prev) => (prev ? { ...prev, isFollowing: true } : prev));
      } else if (axios.isAxiosError(err) && err.response?.status === 404) {
        setProfile((prev) => (prev ? { ...prev, isFollowing: false } : prev));
      }
    } finally {
      setFollowLoading(false);
    }
  };

  const openEditModal = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName);
    setEditBio(profile.bio ?? '');
    setEditError(null);
    setAvatarError(null);
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (!profile || editSubmitting) return;
    if (!editDisplayName.trim()) {
      setEditError('表示名を入力してください。');
      return;
    }
    setEditError(null);
    setEditSubmitting(true);
    try {
      const dto: UpdateProfileDto = {
        displayName: editDisplayName.trim(),
        bio: editBio.trim() === '' ? null : editBio,
      };
      const updated = await updateProfile(dto);
      setProfile((prev) =>
        prev ? { ...prev, displayName: updated.displayName, bio: updated.bio } : prev,
      );
      updateCurrentUser({ displayName: updated.displayName });
      setShowEditModal(false);
    } catch {
      setEditError('プロフィールの更新に失敗しました。');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);

    if (!ALLOWED_AVATAR_MIME.includes(file.type)) {
      setAvatarError('JPEG/PNG/WebP のみ選択できます。');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setAvatarError('10MB 以内のファイルを選択してください。');
      return;
    }

    setAvatarUploading(true);
    try {
      const result = await uploadAvatar(file);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: result.avatarUrl } : prev));
      updateCurrentUser({ avatarUrl: result.avatarUrl });
    } catch {
      setAvatarError('アバターのアップロードに失敗しました。');
    } finally {
      setAvatarUploading(false);
    }
  };

  const initial = profile?.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />

      <div className="max-w-xl mx-auto px-4 py-6">
        {loading && (
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        )}

        {notFound && !loading && (
          <div className="text-center py-16 text-gray-500">
            <p>ユーザーが見つかりません。</p>
            <Link to="/" className="text-blue-600 hover:underline text-sm mt-2 block">
              タイムラインへ
            </Link>
          </div>
        )}

        {error && !loading && (
          <div className="text-center py-16 text-red-500">{error}</div>
        )}

        {!loading && !notFound && !error && profile && (
          <>
            <div className="bg-white rounded-2xl shadow-md p-6 mb-4">
              {/* ヘッダー: アバター + 名前 + bio */}
              <div className="flex items-start gap-4 mb-4">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-16 h-16 rounded-full object-cover flex-shrink-0"
                    data-testid="avatar-image"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                    data-testid="avatar-initial"
                  >
                    {initial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-lg leading-tight">
                    {profile.displayName}
                  </p>
                  <p className="text-gray-400 text-sm">@{profile.username}</p>
                  {profile.bio && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* 統計 */}
              <div className="flex gap-6 text-sm mb-4">
                <div className="text-center">
                  <p className="font-bold text-gray-900" data-testid="post-count">{profile.postCount}</p>
                  <p className="text-gray-500">投稿</p>
                </div>
                <Link
                  to={`/users/${profile.id}/followers`}
                  className="text-center hover:opacity-75 transition"
                >
                  <p className="font-bold text-gray-900" data-testid="follower-count">{profile.followerCount}</p>
                  <p className="text-gray-500">フォロワー</p>
                </Link>
                <Link
                  to={`/users/${profile.id}/following`}
                  className="text-center hover:opacity-75 transition"
                >
                  <p className="font-bold text-gray-900" data-testid="following-count">{profile.followingCount}</p>
                  <p className="text-gray-500">フォロー中</p>
                </Link>
              </div>

              {/* アクションボタン */}
              {isOwnProfile ? (
                <>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-2 rounded-lg transition text-sm"
                    data-testid="edit-profile-button"
                  >
                    プロフィールを編集
                  </button>
                  <div className="mt-2 flex gap-4 justify-center text-sm">
                    <Link
                      to="/exercises"
                      className="text-gray-500 hover:text-gray-700 underline"
                      data-testid="exercises-link"
                    >
                      独自種目管理
                    </Link>
                    <Link
                      to="/settings/sessions"
                      className="text-gray-500 hover:text-gray-700 underline"
                      data-testid="sessions-link"
                    >
                      デバイス管理
                    </Link>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleFollow()}
                  disabled={followLoading}
                  className={`w-full font-semibold py-2 rounded-lg transition text-sm disabled:opacity-50 ${
                    profile.isFollowing
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  data-testid="follow-button"
                >
                  {followLoading ? '...' : profile.isFollowing ? 'フォロー中' : 'フォロー'}
                </button>
              )}
            </div>

            {/* 投稿一覧 */}
            {posts.length > 0 && (
              <div className="flex flex-col gap-4">
                {posts.map((post) => (
                  <PostCard key={post.id} post={post} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 編集モーダル */}
      {showEditModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          data-testid="edit-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowEditModal(false);
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-bold text-gray-900 mb-4">プロフィールを編集</h2>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                表示名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
                maxLength={50}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="edit-display-name-input"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自己紹介（任意）
              </label>
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={160}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                data-testid="edit-bio-input"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{editBio.length}/160</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                アバター
              </label>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void handleAvatarSelect(e)}
                data-testid="avatar-file-input"
              />
              {avatarError && (
                <p className="text-sm text-red-600 mb-1" data-testid="avatar-error">
                  {avatarError}
                </p>
              )}
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={avatarUploading}
                className="border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 text-sm font-medium py-1.5 px-3 rounded-lg transition"
                data-testid="avatar-change-button"
              >
                {avatarUploading ? 'アップロード中...' : 'アバターを変更'}
              </button>
            </div>

            {editError && (
              <p className="text-sm text-red-600 mb-3" data-testid="edit-error">
                {editError}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                disabled={editSubmitting}
                className="flex-1 border border-gray-300 hover:border-gray-400 disabled:opacity-50 text-gray-700 font-semibold py-2 rounded-lg transition text-sm"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => void handleEditSubmit()}
                disabled={editSubmitting || avatarUploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-2 rounded-lg transition text-sm"
                data-testid="edit-submit-button"
              >
                {editSubmitting ? '更新中...' : '保存する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
