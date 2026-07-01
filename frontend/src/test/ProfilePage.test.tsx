import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProfilePage from '../pages/stubs/ProfilePage';
import * as AuthContextModule from '../contexts/AuthContext';
import * as usersApi from '../api/users';
import * as followsApi from '../api/follows';
import * as workoutPostsApi from '../api/workoutPosts';
import type { UserProfile } from '../types/user';
import type { WorkoutPost } from '../types/workout';

vi.mock('../contexts/AuthContext', async (importOriginal) => {
  const mod = await importOriginal<typeof AuthContextModule>();
  return { ...mod, useAuth: vi.fn() };
});

vi.mock('../api/users', () => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock('../api/follows', () => ({
  followUser: vi.fn(),
  unfollowUser: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
}));

vi.mock('../api/workoutPosts', () => ({
  fetchWorkoutPosts: vi.fn(),
  createWorkoutPost: vi.fn(),
  uploadPostImages: vi.fn(),
  fetchWorkoutPost: vi.fn(),
  deleteWorkoutPost: vi.fn(),
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    isAxiosError: (e: unknown) =>
      (e as { isAxiosError?: boolean }).isAxiosError === true,
  };
});

// PostCard をスタブ化して likes API などの依存を排除
vi.mock('../components/PostCard', () => ({
  default: ({ post }: { post: WorkoutPost }) => (
    <article data-testid="post-card">{post.title}</article>
  ),
}));

const mockUseAuth = vi.mocked(AuthContextModule.useAuth);
const mockGetProfile = vi.mocked(usersApi.getProfile);
const mockUpdateProfile = vi.mocked(usersApi.updateProfile);
const mockUploadAvatar = vi.mocked(usersApi.uploadAvatar);
const mockFollowUser = vi.mocked(followsApi.followUser);
const mockUnfollowUser = vi.mocked(followsApi.unfollowUser);
const mockFetchWorkoutPosts = vi.mocked(workoutPostsApi.fetchWorkoutPosts);

const mockUpdateCurrentUser = vi.fn();

const axiosError = (status: number) =>
  Object.assign(new Error('axios error'), { isAxiosError: true, response: { status } });

const makeProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 'other-user',
  username: 'bob',
  displayName: 'Bob',
  bio: null,
  avatarUrl: null,
  postCount: 0,
  followerCount: 5,
  followingCount: 3,
  isFollowing: false,
  ...overrides,
});

const makePost = (overrides: Partial<WorkoutPost> = {}): WorkoutPost => ({
  id: 'post-1',
  userId: 'other-user',
  title: 'テスト投稿',
  note: null,
  trainedOn: '2026-06-23',
  createdAt: '2026-06-23T00:00:00Z',
  likeCount: 0,
  commentCount: 0,
  isLiked: false,
  user: { id: 'other-user', username: 'bob', displayName: 'Bob', avatarUrl: null },
  workoutExercises: [],
  postImages: [],
  ...overrides,
});

