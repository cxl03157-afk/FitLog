import { Link } from 'react-router-dom';
import type { WorkoutPost } from '../types/workout';
import { useLikeToggle } from '../hooks/useLikeToggle';

type Props = {
  post: WorkoutPost;
};

const PostCard = ({ post }: Props) => {
  const exerciseSummary = post.workoutExercises
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((we) => `${we.exercise.name} × ${we.sets.length}セット`)
    .join('、');

  const { isLiked, likeCount, isLikeLoading, handleLikeToggle } =
    useLikeToggle(post.id, post.isLiked, post.likeCount);

  const initial = post.user.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <article className="bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition">
      <div className="flex items-center justify-between mb-2">
        <Link to={`/users/${post.user.id}`} className="flex items-center gap-2">
          {post.user.avatarUrl ? (
            <img
              src={post.user.avatarUrl}
              alt={post.user.displayName}
              className="w-8 h-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initial}
            </div>
          )}
          <span className="font-semibold text-gray-800">{post.user.displayName}</span>
          <span className="text-gray-400 text-sm">@{post.user.username}</span>
        </Link>
        <span className="text-gray-400 text-sm">{post.trainedOn}</span>
      </div>

      <Link to={`/workout-posts/${post.id}`} className="block">
        <p className="font-bold text-gray-900 mb-1">{post.title}</p>
        {exerciseSummary && (
          <p className="text-sm text-gray-500 truncate">{exerciseSummary}</p>
        )}
        {post.postImages.length > 0 && (
          <div className={`mt-2 grid gap-1 ${post.postImages.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
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
      </Link>

      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
        <button
          type="button"
          onClick={() => void handleLikeToggle()}
          disabled={isLikeLoading}
          className={`flex items-center gap-1 transition disabled:opacity-50 ${
            isLiked ? 'text-orange-500' : 'hover:text-orange-400'
          }`}
        >
          👍 {likeCount}
        </button>
        <span className="flex items-center gap-1">💬 {post.commentCount}</span>
      </div>
    </article>
  );
};

export default PostCard;
