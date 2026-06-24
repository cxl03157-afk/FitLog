import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { followUser, unfollowUser } from '../api/follows';

type CardUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isFollowing: boolean;
};

type Props = {
  user: CardUser;
};

const UserCard = ({ user }: Props) => {
  const { user: currentUser } = useAuth();
  const [isFollowing, setIsFollowing] = useState(user.isFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => setErrorMsg(null), 3000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  const isSelf = currentUser?.id === user.id;
  const initial = user.displayName?.[0]?.toUpperCase() ?? '?';

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    const prev = isFollowing;
    try {
      if (isFollowing) {
        await unfollowUser(user.id);
        setIsFollowing(false);
      } else {
        await followUser(user.id);
        setIsFollowing(true);
      }
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setIsFollowing(true);
      } else if (axios.isAxiosError(err) && err.response?.status === 404) {
        setIsFollowing(false);
      } else {
        setIsFollowing(prev);
        setErrorMsg(prev ? 'フォロー解除に失敗しました。' : 'フォローに失敗しました。');
      }
    } finally {
      setFollowLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
      <Link to={`/users/${user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.displayName}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            data-testid="user-card-avatar-image"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0"
            data-testid="user-card-avatar-initial"
          >
            {initial}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {user.displayName}
          </p>
          <p className="text-gray-400 text-xs truncate">@{user.username}</p>
        </div>
      </Link>

      <div className="flex-shrink-0 flex flex-col items-end gap-1">
        {!isSelf && (
          <button
            type="button"
            onClick={() => void handleFollow()}
            disabled={followLoading}
            className={`text-xs font-semibold py-1.5 px-3 rounded-full transition disabled:opacity-50 ${
              isFollowing
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            data-testid="follow-button"
          >
            {followLoading ? '...' : isFollowing ? 'フォロー中' : 'フォロー'}
          </button>
        )}
        {errorMsg && (
          <p className="text-xs text-red-500" data-testid="follow-error">
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
};

export default UserCard;
