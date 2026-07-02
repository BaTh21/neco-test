import { useState } from 'react';
import { commentOnDiary, getDiaryComments, getDiaryLikes, likeDiary } from '../services/api';

export const useDiaryInteractions = () => {
  const [expandedDiary, setExpandedDiary] = useState(null);
  const [diaryComments, setDiaryComments] = useState({});
  const [diaryLikes, setDiaryLikes] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [likedDiaries, setLikedDiaries] = useState(new Set());
  const [commentLoading, setCommentLoading] = useState({});

  const handleLikeDiary = async (diaryId) => {
    try {
      await likeDiary(diaryId);
      const newLikedDiaries = new Set(likedDiaries);
      if (newLikedDiaries.has(diaryId)) {
        newLikedDiaries.delete(diaryId);
        setDiaryLikes(prev => ({
          ...prev,
          [diaryId]: Math.max(0, (prev[diaryId] || 0) - 1)
        }));
      } else {
        newLikedDiaries.add(diaryId);
        setDiaryLikes(prev => ({
          ...prev,
          [diaryId]: (prev[diaryId] || 0) + 1
        }));
      }
      setLikedDiaries(newLikedDiaries);
      return true;
    } catch (err) {
      console.error('Failed to like diary:', err);
      return false;
    }
  };

  const handleAddComment = async (diaryId) => {
    const commentText = commentTexts[diaryId] || '';
    if (!commentText.trim()) return null;

    setCommentLoading(prev => ({ ...prev, [diaryId]: true }));

    try {
      const newComment = await commentOnDiary(diaryId, commentText);
      setDiaryComments(prev => ({
        ...prev,
        [diaryId]: [...(prev[diaryId] || []), newComment]
      }));
      setCommentTexts(prev => ({ ...prev, [diaryId]: '' }));
      return newComment;
    } catch (err) {
      console.error('Failed to add comment:', err);
      throw err;
    } finally {
      setCommentLoading(prev => ({ ...prev, [diaryId]: false }));
    }
  };

  const handleExpandDiary = async (diaryId) => {
    if (!diaryId) return;

    setExpandedDiary(expandedDiary === diaryId ? null : diaryId);

    if (expandedDiary !== diaryId) {
      try {
        const [comments, likes] = await Promise.all([
          getDiaryComments(diaryId).catch(() => []),
          getDiaryLikes(diaryId).catch(() => []),
        ]);

        setDiaryComments(prev => ({
          ...prev,
          [diaryId]: comments
        }));

        setDiaryLikes(prev => ({
          ...prev,
          [diaryId]: Array.isArray(likes) ? likes.length : (likes || 0)
        }));
      } catch (err) {
        console.error('Failed to fetch diary details:', err);
      }
    }
  };

  const handleCommentTextChange = (diaryId, text) => {
    setCommentTexts(prev => ({
      ...prev,
      [diaryId]: text
    }));
  };

  const resetInteractions = () => {
    setExpandedDiary(null);
    setDiaryComments({});
    setDiaryLikes({});
    setCommentTexts({});
    setLikedDiaries(new Set());
    setCommentLoading({});
  };

  return {
    expandedDiary,
    diaryComments,
    diaryLikes,
    commentTexts,
    likedDiaries,
    commentLoading,
    handleLikeDiary,
    handleAddComment,
    handleExpandDiary,
    handleCommentTextChange,
    resetInteractions,
    setExpandedDiary,
    setDiaryComments,
    setDiaryLikes
  };
};