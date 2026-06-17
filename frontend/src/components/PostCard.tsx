import { Link } from 'react-router-dom';
import type { WorkoutPost } from '../types/workout';

type Props = {
  post: WorkoutPost;
};

const PostCard = ({ post }: Props) => {
  const exerciseSummary = post.workoutExercises
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((we) => `${we.exercise.name} × ${we.sets.length}セット`)
    .join('、');

  return (
    <Link
      to={`/workout-posts/${post.id}`}
      className="block bg-white rounded-2xl shadow-md p-4 hover:shadow-lg transition"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-gray-800">{post.user.displayName}</span>
        <span className="text-gray-400 text-sm">@{post.user.username}</span>
        <span className="ml-auto text-gray-400 text-sm">{post.trainedOn}</span>
      </div>
      <p className="font-bold text-gray-900 mb-1">{post.title}</p>
      {exerciseSummary && (
        <p className="text-sm text-gray-500 truncate">{exerciseSummary}</p>
      )}
    </Link>
  );
};

export default PostCard;