const setupCurrentUser = (id = 'me') => {
  mockUseAuth.mockReturnValue({
    user: {
      id,
      username: 'alice',
      displayName: 'Alice',
      email: 'alice@test.com',
      avatarUrl: null,
      bio: null,
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateCurrentUser: mockUpdateCurrentUser,
  });
};

const renderProfilePage = (profileId = 'other-user') =>
  render(
    <MemoryRouter initialEntries={[`/users/${profileId}`]}>
      <Routes>
        <Route path="/users/:id" element={<ProfilePage />} />
        <Route path="/" element={<div>timeline</div>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateCurrentUser.mockReset();
  mockFetchWorkoutPosts.mockResolvedValue({ data: [], total: 0 });
});

// ─── 基本表示 ──────────────────────────────────────────────────────────────────

describe('ProfilePage — 基本表示', () => {
  it('ローディング中はスピナーを表示する', () => {
    setupCurrentUser('me');
    mockGetProfile.mockReturnValue(new Promise(() => {})); // never resolves

    renderProfilePage('other-user');

    expect(screen.getByText('読み込み中...')).toBeTruthy();
  });

  it('正常表示: displayName・@username・bio・各カウント・イニシャルアバターを表示する', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(
      makeProfile({
        displayName: 'Bob',
        username: 'bob',
        bio: '筋トレが好きです',
        postCount: 3,
        followerCount: 10,
        followingCount: 5,
        avatarUrl: null,
      }),
    );

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByText('Bob')).toBeTruthy());
    expect(screen.getByText('@bob')).toBeTruthy();
    expect(screen.getByText('筋トレが好きです')).toBeTruthy();
    expect(screen.getByTestId('post-count').textContent).toBe('3');
    expect(screen.getByTestId('follower-count').textContent).toBe('10');
    expect(screen.getByTestId('following-count').textContent).toBe('5');
    // avatarUrl なし → イニシャル円（'B'）を表示
    expect(screen.getByTestId('avatar-initial').textContent).toBe('B');
    expect(screen.queryByTestId('avatar-image')).toBeNull();
  });

  it('displayName が空文字のとき、イニシャルに ? を表示する（フォールバック）', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ displayName: '', avatarUrl: null }));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('avatar-initial').textContent).toBe('?'));
  });

  it('avatarUrl がある場合は <img> を表示しイニシャルは非表示にする', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ avatarUrl: 'http://s3/avatar.jpg' }));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('avatar-image')).toBeTruthy());
    expect(screen.queryByTestId('avatar-initial')).toBeNull();
  });

  it('自分のプロフィール: 編集ボタンを表示しフォローボタンは表示しない', async () => {
    setupCurrentUser('own-user');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'own-user' }));

    renderProfilePage('own-user');

    await waitFor(() => expect(screen.getByTestId('edit-profile-button')).toBeTruthy());
    expect(screen.queryByTestId('follow-button')).toBeNull();
  });

  it('他ユーザーのプロフィール: フォローボタンを表示し編集ボタンは表示しない', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'other-user' }));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follow-button')).toBeTruthy());
    expect(screen.queryByTestId('edit-profile-button')).toBeNull();
  });

  it('404: 「ユーザーが見つかりません。」を表示する', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockRejectedValue(axiosError(404));

    renderProfilePage('nonexistent');

    await waitFor(() =>
      expect(screen.getByText('ユーザーが見つかりません。')).toBeTruthy(),
    );
  });

  it('API エラー: エラーメッセージを表示する', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockRejectedValue(new Error('network error'));

    renderProfilePage('other-user');

    await waitFor(() =>
      expect(screen.getByText('ユーザー情報の取得に失敗しました。')).toBeTruthy(),
    );
  });

  it('投稿一覧を取得して表示する', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile());
    mockFetchWorkoutPosts.mockResolvedValue({ data: [makePost()], total: 1 });

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('post-card')).toBeTruthy());
    expect(screen.getByText('テスト投稿')).toBeTruthy();
  });

  it('投稿0件のときは投稿カードを表示しない', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile());
    // beforeEach で { data: [], total: 0 } に設定済み

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follow-button')).toBeTruthy());
    expect(screen.queryByTestId('post-card')).toBeNull();
  });

  it('フォロワー数・フォロー中数は正しい href を持つ', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'other-user' }));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follower-count')).toBeTruthy());

    const followerLink = screen.getByTestId('follower-count').closest('a');
    const followingLink = screen.getByTestId('following-count').closest('a');

    expect(followerLink?.getAttribute('href')).toBe('/users/other-user/followers');
    expect(followingLink?.getAttribute('href')).toBe('/users/other-user/following');
  });
});

// ─── プロフィール編集 ──────────────────────────────────────────────────────────

