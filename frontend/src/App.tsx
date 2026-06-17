import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import GuestRoute from './components/GuestRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TimelinePage from './pages/TimelinePage';
import WorkoutPostNewPage from './pages/WorkoutPostNewPage';
import WorkoutPostDetailPage from './pages/WorkoutPostDetailPage';
import ProfilePage from './pages/stubs/ProfilePage';
import FollowersPage from './pages/stubs/FollowersPage';
import FollowingPage from './pages/stubs/FollowingPage';
import SearchPage from './pages/stubs/SearchPage';
import StatsPage from './pages/stubs/StatsPage';
import GoalsPage from './pages/stubs/GoalsPage';
import SessionsPage from './pages/stubs/SessionsPage';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        {/* ゲスト専用 */}
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* 認証必須 */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<TimelinePage />} />
          <Route path="/workout-posts/new" element={<WorkoutPostNewPage />} />
          <Route path="/workout-posts/:id" element={<WorkoutPostDetailPage />} />
          <Route path="/users/:id" element={<ProfilePage />} />
          <Route path="/users/:id/followers" element={<FollowersPage />} />
          <Route path="/users/:id/following" element={<FollowingPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/settings/sessions" element={<SessionsPage />} />
        </Route>

        {/* フォールバック */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
