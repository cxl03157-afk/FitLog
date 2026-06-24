import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const NavBar = () => {
  const { logout } = useAuth();
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

  return (
    <nav className="bg-white shadow-sm px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold text-blue-600">
        FitLog
      </Link>
      <div className="flex items-center gap-3">
        <Link
          to="/workout-posts/new"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-1.5 px-4 rounded-lg transition text-sm"
        >
          投稿する
        </Link>
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
