import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PostCard from '../components/PostCard';
import * as likesApi from '../api/likes';
import type { WorkoutPost } from '../types/workout';

vi.mock('../api/likes', () => ({
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    isAxiosError: (e: unknown) =>
      (e as { isAxiosError?: boolean }).isAxiosError === true,
  };
});

const mockAddLike = vi.mocked(likesApi.addLike);
const mockRemoveLike = vi.mocked(likesApi.removeLike);

const basePost: WorkoutPost = {
  id: '1',
  userId: '10',
  title: 'テスト投稿',
  note: null,
  trainedOn: '2026-06-18',
  createdAt: '2026-06-18T10:00:00Z',
  likeCount: 5,
  commentCount: 3,
  isLiked: false,
  user: { id: '10', username: 'tester', displayName: 'テスター' },
  workoutExercises: [],
  postImages: [],
};

const renderCard = (post: WorkoutPost = basePost) =>
  render(
    <MemoryRouter>
      <PostCard post={post} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PostCard', () => {
  it('renders post title and like/comment counts', () => {
    renderCard();

    expect(screen.getByText('テスト投稿')).toBeTruthy();
    expect(screen.getByText(/5/)).toBeTruthy();
    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it('renders a link to the post detail page', () => {
    renderCard();

    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/workout-posts/1');
  });

  it('calls addLike when like button clicked (not liked)', async () => {
    mockAddLike.mockResolvedValue(undefined);
    renderCard({ ...basePost, isLiked: false });

    const likeBtn = screen.getByRole('button');
    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(mockAddLike).toHaveBeenCalledWith('1');
    });
  });

  it('calls removeLike when like button clicked (already liked)', async () => {
    mockRemoveLike.mockResolvedValue(undefined);
    renderCard({ ...basePost, isLiked: true });

    const likeBtn = screen.getByRole('button');
    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(mockRemoveLike).toHaveBeenCalledWith('1');
    });
  });

  it('shows image thumbnails when postImages is non-empty', () => {
    const postWithImages: WorkoutPost = {
      ...basePost,
      postImages: [
        { id: 'img1', imageKey: 'images/posts/1/abc.jpg', displayOrder: 0, imageUrl: 'http://localhost:4566/fitlog/images/posts/1/abc.jpg' },
        { id: 'img2', imageKey: 'images/posts/1/def.jpg', displayOrder: 1, imageUrl: 'http://localhost:4566/fitlog/images/posts/1/def.jpg' },
      ],
    };
    renderCard(postWithImages);

    const images = document.querySelectorAll('img[src]');
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect((images[0] as HTMLImageElement).src).toContain('abc.jpg');
    expect((images[1] as HTMLImageElement).src).toContain('def.jpg');
  });

  it('hides image area when postImages is empty', () => {
    renderCard({ ...basePost, postImages: [] });

    // No <img> elements should be present (no thumbnails)
    const images = document.querySelectorAll('img[src]');
    expect(images.length).toBe(0);
  });

  it('handles 409 conflict: sets isLiked=true and does not double-count', async () => {
    const axiosError = {
      isAxiosError: true,
      response: { status: 409 },
    };
    mockAddLike.mockRejectedValue(axiosError);

    renderCard({ ...basePost, isLiked: false, likeCount: 5 });

    const likeBtn = screen.getByRole('button');
    fireEvent.click(likeBtn);

    await waitFor(() => {
      expect(mockAddLike).toHaveBeenCalledWith('1');
    });

    // likeCount should remain 5 (rolled back from optimistic 6)
    expect(screen.getByText(/5/)).toBeTruthy();
  });
});