describe('ProfilePage — プロフィール編集', () => {
  const setupOwnAndOpenModal = async () => {
    setupCurrentUser('own-user');
    mockGetProfile.mockResolvedValue(
      makeProfile({ id: 'own-user', displayName: 'Alice', bio: 'こんにちは' }),
    );

    renderProfilePage('own-user');

    await waitFor(() => expect(screen.getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.click(screen.getByTestId('edit-profile-button'));
    await waitFor(() => expect(screen.getByTestId('edit-modal')).toBeTruthy());
  };

  it('編集成功: displayName・bio が画面に反映され updateCurrentUser が呼ばれモーダルが閉じる', async () => {
    await setupOwnAndOpenModal();

    mockUpdateProfile.mockResolvedValue({
      id: 'own-user',
      username: 'alice',
      displayName: 'Alice Updated',
      bio: 'こんにちは',
      avatarUrl: null,
    });

    const nameInput = screen.getByTestId('edit-display-name-input') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Alice Updated' } });
    fireEvent.click(screen.getByTestId('edit-submit-button'));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Alice Updated' }),
      );
      expect(screen.queryByTestId('edit-modal')).toBeNull();
    });
    // 更新後の displayName・bio がプロフィール画面に反映されている
    expect(screen.getByText('Alice Updated')).toBeTruthy();
    expect(screen.getByText('こんにちは')).toBeTruthy();
    // updateCurrentUser が displayName で呼ばれる（bio は AuthContext 管轄外）
    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({ displayName: 'Alice Updated' });
  });

  it('編集失敗: モーダル内にエラーメッセージを表示しモーダルは開いたまま', async () => {
    await setupOwnAndOpenModal();

    mockUpdateProfile.mockRejectedValue(new Error('server error'));
    fireEvent.click(screen.getByTestId('edit-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-error').textContent).toBe(
        'プロフィールの更新に失敗しました。',
      );
    });
    expect(screen.getByTestId('edit-modal')).toBeTruthy();
  });

  it('displayName が空白のみ → クライアントバリデーションエラー・API は呼ばれない', async () => {
    await setupOwnAndOpenModal();

    const nameInput = screen.getByTestId('edit-display-name-input') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByTestId('edit-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('edit-error').textContent).toBe('表示名を入力してください。');
    });
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    // bio バリデーション: bio は textarea の maxLength 属性で制御し JS 側のブロック処理なし
  });

  it('送信中は送信ボタンを disabled にする（二重送信防止）', async () => {
    await setupOwnAndOpenModal();

    mockUpdateProfile.mockReturnValue(new Promise(() => {})); // never resolves
    fireEvent.click(screen.getByTestId('edit-submit-button'));

    await waitFor(() => {
      const btn = screen.getByTestId('edit-submit-button') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });
  });

  it('bio テキストエリアの maxLength は 160 である', async () => {
    await setupOwnAndOpenModal();

    const bioInput = screen.getByTestId('edit-bio-input') as HTMLTextAreaElement;
    expect(bioInput.maxLength).toBe(160);
  });
});

// ─── フォロー ─────────────────────────────────────────────────────────────────

describe('ProfilePage — フォロー', () => {
  it('フォロー成功 → followerCount + 1 かつ isFollowing = true', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ followerCount: 5, isFollowing: false }));
    mockFollowUser.mockResolvedValue(undefined);

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follower-count').textContent).toBe('5'));

    fireEvent.click(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(screen.getByTestId('follower-count').textContent).toBe('6');
      expect(screen.getByTestId('follow-button').textContent).toBe('フォロー中');
    });
  });

  it('フォロー解除成功 → followerCount - 1 かつ isFollowing = false', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ followerCount: 5, isFollowing: true }));
    mockUnfollowUser.mockResolvedValue(undefined);

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follower-count').textContent).toBe('5'));

    fireEvent.click(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(screen.getByTestId('follower-count').textContent).toBe('4');
      expect(screen.getByTestId('follow-button').textContent).toBe('フォロー');
    });
  });

  it('409 → isFollowing = true に寄せるが followerCount は変化しない', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ followerCount: 5, isFollowing: false }));
    mockFollowUser.mockRejectedValue(axiosError(409));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follower-count').textContent).toBe('5'));

    fireEvent.click(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(screen.getByTestId('follow-button').textContent).toBe('フォロー中');
    });
    expect(screen.getByTestId('follower-count').textContent).toBe('5');
  });

  it('unfollow 時 404 → isFollowing = false に寄せるが followerCount は変化しない', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ followerCount: 5, isFollowing: true }));
    mockUnfollowUser.mockRejectedValue(axiosError(404));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follower-count').textContent).toBe('5'));

    fireEvent.click(screen.getByTestId('follow-button'));

    await waitFor(() => {
      expect(screen.getByTestId('follow-button').textContent).toBe('フォロー');
    });
    expect(screen.getByTestId('follower-count').textContent).toBe('5');
  });
});

// ─── 管理リンク ───────────────────────────────────────────────────────────────

