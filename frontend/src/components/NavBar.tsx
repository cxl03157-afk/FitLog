import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      navigate('/login', {
        state: { logoutError: 'サーバーとの通信に失敗しました。セッションの失効に失敗した可能性があります。' },
      });
    }
  };

  const initial = user?.displayName?.[0]?.toUpperCase() ?? '?';

  return (
    <nav className="flex items-start justify-between bg-white px-4 py-3 shadow-sm sm:items-center">
      <Link to="/" className="shrink-0 text-xl font-bold text-blue-600">
        FitLog
      </Link>
      <div className="ml-3 flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-2">
        <Link
          to="/search"
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          検索
        </Link>
        <Link
          to="/stats"
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          統計
        </Link>
        <Link
          to="/goals"
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          目標
        </Link>
        <Link
          to="/personal-records"
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          PR記録
        </Link>
        <Link
          to="/workout-posts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg transition text-sm"
        >
          新規投稿
        </Link>
        {user && (
          <Link to={`/users/${user.id}`} aria-label="プロフィール">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm select-none">
                {initial}
              </div>
            )}
          </Link>
        )}
        <button
          onClick={() => void handleLogout()}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium transition"
        >
          ログアウト
        </button>
      </div>
    </nav>
  );
};

export default NavBar;
