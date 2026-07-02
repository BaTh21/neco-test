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
  Divider,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCambodiaDate } from '../../utils/dateUtils';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { getCommentLike, toggleCommentLike } from '../../services/api';
import FavoriteIcon from '@mui/icons-material/Favorite';

export const DiaryReplyComponent = ({
  mainCommentId,
  comment,
  diaryId,
  profile,
  onAddReply,
  level = 0,
  replyingTo,
  setReplyingTo,
  handleImageUpload,
  selectedCommentImages,
  setSelectedCommentImages,
  onEditReply,
  onDeleteReply,
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
  const [commentLike, setCommentLike] = useState({
    liked: false,
    like_count: 0
  });

  const commentMenuOpen = Boolean(commentMenuAnchorEl);
  const isCommentOwner = profile && comment.user?.id === profile.id;
  const maxDepth = 5;
  const isTooDeep = level >= maxDepth;

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
    return () => {
      localEditImages.forEach(img => URL.revokeObjectURL(img.preview));
    };
  }, [localEditImages]);

  const handleCommentMenuOpen = (e) => {
    e.stopPropagation();
    setCommentMenuAnchorEl(e.currentTarget);
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
    onDeleteReply(comment.id);
    handleCommentMenuClose();
  };

  const handleReply = () => {
    setLocalReplying(true);
    setReplyingTo(comment.id);
    setLocalReplyText(`@${comment.user?.username} `);
  };

  const handleCancelReply = () => {
    setLocalReplying(false);
    setReplyingTo(null);
    setLocalReplyText('');
  };

  const handleSubmitReply = async () => {
    if (!localReplyText.trim()) return;
    const images = selectedCommentImages[`reply-${mainCommentId}`] || [];
    await onAddReply(diaryId, mainCommentId, localReplyText, images);
    setLocalReplying(false);
    setLocalReplyText('');
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
      await onEditReply(comment.id, localEditText, imagesForBackend);
      setLocalEditing(false);
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

  const highlightMentions = (text) => {
    if (!text) return '';
    return text.replace(/(@\w+)/g, '<span style="color:#1976d2;font-weight:500">$1</span>');
  };

  return (
    <Box sx={{ mb: 2, ml: level > 0 ? 2 : 0, borderLeft: level > 0 ? '2px solid #e0e0e0' : 'none', pl: level > 0 ? 2 : 0 }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Avatar
          sx={{ width: level > 0 ? 24 : 28, height: level > 0 ? 24 : 28, fontSize: level > 0 ? '0.7rem' : '0.8rem', flexShrink: 0 }}
          src={comment.user?.avatar_url}
          alt={comment.user?.username}
        >
          {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          {/* Username + menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
            <Typography variant="body2" fontWeight="600" color="green">{comment.user?.username}</Typography>

            {isCommentOwner && !localEditing && (
              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                <IconButton size="small" onClick={handleCommentMenuOpen} sx={{ minWidth: 'auto', p: 0.5 }}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
                <Menu anchorEl={commentMenuAnchorEl} open={commentMenuOpen} onClose={handleCommentMenuClose}>
                  <MenuItem onClick={handleCommentEdit}><EditIcon fontSize="small" sx={{ mr: 1 }} /> {t('edit')}</MenuItem>
                  <MenuItem onClick={handleCommentDelete}><DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /><Typography color="error">{t('delete')}</Typography></MenuItem>
                </Menu>
              </Box>
            )}
          </Box>

          {/* Editing */}
          {localEditing && isCommentOwner ? (
            <Box sx={{ mb: 1, border: 1, borderRadius: 2 }}>
              <TextField
                fullWidth size="small" multiline rows={2} autoFocus
                value={localEditText} onChange={(e) => setLocalEditText(e.target.value)}
                sx={{ '& textarea': { background: 'transparent', zIndex: 1 }, '& fieldset': { border: 'none' } }}
              />
              <Divider />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1 }}>
                <Tooltip title="Add image">
                  <Button component="label" size="small" sx={{ minWidth: 0 }}>
                    <ImageIcon />
                    <input type="file" hidden multiple accept="image/*" onChange={handleEditImageUpload} />
                  </Button>
                </Tooltip>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" onClick={handleCancelEdit} disabled={editLoading}>{t('cancel')}</Button>
                  <Button variant="contained" size="small" onClick={handleSaveEdit} disabled={editLoading || !localEditText.trim()} startIcon={editLoading ? <CircularProgress size={16} /> : null}>
                    {editLoading ? t('saving...') : t('save')}
                  </Button>
                </Box>
              </Box>

              {localEditImages.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, p: 1 }}>
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
            <>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }} />
              {comment.images?.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                  {comment.images.map((img, idx) => (
                    <Box key={idx} sx={{ position: 'relative' }}>
                      <img src={img} alt={`Comment ${idx}`} style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }} onClick={() => onMediaClick?.(img, 'image')} />
                    </Box>
                  ))}
                </Box>
              )}
            </>
          )}

          {/* Footer actions */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">{formatCambodiaDate(comment.created_at)}</Typography>

            {profile && !isTooDeep && !localEditing && (
              <Tooltip title={`Reply to ${comment.user?.username}`}>
                <Button size="small" onClick={handleReply} sx={{ minWidth: 0, fontSize: 12 }}><ReplyIcon fontSize="small" /> Reply</Button>
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

          {/* Reply Input */}
          {(replyingTo === comment.id || localReplying) && !isTooDeep && !localEditing && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, border: 1, borderRadius: 2, mt: 1, p: 1 }}>
              <TextField fullWidth size="small" multiline rows={2} value={localReplyText} onChange={(e) => setLocalReplyText(e.target.value)} sx={{ '& fieldset': { border: 'none' } }} />
              <Divider/>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                <Button component="label" size="small"><ImageIcon /><input type="file" hidden multiple accept="image/*" onChange={(e) => handleImageUpload(e, null, `reply-${comment.id}`)} /></Button>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="text" size="small" onClick={handleCancelReply}>{t('cancel')}</Button>
                  <Button variant="contained" size="small" onClick={handleSubmitReply} disabled={!localReplyText?.trim()}>{t('send')}</Button>
                </Box>
              </Box>

              {selectedCommentImages[`reply-${comment.id}`]?.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                  {selectedCommentImages[`reply-${comment.id}`].map((img, idx) => (
                    <Box key={idx} sx={{ position: 'relative', width: 40, height: 40 }}>
                      <img src={img} alt={`Reply preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }} onClick={() => onMediaClick?.(img, 'image')} />
                      <IconButton size="small" onClick={() => {
                        const newImgs = selectedCommentImages[`reply-${comment.id}`].filter((_, i) => i !== idx);
                        setSelectedCommentImages(prev => ({ ...prev, [`reply-${comment.id}`]: newImgs }));
                      }} sx={{ position: 'absolute', top: -4, right: -4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', width: 16, height: 16 }}><CloseIcon sx={{ fontSize: 12 }} /></IconButton>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