describe('ProfilePage — 管理リンク', () => {
  it('自分のプロフィールでは独自種目管理リンクが表示され /exercises を指す', async () => {
    setupCurrentUser('own-user');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'own-user' }));

    renderProfilePage('own-user');

    await waitFor(() => expect(screen.getByTestId('exercises-link')).toBeTruthy());
    const link = screen.getByTestId('exercises-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/exercises');
    expect(link.textContent).toBe('独自種目管理');
  });

  it('自分のプロフィールではデバイス管理リンクが表示され /settings/sessions を指す', async () => {
    setupCurrentUser('own-user');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'own-user' }));

    renderProfilePage('own-user');

    await waitFor(() => expect(screen.getByTestId('sessions-link')).toBeTruthy());
    const link = screen.getByTestId('sessions-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/settings/sessions');
    expect(link.textContent).toBe('デバイス管理');
  });

  it('他人のプロフィールでは独自種目管理・デバイス管理リンクを表示しない', async () => {
    setupCurrentUser('me');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'other-user' }));

    renderProfilePage('other-user');

    await waitFor(() => expect(screen.getByTestId('follow-button')).toBeTruthy());
    expect(screen.queryByTestId('exercises-link')).toBeNull();
    expect(screen.queryByTestId('sessions-link')).toBeNull();
  });
});

// ─── アバター更新 ─────────────────────────────────────────────────────────────

describe('ProfilePage — アバター更新', () => {
  const setupOwnAndOpenModal = async () => {
    setupCurrentUser('own-user');
    mockGetProfile.mockResolvedValue(makeProfile({ id: 'own-user', avatarUrl: null }));

    renderProfilePage('own-user');

    await waitFor(() => expect(screen.getByTestId('edit-profile-button')).toBeTruthy());
    fireEvent.click(screen.getByTestId('edit-profile-button'));
    await waitFor(() => expect(screen.getByTestId('edit-modal')).toBeTruthy());
  };

  it('アバター更新成功 → updateCurrentUser が avatarUrl で呼ばれ ProfilePage の表示が <img> に切り替わる', async () => {
    await setupOwnAndOpenModal();

    mockUploadAvatar.mockResolvedValue({
      avatarKey: 'images/avatars/own-user/uuid.jpg',
      avatarUrl: 'http://s3/avatar.jpg',
    });

    const avatarInput = screen.getByTestId('avatar-file-input') as HTMLInputElement;
    const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(avatarInput, 'files', { value: [file], configurable: true });
    fireEvent.change(avatarInput);

    await waitFor(() => {
      expect(mockUpdateCurrentUser).toHaveBeenCalledWith({ avatarUrl: 'http://s3/avatar.jpg' });
      // ProfilePage ヘッダーのアバターが <img> に切り替わる
      const img = screen.getByTestId('avatar-image') as HTMLImageElement;
      expect(img.src).toContain('http://s3/avatar.jpg');
      expect(screen.queryByTestId('avatar-initial')).toBeNull();
    });
    expect(screen.queryByTestId('avatar-error')).toBeNull();
  });

  it('アバター更新失敗 → モーダル内エラーメッセージ表示・updateCurrentUser は呼ばれない', async () => {
    await setupOwnAndOpenModal();

    mockUploadAvatar.mockRejectedValue(new Error('S3 error'));

    const avatarInput = screen.getByTestId('avatar-file-input') as HTMLInputElement;
    const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(avatarInput, 'files', { value: [file], configurable: true });
    fireEvent.change(avatarInput);

    await waitFor(() => {
      expect(screen.getByTestId('avatar-error').textContent).toBe(
        'アバターのアップロードに失敗しました。',
      );
    });
    expect(mockUpdateCurrentUser).not.toHaveBeenCalled();
  });

  it('ファイル選択後 input.value が同期的にリセットされる（成功・失敗両方に適用）', async () => {
    await setupOwnAndOpenModal();

    // uploadAvatar を未解決のまま保持（リセットは非同期処理開始前に発生するため待たなくてよい）
    mockUploadAvatar.mockReturnValue(new Promise(() => {}));

    const avatarInput = screen.getByTestId('avatar-file-input') as HTMLInputElement;
    const file = new File(['data'], 'avatar.jpg', { type: 'image/jpeg' });
    Object.defineProperty(avatarInput, 'files', { value: [file], configurable: true });
    Object.defineProperty(avatarInput, 'value', {
      value: 'C:\\fakepath\\avatar.jpg',
      writable: true,
      configurable: true,
    });

    fireEvent.change(avatarInput);

    // handleAvatarSelect 冒頭の e.target.value = '' は同期実行のため即座に確認できる
    expect(avatarInput.value).toBe('');
  });
});
