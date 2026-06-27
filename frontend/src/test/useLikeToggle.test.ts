import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLikeToggle } from '../hooks/useLikeToggle';
import * as likesApi from '../api/likes';

vi.mock('../api/likes', () => ({
  addLike: vi.fn(),
  removeLike: vi.fn(),
}));

const mockAddLike = vi.mocked(likesApi.addLike);
const mockRemoveLike = vi.mocked(likesApi.removeLike);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useLikeToggle', () => {
  it('initializes with provided values', () => {
    const { result } = renderHook(() => useLikeToggle('post-1', true, 5));
    expect(result.current.isLiked).toBe(true);
    expect(result.current.likeCount).toBe(5);
    expect(result.current.isLikeLoading).toBe(false);
  });

  it('optimistically increments count and sets isLiked=true when liking', async () => {
    mockAddLike.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLikeToggle('post-1', false, 3));

    await act(async () => {
      void result.current.handleLikeToggle();
    });

    expect(result.current.isLiked).toBe(true);
    expect(result.current.likeCount).toBe(4);
    expect(mockAddLike).toHaveBeenCalledWith('post-1');
    expect(mockRemoveLike).not.toHaveBeenCalled();
  });

  it('optimistically decrements count and sets isLiked=false when unliking', async () => {
    mockRemoveLike.mockResolvedValue(undefined);
    const { result } = renderHook(() => useLikeToggle('post-1', true, 3));

    await act(async () => {
      void result.current.handleLikeToggle();
    });

    expect(result.current.isLiked).toBe(false);
    expect(result.current.likeCount).toBe(2);
    expect(mockRemoveLike).toHaveBeenCalledWith('post-1');
    expect(mockAddLike).not.toHaveBeenCalled();
  });

  it('rolls back on API failure (non-409)', async () => {
    mockAddLike.mockRejectedValue(new Error('network error'));
    const { result } = renderHook(() => useLikeToggle('post-1', false, 3));

    await act(async () => {
      void result.current.handleLikeToggle();
    });

    expect(result.current.isLiked).toBe(false);
    expect(result.current.likeCount).toBe(3);
  });

  it('sets isLiked=true and restores prevCount on 409 conflict', async () => {
    const error = { isAxiosError: true, response: { status: 409 } };
    mockAddLike.mockRejectedValue(error);
    const { result } = renderHook(() => useLikeToggle('post-1', false, 3));

    await act(async () => {
      void result.current.handleLikeToggle();
    });

    expect(result.current.isLiked).toBe(true);
    expect(result.current.likeCount).toBe(3);
  });

  it('ignores second click while loading (double-click guard)', async () => {
    let resolveAdd!: () => void;
    mockAddLike.mockReturnValue(new Promise<void>((r) => { resolveAdd = r; }));
    const { result } = renderHook(() => useLikeToggle('post-1', false, 3));

    act(() => { void result.current.handleLikeToggle(); });
    expect(result.current.isLikeLoading).toBe(true);

    act(() => { void result.current.handleLikeToggle(); });

    await act(async () => { resolveAdd(); });

    expect(mockAddLike).toHaveBeenCalledTimes(1);
  });

  it('likeCount=0 with isLiked=false rolls back to count=0 on failure', async () => {
    mockAddLike.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() => useLikeToggle('post-1', false, 0));

    await act(async () => {
      void result.current.handleLikeToggle();
    });

    expect(result.current.likeCount).toBe(0);
    expect(result.current.isLiked).toBe(false);
  });
});
