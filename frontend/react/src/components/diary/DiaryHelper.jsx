import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  MoreVert as MoreVertIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Divider,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCambodiaDate } from '../../utils/dateUtils';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { DiaryReplyComponent } from './DiaryReplyComponent';
import { commentOnDiary, getCommentReplies, getCommentLike, toggleCommentLike } from '../../services/api';
import FavoriteIcon from '@mui/icons-material/Favorite';

export const CommentItemWithActions = ({
  comment,
  diaryId,
  profile,
  level = 0,
  replyingTo,
  setReplyingTo,
  handleImageUpload,
  selectedCommentImages,
  setSelectedCommentImages,
  onEditComment,
  onDeleteComment,
  onMediaClick,
}) => {
  const { t } = useTranslation();

  const [localReplying, setLocalReplying] = useState(false);
  const [localEditing, setLocalEditing] = useState(false);
  const [localEditText, setLocalEditText] = useState(comment.content);
  const [localEditImages, setLocalEditImages] = useState([]);
  const [localReplyText, setLocalReplyText] = useState('');
  const [commentMenuAnchorEl, setCommentMenuAnchorEl] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [repliesData, setRepliesData] = useState({});
  const [commentLike, setCommentLike] = useState({
    liked: false,
    like_count: 0
  });

  const commentMenuOpen = Boolean(commentMenuAnchorEl);
  const isCommentOwner = profile && comment.user?.id === profile.id;
  const maxDepth = 5;
  const isTooDeep = level >= maxDepth;
  const repliesLimit = 2;

  const loadInitialReplies = async () => {
    if (comment.replies_count > 0 && !repliesData[comment.id]) {
      try {
        const initialReplies = await getCommentReplies(comment.id, repliesLimit, 0);
        setRepliesData(prev => ({ ...prev, [comment.id]: initialReplies }));
      } catch (err) {
        console.error('Failed to load replies:', err);
      }
    }
  };

  const fetchCommentLike = async (commentId) => {
    const res = await getCommentLike(commentId);
    setCommentLike(res);
  };

  const handleToggleCommentLike = async (commentId) => {
    const res = await toggleCommentLike(commentId);
    setCommentLike(prev => ({
      ...prev,
      liked: res.liked,
      like_count: res.like_count
    }));
  };

  useEffect(() => {
    if (profile) {
      fetchCommentLike(comment.id);
    }
  }, [comment.id, profile]);

  useEffect(() => {
    loadInitialReplies();
  }, [comment.id]);

  const handleCommentMenuOpen = (event) => {
    event.stopPropagation();
    setCommentMenuAnchorEl(event.currentTarget);
  };

  const handleCommentMenuClose = () => setCommentMenuAnchorEl(null);

  const handleCommentEdit = () => {
    setLocalEditing(true);
    setLocalEditText(comment.content);
    setLocalEditImages(
      (comment.images || []).map(url => ({ preview: url, data: url }))
    );
    handleCommentMenuClose();
  };

  const handleCommentDelete = () => {
    onDeleteComment(comment.id);
    handleCommentMenuClose();
  };

  const handleReply = (commentId) => {
    setReplyingTo(commentId);
    setLocalReplying(true);
    const username = comment.user?.username;
    if (username) setLocalReplyText(`@${username} `);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setLocalReplying(false);
    setLocalReplyText('');
  };

  const handleSubmitReply = async () => {
    if (localReplyText?.trim()) {
      const images = selectedCommentImages[`reply-${comment.id}`] || [];
      const newReply = await commentOnDiary(diaryId, localReplyText, comment.id, images);
      setRepliesData((prev) => ({
        ...prev,
        [comment.id]: [newReply, ...(prev[comment.id] || [])],
      }));
      setLocalReplying(false);
      setLocalReplyText("");
      setSelectedCommentImages(prev => ({ ...prev, [`reply-${comment.id}`]: [] }));
    }
  };

  const handleCancelEdit = () => {
    setLocalEditing(false);
    setLocalEditText(comment.content);
    setLocalEditImages(comment.images || []);
  };

  const handleSaveEdit = async () => {
    if (!localEditText.trim()) return;
    setEditLoading(true);
    try {
      const imagesForBackend = localEditImages.map(img => img.data);
      await onEditComment(comment.id, localEditText, imagesForBackend);
      setLocalEditing(false);
    } catch (err) {
      console.error('Failed to edit comment:', err);
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditImageUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newImages = await Promise.all(
      Array.from(files).map(file =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ preview: URL.createObjectURL(file), data: reader.result });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      )
    );
    setLocalEditImages(prev => [...prev, ...newImages]);
  };

  const handleLoadMoreReplies = async (commentId) => {
    const currentReplies = repliesData[commentId] || [];
    const offset = currentReplies.length;
    try {
      const newReplies = await getCommentReplies(commentId, repliesLimit, offset);
      setRepliesData(prev => ({
        ...prev,
        [commentId]: [...currentReplies, ...newReplies]
      }));
    } catch (err) {
      console.error('Failed to load more replies:', err);
    }
  };

  const handleAddCommentReply = async (diaryId, mainCommentId, replyText) => {
    if (!replyText?.trim()) return;

    const images = selectedCommentImages[`reply-${mainCommentId}`] || [];
    const imagesForBackend = images.map(img => typeof img === 'string' ? img : img.data);

    try {
      const newReply = await commentOnDiary(diaryId, replyText, mainCommentId, imagesForBackend);

      setRepliesData(prev => ({
        ...prev,
        [mainCommentId]: [newReply, ...(prev[mainCommentId] || [])],
      }));

      setLocalReplying(false);
      setLocalReplyText('');
      setReplyingTo(null);
      setSelectedCommentImages(prev => ({ ...prev, [`reply-${mainCommentId}`]: [] }));
    } catch (err) {
      console.error("Failed to add reply:", err.message);
    }
  };

  const handleDeleteReply = async (replyId) => {
    await onDeleteComment(replyId);
    setRepliesData(prev => ({
      ...prev,
      [comment.id]: prev[comment.id]?.filter(reply => reply.id !== replyId),
    }));
  }

  const handleEditReply = async (replyId, newContent, newImages) => {
    await onEditComment(replyId, newContent, newImages);
    setRepliesData(prev => ({
      ...prev,
      [comment.id]: prev[comment.id]?.map(reply =>
        reply.id === replyId ? { ...reply, content: newContent, images: newImages } : reply
      ),
    }));
  }

  const highlightMentions = (text) => text?.replace(/(@\w+)/g, '<span style="color:#1976d2;font-weight:500">$1</span>');

  return (
    <Box sx={{ mb: 2, ml: level > 0 ? 2 : 0, borderLeft: level > 0 ? '2px solid #e0e0e0' : 'none', pl: level > 0 ? 2 : 0, position: 'relative' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Avatar
          sx={{ width: level > 0 ? 24 : 28, height: level > 0 ? 24 : 28, fontSize: level > 0 ? '0.7rem' : '0.8rem', flexShrink: 0 }}
          src={comment.user?.avatar_url}
          alt={comment.user?.username}
        >
          {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          {/* Header with username and menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="body2" fontWeight="600" color="green">
              {comment.user?.username}
            </Typography>

            {isCommentOwner && !localEditing && (
              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                <IconButton size="small" onClick={handleCommentMenuOpen} sx={{ minWidth: 'auto', p: 0.5 }}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu anchorEl={commentMenuAnchorEl} open={commentMenuOpen} onClose={handleCommentMenuClose}>
                  <MenuItem onClick={handleCommentEdit}><EditIcon fontSize="small" sx={{ mr: 1 }} />{t('edit')}</MenuItem>
                  <MenuItem onClick={handleCommentDelete}><DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /><Typography color="error">{t('delete')}</Typography></MenuItem>
                </Menu>
              </Box>
            )}
          </Box>

          {/* Editing */}
          {localEditing && isCommentOwner ? (
            <Box sx={{ mb: 1, border: 1, borderRadius: 2 }}>
              <TextField
                fullWidth size="small" value={localEditText} onChange={(e) => setLocalEditText(e.target.value)}
                multiline rows={2} autoFocus
                sx={{ '& textarea': { background: 'transparent', zIndex: 1 }, '& fieldset': { border: 'none' } }}
              />
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1 }}>
                <Button component="label" size="small" sx={{ minWidth: 0 }}>
                  <ImageIcon />
                  <input type="file" hidden multiple accept="image/*" onChange={handleEditImageUpload} />
                </Button>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleCancelEdit} disabled={editLoading}>{t('cancel')}</Button>
                  <Button variant="contained" size="small" onClick={handleSaveEdit} disabled={editLoading || !localEditText.trim()} startIcon={editLoading ? <CircularProgress size={16} /> : null}>
                    {editLoading ? t('saving...') : t('save')}
                  </Button>
                </Box>
              </Box>

              {localEditImages.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', p: 1 }}>
                  {localEditImages.map((img, idx) => (
                    <Box key={idx} sx={{ position: 'relative', width: 40, height: 40 }}>
                      <img src={img.preview} alt={`Edit ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }} />
                      <IconButton size="small" onClick={() => setLocalEditImages(prev => prev.filter((_, i) => i !== idx))} sx={{ position: 'absolute', top: -4, right: -4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', width: 16, height: 16 }}><CloseIcon sx={{ fontSize: 12 }} /></IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }} />
              {comment.images?.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {comment.images.map((img, idx) => (
                    <Box key={idx} sx={{ position: 'relative' }}>
                      <img src={img} alt={`Comment ${idx}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4, cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onMediaClick?.(img, 'image')} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}

          {/* Footer actions */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25 }}>{formatCambodiaDate(comment.created_at)}</Typography>

            {profile && !isTooDeep && !localEditing && (
              <Tooltip title={`Reply to ${comment.user?.username}`}>
                <Button size="small" onClick={() => handleReply(comment.id)} sx={{ minWidth: 0, fontSize: 12, '&:hover': { backgroundColor: 'transparent' } }}>
                  <ReplyIcon fontSize="small" /> Reply
                </Button>
              </Tooltip>
            )}

            <Button
              sx={{ minWidth: 0, height: 18 }}
              onClick={() => handleToggleCommentLike(comment.id)}
            >
              {commentLike?.liked ?
                (<FavoriteIcon sx={{ fontSize: 18, color: 'red' }} />) :
                (<FavoriteBorderIcon
                  sx={{
                    fontSize: 18,
                    color: 'inherit'
                  }}
                />)}
              <Typography sx={{ fontSize: 12, ml: 0.5, color: commentLike?.liked ? 'red' : 'inherit' }}>
                {commentLike?.like_count ? (commentLike?.like_count) : ''}
              </Typography>
            </Button>
          </Box>

          {/* Reply input */}
          {(replyingTo === comment.id || localReplying) && !isTooDeep && !localEditing && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, border: 1, borderRadius: 2, mt: 1 }}>
              <Box sx={{ position: 'relative', flex: 1 }}>
                <TextField fullWidth size="small" value={localReplyText} onChange={(e) => setLocalReplyText(e.target.value)} multiline rows={2} sx={{ '& textarea': { background: 'transparent', zIndex: 1 }, '& fieldset': { border: 'none' } }} />
                <Divider />
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', p: 1 }}>
                  <Button component="label" size="small" sx={{ minWidth: 0 }}>
                    <ImageIcon />
                    <input type="file" hidden multiple accept="image/*" onChange={(e) => handleImageUpload(e, null, `reply-${comment.id}`)} />
                  </Button>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button variant="text" size="small" onClick={handleCancelReply}>{t('cancel')}</Button>
                    <Button variant="contained" size="small" onClick={handleSubmitReply} disabled={!localReplyText?.trim()}>{t('send')}</Button>
                  </Box>
                </Box>

                {selectedCommentImages[`reply-${comment.id}`]?.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center', p: 1 }}>
                    {selectedCommentImages[`reply-${comment.id}`].map((img, idx) => (
                      <Box key={idx} sx={{ position: 'relative', width: 40, height: 40 }}>
                        <img src={img} alt={`Reply preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }} onClick={() => onMediaClick?.(img, 'image')} />
                        <IconButton size="small" onClick={() => {
                          const newImages = selectedCommentImages[`reply-${comment.id}`].filter((_, i) => i !== idx);
                          setSelectedCommentImages(prev => ({ ...prev, [`reply-${comment.id}`]: newImages }));
                        }} sx={{ position: 'absolute', top: -4, right: -4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', width: 16, height: 16 }}>
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Replies */}
          {comment.replies_count > 0 && (
            <Box sx={{ mt: 2 }}>
              {(repliesData[comment.id] || []).map(reply => (
                <DiaryReplyComponent
                  mainCommentId={comment.id}
                  key={reply.id}
                  comment={reply}
                  diaryId={diaryId}
                  profile={profile}
                  onAddReply={handleAddCommentReply}
                  level={level + 1}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  handleImageUpload={handleImageUpload}
                  selectedCommentImages={selectedCommentImages}
                  setSelectedCommentImages={setSelectedCommentImages}
                  onEditReply={handleEditReply}
                  onDeleteReply={handleDeleteReply}
                  onMediaClick={onMediaClick}
                />
              ))}

              {comment.replies_count > (repliesData[comment.id]?.length || 0) && (
                <Box ml={4} >
                  <Button color='success' size="small" onClick={() => handleLoadMoreReplies(comment.id)}>
                    {t('See more replies')} ({comment.replies_count - (repliesData[comment.id]?.length || 0)})
                  </Button>
                </Box>
              )}
            </Box>
          )}

        </Box>
      </Box>
    </Box>
  );
};

