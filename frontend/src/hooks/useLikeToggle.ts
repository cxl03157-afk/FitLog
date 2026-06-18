import { useState } from 'react';
import { isAxiosError } from 'axios';
import { addLike, removeLike } from '../api/likes';

export const useLikeToggle = (
  postId: string,
  initialLiked: boolean,
  initialCount: number,
) => {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialCount);
  const [isLikeLoading, setIsLikeLoading] = useState(false);

  const handleLikeToggle = async () => {
    if (isLikeLoading) return;
    const prevLiked = isLiked;
    const prevCount = likeCount;
    setIsLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLikeLoading(true);
    try {
      if (prevLiked) {
        await removeLike(postId);
      } else {
        await addLike(postId);
      }
    } catch (e) {
      if (isAxiosError(e) && e.response?.status === 409) {
        // 既にナイス済み → isLiked=true に寄せる。count は二重加算防止のため prevCount に戻す
        setIsLiked(true);
        setLikeCount(prevCount);
      } else {
        setIsLiked(prevLiked);
        setLikeCount(prevCount);
      }
    } finally {
      setIsLikeLoading(false);
    }
  };

  return { isLiked, likeCount, isLikeLoading, handleLikeToggle };
};
