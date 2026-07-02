import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Favorite,
  FavoriteBorder,
  Image as ImageIcon,
  MoreVert as MoreVertIcon,
  PlayArrow as PlayArrowIcon,
  Videocam as VideocamIcon,
  ZoomIn as ZoomInIcon,
} from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Menu,
  MenuItem,
  Modal,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { commentOnDiary, deleteCommentById, deleteDiaryById, getDiaryById, getDiaryComments, getDiaryLikes, handleRemoveDiary, handleSaveDiary, likeDiary, sendFriendRequest, updateComment, updateDiaryById } from '../../services/api';
import { formatCambodiaDate } from '../../utils/dateUtils';
import { DiaryCard } from '../diary/DairyCard';
import { CommentItemWithActions } from '../diary/DiaryHelper';
import { useAuth } from '../../context/AuthContext';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import TurnedInNotOutlinedIcon from '@mui/icons-material/TurnedInNotOutlined';
import TurnedInIcon from "@mui/icons-material/TurnedIn";
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import { convertFilesToBase64 } from './convertFilesToBase64';
import { getVideoThumbnail } from './getVideoThumbnail';
import ShareComponent from './ShareComponent';
import ParentDiaryComponent from './ParentDiaryComponent';
import ExpandMoreSharpIcon from '@mui/icons-material/ExpandMoreSharp';

const ProfileDiary = ({ groups, diaries, onDataUpdate, profile, friends, fetchStats, isLinkedDiary = () => false, onDiaryDeleted = () => false }) => {
  const [diaryList, setDiaryList] = useState(diaries || []);
  const [loading, setLoading] = useState(false);
  const [expandedDiary, setExpandedDiary] = useState(null);
  const [diaryComments, setDiaryComments] = useState({});
  const [diaryLikes, setDiaryLikes] = useState({});
  const [commentTexts, setCommentTexts] = useState({});
  const [likedDiaries, setLikedDiaries] = useState(new Set());
  const [commentLoading, setCommentLoading] = useState({});
  const { auth } = useAuth();
  const user = auth?.user;

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [diaryToDelete, setDiaryToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [editingDiary, setEditingDiary] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editShareType, setEditShareType] = useState('');
  const [editGroupIds, setEditGroupIds] = useState([]);
  const [editImages, setEditImages] = useState([]);
  const [editVideos, setEditVideos] = useState([]);
  const [editLoading, setEditLoading] = useState(false);

  const [replyingTo, setReplyingTo] = useState(null);
  const [selectedCommentImages, setSelectedCommentImages] = useState({});
  const [commentDeleteDialogOpen, setCommentDeleteDialogOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const [commentDeleteLoading, setCommentDeleteLoading] = useState(false);

  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [selectedDiaryForMenu, setSelectedDiaryForMenu] = useState(null);
  const menuOpen = Boolean(menuAnchorEl);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const [mediaUpdateTrigger, setMediaUpdateTrigger] = useState(0);

  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState('');
  const [selectedThumbnail, setSelectedThumbnail] = useState('');
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [selectedMediaType, setSelectedMediaType] = useState('image');
  const [currentMediaList, setCurrentMediaList] = useState([]);
  const [sendingRequests, setSendingRequests] = useState(new Set());

  const [showButton, setShowButton] = useState(false);
  const [sharePopup, setSharePopup] = useState(false);
  const [copyLink, setCopyLink] = useState(null);
  const [selectedDiaryId, setSelectedDiaryId] = useState(null);
  const [diaryCommentsOffset, setDiaryCommentsOffset] = useState({});
  const COMMENTS_PREVIEW_LIMIT = 2;

  const toggleShowButton = () => {
    setShowButton(prev => !prev);
  }

  useEffect(() => {
    setDiaryList(diaries);
  }, [diaries]);

  useEffect(() => {
    if (!user?.id || !Array.isArray(diaryList)) return;

    const initialLiked = new Set();
    const initialLikes = {};

    diaryList.forEach(diary => {
      if (!diary) return;
      const likes = diary.likes || [];

      if (likes.some(like => like?.user?.id === user.id)) {
        initialLiked.add(diary.id);
      }

      initialLikes[diary.id] = likes.length;
    });

    setLikedDiaries(initialLiked);
    setDiaryLikes(initialLikes);
  }, [diaryList, user?.id]);

  const handleSendFriendRequest = async (userId) => {
    if (!userId || !profile || userId === profile.id) return;
    if (sendingRequests.has(userId)) return;

    setSendingRequests(prev => new Set(prev).add(userId));

    try {
      const result = await sendFriendRequest(userId);

      if (result.success) {
        let message = result.message || t('request_sent');

        if (result.code === 'ALREADY_EXISTS') {
          message = result.message || t('already_sent');
        } else if (result.code === 'ALREADY_FRIENDS') {
          message = t('already_friends');
        }

        showMessage(message, 'success');

        if (onDataUpdate) onDataUpdate();
      } else {
        showMessage(result.message || t('request_failed'), 'error');
      }
    } catch (err) {
      console.error('Send friend request failed:', err);
      let errorMessage = err.message || t('unexpected_error');

      if (err.message?.includes('401')) {
        errorMessage = t('please_login');
      } else if (!navigator.onLine) {
        errorMessage = t('no_internet');
      }

      showMessage(errorMessage, 'error');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Show notification message
  const showMessage = (message, severity = 'success') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  // Media viewer functions
  const openMediaViewer = (mediaList, startIndex = 0) => {
    const media = mediaList[startIndex];
    setCurrentMediaList(mediaList);
    setSelectedMedia(media.src);
    setSelectedMediaType(media.type);
    setSelectedThumbnail(media.thumbnail || '');
    setSelectedMediaIndex(startIndex);
    setMediaViewerOpen(true);
  };

  const handleMediaViewerClose = () => {
    setMediaViewerOpen(false);
    setSelectedMedia('');
    setSelectedThumbnail('');
    setSelectedMediaIndex(0);
    setCurrentMediaList([]);
    setSelectedMediaType('image');
  };

  const handlePrevMedia = () => {
    const newIndex =
      selectedMediaIndex > 0
        ? selectedMediaIndex - 1
        : currentMediaList.length - 1;
    const media = currentMediaList[newIndex];
    setSelectedMedia(media.src);
    setSelectedMediaType(media.type);
    setSelectedThumbnail(media.thumbnail || '');
    setSelectedMediaIndex(newIndex);
  };

  const handleNextMedia = () => {
    const newIndex =
      selectedMediaIndex < currentMediaList.length - 1 ? selectedMediaIndex + 1 : 0;
    const media = currentMediaList[newIndex];
    setSelectedMedia(media.src);
    setSelectedMediaType(media.type);
    setSelectedThumbnail(media.thumbnail || '');
    setSelectedMediaIndex(newIndex);
  };


  // Media upload handler
  const handleMediaUpload = async (event, diaryId = null, commentId = null, mediaType = 'image') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate files based on type
    const validFiles = Array.from(files).filter(file => {
      if (mediaType === 'image') {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB for images

        if (!isValidType) {
          showMessage(t('invalid_file_type (jpg, png, gif, etc.)'), 'error');
          return false;
        }

        if (!isValidSize) {
          showMessage(t('file_too_large'), 'error');
          return false;
        }

        // Check count for editing
        if (diaryId && editingDiary === diaryId) {
          const currentCount = mediaType === 'image' ? editImages.length : editVideos.length;
          const maxCount = mediaType === 'image' ? 10 : 3;
          if (currentCount + files.length > maxCount) {
            showMessage(t('max_images ${maxCount} ${mediaType === "image" ? "images" : "videos"} allowed'), 'error');
            return false;
          }
        }

        return true;
      } else if (mediaType === 'video') {
        const isValidType = file.type.startsWith('video/') || ['.mp4', '.mov', '.avi', '.webm', '.mkv'].some(ext => file.name.toLowerCase().endsWith(ext));
        const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB for videos

        if (!isValidType) {
          showMessage(t('invalid_video_type (mp4, mov, avi, webm, mkv)'), 'error');
          return false;
        }

        if (!isValidSize) {
          showMessage(t('video_too_large'), 'error');
          return false;
        }

        // Check count for editing
        if (diaryId && editingDiary === diaryId) {
          if (editVideos.length + files.length > 3) {
            showMessage(t('max_videos 3 videos allowed'), 'error');
            return false;
          }
        }

        return true;
      }

      return false;
    });

    if (validFiles.length === 0) return;

    try {
      const base64Media = await convertFilesToBase64(validFiles, mediaType);
      const mediaUrls = base64Media.map(img => img.data);

      if (diaryId && editingDiary === diaryId) {
        // For diary editing
        if (mediaType === 'image') {
          setEditImages(prev => {
            const newImages = [...prev, ...mediaUrls];
            setMediaUpdateTrigger(prev => prev + 1);
            return newImages;
          });
        } else {
          setEditVideos(prev => {
            const newVideos = [...prev, ...mediaUrls];
            setMediaUpdateTrigger(prev => prev + 1);
            return newVideos;
          });
        }
        showMessage(`${mediaType === 'image' ? 'Image' : 'Video'} added`, 'success');
      } else if (commentId) {
        // For comment replies (only images allowed)
        setSelectedCommentImages(prev => ({
          ...prev,
          [commentId]: [...(prev[commentId] || []), ...mediaUrls]
        }));
      } else if (diaryId) {
        // For new comments (only images allowed)
        setSelectedCommentImages(prev => ({
          ...prev,
          [diaryId]: [...(prev[diaryId] || []), ...mediaUrls]
        }));
      }

      // Clear file input
      event.target.value = '';
    } catch (err) {
      showMessage(`Failed to process ${mediaType}s`, 'error');
      console.error('Media upload error:', err);
    }
  };

  // Remove media
  const removeMedia = (indexToRemove, diaryId = null, commentId = null, mediaType = 'image') => {
    if (diaryId && editingDiary === diaryId) {
      if (mediaType === 'image') {
        setEditImages(current => {
          const newImages = current.filter((_, index) => index !== indexToRemove);
          setMediaUpdateTrigger(prev => prev + 1);
          return newImages;
        });
      } else {
        setEditVideos(current => {
          const newVideos = current.filter((_, index) => index !== indexToRemove);
          setMediaUpdateTrigger(prev => prev + 1);
          return newVideos;
        });
      }
      showMessage(`${mediaType === 'image' ? 'Image' : 'Video'} removed`, 'info');
    } else if (commentId) {
      setSelectedCommentImages(prev => {
        const currentImages = prev[commentId] || [];
        const newImages = currentImages.filter((_, index) => index !== indexToRemove);
        return {
          ...prev,
          [commentId]: newImages
        };
      });
    } else if (diaryId) {
      setSelectedCommentImages(prev => {
        const currentImages = prev[diaryId] || [];
        const newImages = currentImages.filter((_, index) => index !== indexToRemove);
        return {
          ...prev,
          [diaryId]: newImages
        };
      });
    }
  };

  // Menu handlers
  const handleMenuOpen = (event, diary) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
    setSelectedDiaryForMenu(diary);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedDiaryForMenu(null);
  };

  const handleEditDiaryClick = () => {
    if (selectedDiaryForMenu) {
      handleEditClick(selectedDiaryForMenu);
    }
    handleMenuClose();
  };

  const handleDeleteDiaryClick = () => {
    if (selectedDiaryForMenu) {
      handleDeleteClick(selectedDiaryForMenu.id, selectedDiaryForMenu.title);
    }
    handleMenuClose();
  };

  // Diary operations
  const handleDeleteClick = (diaryId, diaryTitle) => {
    setDiaryToDelete({ id: diaryId, title: diaryTitle });
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDiaryToDelete(null);
    setDeleteLoading(false);
  };

  const handleDeleteDiary = async () => {
    if (!diaryToDelete) return;

    setDeleteLoading(true);
    try {
      await deleteDiaryById(diaryToDelete.id);
      showMessage(t('diary_deleted'));

      setDiaryList(prev => (prev || []).filter(d => d?.id !== diaryToDelete.id));

      fetchStats?.();


      onDataUpdate();

      onDiaryDeleted?.(diaryToDelete.id);
      handleDeleteCancel();
    } catch (err) {
      showMessage(err.message || t('failed_delete_diary'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditClick = async (diary) => {
    try {
      const fullDiary = await getDiaryById(diary.id);

      // Reset and set with fresh data
      setEditTitle(fullDiary.title || '');
      setEditContent(fullDiary.content || '');
      setEditShareType(fullDiary.share_type || '');
      setEditGroupIds(fullDiary.groups?.map(g => g.id) || []);

      // Set media with fresh arrays
      setEditImages([...(fullDiary.images || [])]);
      setEditVideos([...(fullDiary.videos || [])]);

      // Set editing diary last
      setEditingDiary(diary.id);

      // Reset media update trigger
      setMediaUpdateTrigger(0);
    } catch (err) {
      console.error('Failed to fetch diary:', err);
      setEditingDiary(diary.id);
      setEditTitle(diary.title || '');
      setEditContent(diary.content || '');
      setEditShareType(diary.share_type || '');
      setEditGroupIds(diary.groups?.map(g => g.id) || []);
      setEditImages([...(diary.images || [])]);
      setEditVideos([...(diary.videos || [])]);
    }
  };

  const handleEditCancel = () => {
    setEditingDiary(null);
    setEditTitle('');
    setEditContent('');
    setEditShareType('');
    setEditGroupIds([]);
    setEditImages([]);
    setEditVideos([]);
    setEditLoading(false);
    setMediaUpdateTrigger(0);
    showMessage(t('edit_cancelled'), 'info');
  };

  const handleEditSave = async (diaryId) => {
    setEditLoading(true);

    try {
      const updateData = {};

      // --- Title & Content ---
      updateData.title = editTitle?.trim() === '' ? null : editTitle?.trim();
      updateData.content = editContent?.trim() === '' ? null : editContent?.trim();

      // --- Share Type & Groups ---
      if (editShareType) {
        updateData.share_type = editShareType.toLowerCase().trim();
        if (editShareType === 'group') {
          updateData.group_ids = editGroupIds; // can be empty array
        }
      }

      // --- Images ---
      const existingImageUrls = editImages.filter(img => img.startsWith('http'));
      const newBase64Images = editImages.filter(img => img.startsWith('data:image/'));
      updateData.images = [...existingImageUrls, ...newBase64Images]; // can be empty array

      // --- Videos ---
      const existingVideoUrls = editVideos.filter(vid => vid.startsWith('http'));
      const newBase64Videos = editVideos.filter(vid => vid.startsWith('data:video/'));
      updateData.videos = [...existingVideoUrls, ...newBase64Videos]; // can be empty array

      if (Object.keys(updateData).length === 0) {
        showMessage(t('nothing_to_update'), 'error');
        setEditLoading(false);
        return;
      }

      await updateDiaryById(diaryId, updateData);
      showMessage(t('diary_updated'));
      handleEditCancel();
      if (onDataUpdate) onDataUpdate();
    } catch (err) {
      console.error('Update diary error:', err);
      showMessage(err.message || t('failed_update_diary'), 'error');
      setEditLoading(false);
    }
  };

  // Like diary
  const handleLikeDiary = async (diaryId) => {
    try {
      await likeDiary(diaryId);
      const newLikedDiaries = new Set(likedDiaries);
      if (newLikedDiaries.has(diaryId)) {
        newLikedDiaries.delete(diaryId);
        setDiaryLikes(prev => ({
          ...prev,
          [diaryId]: prev[diaryId] - 1 // or -1
        }));

      } else {
        newLikedDiaries.add(diaryId);
        setDiaryLikes(prev => ({
          ...prev,
          [diaryId]: prev[diaryId] + 1 // or -1
        }));

      }
      setLikedDiaries(newLikedDiaries);
    } catch (err) {
      showMessage(err.message || t('failed_like'), 'error');
    }
  };

  // Add comment
  const handleAddComment = async (diaryId) => {
    const commentText = commentTexts[diaryId] || '';
    if (!commentText.trim()) return;

    setCommentLoading(prev => ({ ...prev, [diaryId]: true }));

    try {
      const images = selectedCommentImages[diaryId] || [];
      const newComment = await commentOnDiary(diaryId, commentText, null, images);

      setDiaryComments(prev => {
        const diaryEntry = prev[diaryId] || { all: [], visibleCount: 5 };

        return {
          ...prev,
          [diaryId]: {
            ...diaryEntry,
            all: [...diaryEntry.all, newComment],
          }
        };
      });

      setCommentTexts(prev => ({ ...prev, [diaryId]: '' }));
      setSelectedCommentImages(prev => ({ ...prev, [diaryId]: [] }));
      showMessage(t('comment_added'));
    } catch (err) {
      showMessage(err.message || t('failed_add_comment'), 'error');
    } finally {
      setCommentLoading(prev => ({ ...prev, [diaryId]: false }));
    }
  };

  const handleExpandDiary = async (diaryId) => {
    if (expandedDiary === diaryId) {
      setExpandedDiary(null);
      return;
    }

    setExpandedDiary(diaryId);

    try {
      const [comments, likesCount] = await Promise.all([
        getDiaryComments(diaryId, COMMENTS_PREVIEW_LIMIT, 0).catch(() => []),
        getDiaryLikes(diaryId).catch(() => 0),
      ]);

      setDiaryComments(prev => ({
        ...prev,
        [diaryId]: {
          all: comments,
          visibleCount: COMMENTS_PREVIEW_LIMIT,
        },
      }));

      setDiaryCommentsOffset(prev => ({
        ...prev,
        [diaryId]: comments.length,
      }));

      setDiaryLikes(prev => ({ ...prev, [diaryId]: likesCount }));
    } catch (err) {
      console.error('Failed to fetch diary details:', err);
    }
  };

  const handleLoadMoreComments = async (diaryId) => {
    const offset = diaryCommentsOffset[diaryId] || 0;

    const newComments = await getDiaryComments(
      diaryId,
      COMMENTS_PREVIEW_LIMIT,
      offset
    );

    setDiaryComments(prev => ({
      ...prev,
      [diaryId]: {
        ...prev[diaryId],
        all: [...prev[diaryId].all, ...newComments],
        visibleCount: prev[diaryId].visibleCount + COMMENTS_PREVIEW_LIMIT,
      },
    }));

    setDiaryCommentsOffset(prev => ({
      ...prev,
      [diaryId]: offset + newComments.length,
    }));
  };

  // Edit comment
  const handleEditComment = async (commentId, content, images = []) => {
    try {
      const updatedComment = await updateComment(commentId, content, images);

      setDiaryComments(prev => {
        const updateCommentRecursive = (comments = []) => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                ...updatedComment,
                replies: comment.replies || [],
              };
            }

            if (comment.replies?.length) {
              return {
                ...comment,
                replies: updateCommentRecursive(comment.replies),
              };
            }

            return comment;
          });
        };

        const updatedState = {};

        Object.keys(prev).forEach(diaryId => {
          const diaryEntry = prev[diaryId];

          updatedState[diaryId] = {
            ...diaryEntry,
            all: updateCommentRecursive(diaryEntry.all),
          };
        });

        return updatedState;
      });

      showMessage(t('comment_updated'));
    } catch (err) {
      showMessage(err.message || t('failed_update_comment'), 'error');
      throw err;
    }
  };

  // Comment delete handlers
  const handleCommentDeleteClick = (commentId) => {
    setCommentToDelete(commentId);
    setCommentDeleteDialogOpen(true);
  };

  const handleCommentDeleteCancel = () => {
    setCommentDeleteDialogOpen(false);
    setCommentToDelete(null);
    setCommentDeleteLoading(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!commentId) return;

    setCommentDeleteLoading(true);

    try {
      await deleteCommentById(commentId);

      setDiaryComments(prev => {
        const removeCommentRecursive = (comments = []) => {
          return comments
            .filter(comment => comment.id !== commentId)
            .map(comment => ({
              ...comment,
              replies: comment.replies
                ? removeCommentRecursive(comment.replies)
                : [],
            }));
        };

        const updatedState = {};

        Object.keys(prev).forEach(diaryId => {
          const diaryEntry = prev[diaryId];

          updatedState[diaryId] = {
            ...diaryEntry,
            all: removeCommentRecursive(diaryEntry.all),
          };
        });

        return updatedState;
      });

      showMessage(t('comment_deleted'));
    } catch (err) {
      showMessage(err.message || t('failed_delete_comment'), 'error');
    } finally {
      handleCommentDeleteCancel();
    }
  };

  // Handle media click - FIXED: Pass thumbnails for videos
  const handleMediaClick = (url, type = 'image') => {
    const diary = diaryList.find(d =>
      d.images?.includes(url) || d.videos?.includes(url)
    );

    if (!diary) {
      const singleMedia = { src: url, type, thumbnail: '' };
      openMediaViewer([singleMedia], 0);
      return;
    }

    const images = diary.images.map(src => ({ src, type: 'image' }));
    const videos = diary.videos.map((src, i) => ({
      src,
      type: 'video',
      thumbnail: diary.video_thumbnails?.[i] || '',
    }));

    const mediaList = [...images, ...videos];
    const index = mediaList.findIndex(m => m.src === url);

    openMediaViewer(mediaList, index);
  };

  const isFriend = (authorId) =>
    friends?.some(
      f =>
        f.status === 'accepted' &&
        (f.user.id === authorId || f.friend.id === authorId)
    );

  const isRequesting = (authorId) =>
    friends?.some(
      f =>
        f.status === 'pending' &&
        (f.user.id === authorId || f.friend.id === authorId)
    );

  const isSaveDisabled = editLoading ||
    !editShareType ||
    (editShareType === 'group' && editGroupIds.length === 0) ||
    (
      (!editTitle?.trim() && !editContent?.trim() && editImages.length === 0 && editVideos.length === 0)
    );

  return (
    <Box>

      <Box
        sx={{
          width: '100%'
        }}
      >
        <Modal
          open={mediaViewerOpen}
          onClose={handleMediaViewerClose}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(0,0,0,0.95)',
            outline: 'none',
          }}
        >
          <Box
            sx={{
              position: 'relative',
              width: '100vw',
              height: '100vh',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Media */}
            {selectedMediaType === 'image' ? (
              <Box
                component="img"
                src={selectedMedia}
                alt="preview"
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <video
                src={selectedMedia}
                poster={selectedThumbnail}
                controls
                autoPlay
                style={{ maxWidth: '95%', maxHeight: '95%', objectFit: 'contain' }}
              />
            )}

            {/* Prev */}
            {currentMediaList.length > 1 && (
              <IconButton
                onClick={handlePrevMedia}
                sx={{
                  position: 'absolute',
                  left: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <ArrowBackIcon fontSize="large" />
              </IconButton>
            )}

            {/* Next */}
            {currentMediaList.length > 1 && (
              <IconButton
                onClick={handleNextMedia}
                sx={{
                  position: 'absolute',
                  right: 16,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.4)',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
                }}
              >
                <ArrowForwardIcon fontSize="large" />
              </IconButton>
            )}

            {/* Counter */}
            {currentMediaList.length > 1 && (
              <Typography
                sx={{
                  position: 'absolute',
                  bottom: 32,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  color: 'white',
                  bgcolor: 'rgba(0,0,0,0.5)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                }}
              >
                {selectedMediaIndex + 1} / {currentMediaList.length}
              </Typography>
            )}

            {/* Close */}
            <IconButton
              onClick={handleMediaViewerClose}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                bgcolor: 'rgba(0,0,0,0.4)',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Modal>

        <Snackbar
          open={snackbarOpen}
          autoHideDuration={2000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbarSeverity}
            sx={{ width: '100%' }}
          >
            {snackbarMessage}
          </Alert>
        </Snackbar>

        <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
          <DialogTitle>{t('delete_title')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('delete_diary', { title: diaryToDelete?.title })}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleteLoading}>{t('cancel')}</Button>
            <Button
              onClick={handleDeleteDiary}
              color="error"
              variant="contained"
              disabled={deleteLoading}
              startIcon={deleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              {deleteLoading ? t('deleting') : t('delete')}
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={commentDeleteDialogOpen} onClose={handleCommentDeleteCancel}>
          <DialogTitle>{t('delete_comment')}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              {t('delete_confirm')}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCommentDeleteCancel} disabled={commentDeleteLoading}>{t('cancel')}</Button>
            <Button
              onClick={() => handleDeleteComment(commentToDelete)}
              color="error"
              variant="contained"
              disabled={commentDeleteLoading}
              startIcon={commentDeleteLoading ? <CircularProgress size={20} /> : <DeleteIcon />}
            >
              {commentDeleteLoading ? t('deleting') : t('delete')}
            </Button>
          </DialogActions>
        </Dialog>

        <Menu anchorEl={menuAnchorEl} open={menuOpen} onClose={handleMenuClose}>
          <MenuItem onClick={handleEditDiaryClick}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> {t('edit')}
          </MenuItem>
          <MenuItem onClick={handleDeleteDiaryClick}>
            <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} />
            <Typography color="error">{t('delete')}</Typography>
          </MenuItem>
        </Menu>

        <Box>

          {(!diaryList || diaryList.length === 0) ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              {t('no_diaries_yet')}
            </Typography>
          ) : (
            <Box>
              {diaryList.map((diary) => {
                const combinedMedia = [
                  ...(diary.images || []).map((src) => ({
                    type: 'image',
                    src
                  })),
                  ...(diary.videos || []).map((src) => ({
                    type: 'video',
                    src,
                    thumbnail: getVideoThumbnail(src, diary)
                  }))
                ];

                const visibleMedia = combinedMedia.slice(0, 6);

                const isSaved = (diary) => diary.favorited_user_ids.includes(user.id);

                const handleSave = async (diaryId) => {
                  try {
                    setLoading(true);
                    await handleSaveDiary(diaryId);

                    setDiaryList(prev =>
                      prev.map(d =>
                        d.id === diaryId
                          ? { ...d, favorited_user_ids: [...d.favorited_user_ids, user.id] }
                          : d
                      )
                    );
                  } catch (err) {
                    console.error(err.message);
                  } finally {
                    setLoading(false);
                  }
                };

                const handleRemove = async (diaryId) => {
                  try {
                    setLoading(true);
                    await handleRemoveDiary(diaryId);

                    setDiaryList(prev =>
                      prev.map(d =>
                        d.id === diaryId
                          ? { ...d, favorited_user_ids: d.favorited_user_ids.filter(id => id !== user.id) }
                          : d
                      )
                    );
                  } catch (err) {
                    console.error(err.message);
                  } finally {
                    setLoading(false);
                  }
                };

                const handleCopyLink = (diaryId) => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/feed#diary-${diaryId}`
                  );
                  setCopyLink(`${window.location.origin}/feed#diary-${diaryId}`);
                };

                const comments = diaryComments[diary.id];
                const rootCommentsCount = diary.comments.filter(c => c.parent_id === null).length;

                return (
                  <Box key={diary.id} id={`diary-${diary.id}`} sx={{ scrollMarginTop: { xs: '80px', md: '10px' } }}>
                    <Card
                      sx={{
                        p: { xs: 1, sm: 2 },
                        width: '100%',
                        borderRadius: 3,
                        boxShadow: 0,
                        mb: 1,
                        border: isLinkedDiary(diary) ? '2px solid #faab00ff' : '1px solid #ddd',
                        backgroundColor: isLinkedDiary(diary) ? '#faab001b' : '#fff',
                        transition: 'background-color 0.3s, border 0.3s'
                      }}>
                      {/* Diary Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, }}>
                        <Box sx={{ flex: 1 }}>
                          {editingDiary === diary.id ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <TextField
                                fullWidth
                                label={t('title')}
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                disabled={editLoading}
                                size="medium"
                              />
                              <TextField
                                fullWidth
                                label={t('content')}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                disabled={editLoading}
                                multiline
                                rows={4}
                                size="medium"
                              />
                              <FormControl size="medium" fullWidth>
                                <InputLabel>{t('share_type')}</InputLabel>
                                <Select
                                  value={editShareType}
                                  label={t('share_type')}
                                  onChange={(e) => setEditShareType(e.target.value)}
                                  disabled={editLoading}
                                >
                                  <MenuItem value="public">{t('public')}</MenuItem>
                                  <MenuItem value="friends">{t('friends')}</MenuItem>
                                  <MenuItem value="personal">{t('personal')}</MenuItem>
                                  <MenuItem value="group">{t('group')}</MenuItem>
                                </Select>
                              </FormControl>
                              {editShareType === 'group' && (
                                <FormControl size="medium" fullWidth>
                                  <InputLabel>Groups</InputLabel>
                                  <Select
                                    multiple
                                    value={editGroupIds}
                                    label="Groups"
                                    onChange={(e) => setEditGroupIds(e.target.value)}
                                    disabled={editLoading}
                                  >
                                    {groups.map((group) => (
                                      <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}

                              {/* Media Upload Section for Edit */}
                              {!diary.parent && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  {/* Image Upload */}
                                  <Box>
                                    <Button
                                      variant="outlined"
                                      component="label"
                                      startIcon={<ImageIcon />}
                                      size="medium"
                                      disabled={editLoading || editImages.length >= 10}
                                      sx={{ mr: 2 }}
                                    >
                                      {t('add_images_max', { max: 10 })}
                                      <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => handleMediaUpload(e, diary.id, null, 'image')}
                                      />
                                    </Button>
                                    {editImages.length > 0 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        {editImages.length} selected
                                      </Typography>
                                    )}
                                  </Box>

                                  {/* Video Upload */}
                                  <Box>
                                    <Button
                                      variant="outlined"
                                      component="label"
                                      startIcon={<VideocamIcon />}
                                      size="medium"
                                      disabled={editLoading || editVideos.length >= 3}
                                      sx={{ mr: 2 }}
                                    >
                                      {t('add_videos_max', { max: 3 })}
                                      <input
                                        type="file"
                                        hidden
                                        multiple
                                        accept="video/*"
                                        onChange={(e) => handleMediaUpload(e, diary.id, null, 'video')}
                                      />
                                    </Button>
                                    {editVideos.length > 0 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                                        {editVideos.length} selected
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              )}

                              {/* Image Preview for Edit */}
                              {editImages.length > 0 && (
                                <Box
                                  key={`image-preview-${editImages.length}-${mediaUpdateTrigger}`}
                                  sx={{ mt: 2 }}
                                >
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    {t('images_count', { count: editImages.length, max: 10 })}
                                  </Typography>
                                  <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                                    gap: 1,
                                    mt: 1
                                  }}>
                                    {editImages.map((img, index) => (
                                      <Box
                                        key={`edit-img-${diary.id}-${index}-${img.substring(0, 20)}`}
                                        sx={{
                                          position: 'relative',
                                          borderRadius: '6px',
                                          aspectRatio: '1',
                                          '&:hover .media-overlay': {
                                            opacity: 1
                                          }
                                        }}
                                      >
                                        <img
                                          src={img}
                                          alt={`Image ${index + 1}`}
                                          style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            cursor: 'pointer',
                                            borderRadius: 8
                                          }}
                                          onClick={() => handleMediaClick(img, 'image')}
                                        />

                                        <IconButton
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeMedia(index, diary.id, null, 'image');
                                          }}
                                          sx={{
                                            position: 'absolute',
                                            top: -5,
                                            right: -5,
                                            bgcolor: 'error.main',
                                            color: 'white',
                                            width: 24,
                                            height: 24,
                                            '&:hover': {
                                              bgcolor: 'error.dark'
                                            }
                                          }}
                                          size="small"
                                        >
                                          <CloseIcon sx={{ fontSize: 16 }} />
                                        </IconButton>
                                        <IconButton
                                          onClick={() => handleMediaClick(img, 'image')}
                                          sx={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            bgcolor: 'primary.main',
                                            color: 'white',
                                            width: 24,
                                            height: 24,
                                            '&:hover': {
                                              bgcolor: 'primary.dark'
                                            }
                                          }}
                                          size="small"
                                        >
                                          <ZoomInIcon sx={{ fontSize: 16 }} />
                                        </IconButton>

                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            top: 4,
                                            left: 4,
                                            bgcolor: 'rgba(0, 0, 0, 0.6)',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: 20,
                                            height: 20,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '0.7rem',
                                            fontWeight: 600
                                          }}
                                        >
                                          {index + 1}
                                        </Box>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              )}

                              {editVideos.length > 0 && (
                                <Box
                                  key={`video-preview-${editVideos.length}-${mediaUpdateTrigger}`}
                                  sx={{ mt: 2 }}
                                >
                                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    {t('videos_count', { count: editVideos.length, max: 3 })}
                                  </Typography>
                                  <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                    gap: 1.5,
                                    mt: 1
                                  }}>
                                    {editVideos.map((vid, index) => {
                                      const isExistingVideo = vid.startsWith('http');
                                      const thumbnail = isExistingVideo ? getVideoThumbnail(vid, diary) : null;

                                      return (
                                        <Box
                                          key={`edit-vid-${diary.id}-${index}`}
                                          sx={{
                                            position: 'relative',
                                            borderRadius: '8px',
                                            aspectRatio: '16/9',
                                            bgcolor: '#000',
                                            cursor: 'pointer',
                                            '&:hover .media-overlay': {
                                              opacity: 1
                                            },
                                          }}
                                        >
                                          {thumbnail ? (
                                            <Box
                                              sx={{
                                                width: '100%',
                                                height: '100%',
                                                position: 'relative'
                                              }}
                                              onClick={() => handleMediaClick(vid, 'video')}
                                            >
                                              <img
                                                src={thumbnail}
                                                alt={`Video ${index + 1}`}
                                                style={{
                                                  width: '100%',
                                                  height: '100%',
                                                  objectFit: 'cover'
                                                }}
                                                onError={(e) => {
                                                  e.target.style.display = 'none';
                                                }}
                                              />
                                              <Box
                                                sx={{
                                                  position: 'absolute',
                                                  top: '50%',
                                                  left: '50%',
                                                  transform: 'translate(-50%, -50%)',
                                                  width: 40,
                                                  height: 40,
                                                  borderRadius: '50%',
                                                  bgcolor: 'rgba(0,0,0,0.6)',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center',
                                                  transition: 'transform 0.2s',
                                                  '&:hover': {
                                                    transform: 'translate(-50%, -50%) scale(1.1)',
                                                    bgcolor: 'rgba(0,0,0,0.8)'
                                                  }
                                                }}
                                              >
                                                <PlayArrowIcon sx={{ fontSize: 24, color: 'white' }} />
                                              </Box>
                                            </Box>
                                          ) : (
                                            <Box
                                              sx={{
                                                width: '100%',
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'relative'
                                              }}
                                              onClick={() => handleMediaClick(vid, 'video')}
                                            >
                                              <PlayArrowIcon sx={{ fontSize: 40, color: 'white', zIndex: 1 }} />
                                              <Typography
                                                variant="caption"
                                                sx={{
                                                  position: 'absolute',
                                                  bottom: 8,
                                                  left: 8,
                                                  color: 'white',
                                                  bgcolor: 'rgba(0,0,0,0.5)',
                                                  px: 1,
                                                  borderRadius: 1,
                                                  zIndex: 2
                                                }}
                                              >
                                                No thumbnail
                                              </Typography>
                                            </Box>
                                          )}

                                          <Box className="media-overlay"
                                            sx={{
                                              position: 'absolute',
                                              top: -5,
                                              right: -5,
                                              transition: 'opacity 0.2s',
                                              zIndex: 1300
                                            }}>
                                            <IconButton
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                removeMedia(index, diary.id, null, 'video');
                                              }}
                                              sx={{
                                                bgcolor: 'error.main',
                                                color: 'white',
                                                width: 24,
                                                height: 24,
                                                '&:hover': {
                                                  bgcolor: 'error.dark'
                                                }
                                              }}
                                              size="small"
                                            >
                                              <CloseIcon sx={{ fontSize: 16 }} />
                                            </IconButton>
                                          </Box>

                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: 4,
                                              left: 4,
                                              bgcolor: isExistingVideo ? 'rgba(0, 100, 0, 0.7)' : 'rgba(0, 0, 150, 0.7)',
                                              color: 'white',
                                              px: 0.75,
                                              py: 0.25,
                                              borderRadius: 1,
                                              fontSize: '0.65rem',
                                              fontWeight: 500,
                                              zIndex: 2
                                            }}
                                          >
                                            {isExistingVideo ? t('uploaded') : t('new')}
                                          </Box>
                                          
                                          <Box
                                            sx={{
                                              position: 'absolute',
                                              top: 4,
                                              right: 4,
                                              bgcolor: 'rgba(0, 0, 0, 0.6)',
                                              color: 'white',
                                              borderRadius: '50%',
                                              width: 20,
                                              height: 20,
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              fontSize: '0.7rem',
                                              fontWeight: 600,
                                              zIndex: 2
                                            }}
                                          >
                                            {index + 1}
                                          </Box>
                                        </Box>
                                      );
                                    })}
                                  </Box>
                                </Box>
                              )}

                              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                                <Button
                                  variant="outlined"
                                  onClick={handleEditCancel}
                                  disabled={editLoading}
                                  size="medium"
                                >
                                  {t('cancel')}
                                </Button>
                                <Button
                                  variant="contained"
                                  onClick={() => handleEditSave(diary.id)}
                                  disabled={isSaveDisabled}
                                  size="medium"
                                >
                                  {editLoading ? t('saving...') : t('save')}
                                </Button>
                              </Box>
                            </Box>
                          ) : (
                            <>
                              {/* Author Info with Avatar */}
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar
                                    src={diary.author?.avatar_url}
                                    alt={diary.author?.username}
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      fontSize: '1.1rem',
                                    }}
                                  >
                                    {diary.author?.username?.charAt(0)?.toUpperCase() || 'U'}
                                  </Avatar>

                                  <Box>
                                    <Typography variant="body1" fontWeight="600" color="green">
                                      {diary.author?.username || 'Unknown User'}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {formatCambodiaDate(diary.created_at)}
                                    </Typography>
                                  </Box>
                                  {/* Friend Request / Status Chips */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                    {profile && diary.author?.id !== profile.id && (
                                      <>
                                        {isFriend(diary.author.id) ? (
                                          <Chip
                                            label="Friend"
                                            color="success"
                                            size="small"
                                            variant="outlined"
                                            sx={{ borderRadius: '16px' }}
                                          />
                                        ) : isRequesting(diary.author.id) ? (
                                          <Chip
                                            label="Requesting"
                                            color="warning"
                                            size="small"
                                            variant="outlined"
                                            sx={{ borderRadius: '16px' }}
                                          />
                                        ) : (
                                          <Tooltip title={`Add ${diary.author.username} as friend`}>
                                            <Button
                                              size="small"
                                              onClick={() => handleSendFriendRequest(diary.author.id)}
                                              disabled={sendingRequests.has(diary.author.id)}
                                              sx={{
                                                borderRadius: 2,
                                                textTransform: 'none',
                                                fontWeight: 500,
                                                py: 0.5,
                                                minWidth: 0
                                              }}
                                            >
                                              {sendingRequests.has(diary.author.id) ? <CircularProgress sx={{ fontSize: 22 }} /> : <PersonAddIcon sx={{ fontSize: 22 }} />}
                                            </Button>
                                          </Tooltip>
                                        )}
                                      </>
                                    )}

                                    {profile && diary.author?.id === profile.id && (
                                      <Chip
                                        label={t('you')}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ fontSize: '0.75rem', height: 26 }}
                                      />
                                    )}
                                  </Box>

                                </Box>

                              </Box>

                            </>
                          )}
                        </Box>

                        {editingDiary !== diary.id && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Chip
                              label={diary.share_type}
                              size="small"
                              color={
                                diary.share_type === 'public' ? 'primary' :
                                  diary.share_type === 'group' ? 'success' :
                                    diary.share_type === 'friends' ? 'secondary' : 'default'
                              }
                            />
                            {profile && diary.author?.id === profile.id && (
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, diary)}
                                sx={{ color: 'text.secondary' }}
                              >
                                <MoreVertIcon />
                              </IconButton>
                            )}
                          </Box>
                        )}
                      </Box>

                      {editingDiary !== diary.id && (
                        <Box>
                          {combinedMedia.length > 0 && (
                            <Box sx={{ mb: 1.5 }}>
                              <Box
                                sx={{
                                  display: 'grid',
                                  gap: 0.5,
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  gridTemplateColumns: (() => {
                                    switch (visibleMedia.length) {
                                      case 1:
                                        return '1fr';
                                      case 2:
                                        return '1fr 1fr';
                                      case 3:
                                        return '2fr 1fr';
                                      default:
                                        return '1fr 1fr';
                                    }
                                  })(),
                                  gridTemplateRows:
                                    visibleMedia.length === 3 ? '1fr 1fr' : 'auto',
                                }}
                              >
                                {visibleMedia.slice(0, 4).map((media, index) => {
                                  const isLarge =
                                    visibleMedia.length === 3 && index === 0;

                                  return (
                                    <Box
                                      key={index}
                                      onClick={() => handleMediaClick(media.src, media.type)}
                                      sx={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        bgcolor: '#000',
                                        transition: 'transform 0.3s',
                                        '&:hover': { transform: 'scale(1.03)' },
                                        aspectRatio:
                                          visibleMedia.length === 1
                                            ? '16 / 9'
                                            : '1 / 1',
                                        gridRow: isLarge ? 'span 2' : 'auto',
                                      }}
                                    >
                                      {/* Image */}
                                      {media.type === 'image' && (
                                        <Box
                                          component="img"
                                          src={media.src}
                                          alt="feed img"
                                          sx={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                          }}
                                        />
                                      )}

                                      {/* Video */}
                                      {media.type === 'video' && (
                                        <>
                                          <Box
                                            component="img"
                                            src={media.thumbnail}
                                            alt=""
                                            sx={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                            }}
                                          />

                                          {/* Play icon */}
                                          <PlayArrowIcon
                                            sx={{
                                              position: 'absolute',
                                              top: '50%',
                                              left: '50%',
                                              transform: 'translate(-50%, -50%)',
                                              color: '#fff',
                                              fontSize: 48,
                                              opacity: 0.9,
                                            }}
                                          />
                                        </>
                                      )}

                                      {/* +X overlay */}
                                      {index === 3 && combinedMedia.length > 4 && (
                                        <Box
                                          sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            bgcolor: 'rgba(0,0,0,0.55)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#fff',
                                            fontSize: 32,
                                            fontWeight: 700,
                                          }}
                                        >
                                          +{combinedMedia.length - 4}
                                        </Box>
                                      )}
                                    </Box>
                                  );
                                })}
                              </Box>

                            </Box>
                          )}

                          {diary.title && (
                            <Typography
                              sx={{
                                mt: 2,
                                fontSize: 18,
                                lineHeight: 1.5,
                              }}
                            >
                              {diary.title}
                            </Typography>
                          )}

                          <DiaryCard content={diary.content} />
                          <ParentDiaryComponent parent={diary.parent} friends={friends} profile={profile} sendingRequests={sendingRequests}/>

                          {!diary.parent && (
                            <Divider />
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: { md: 2 } }}>
                            <Tooltip title='Like this post'>
                              <Button
                                onClick={() => handleLikeDiary(diary.id)}
                                size="medium"
                                sx={{
                                  minWidth: 40,
                                  padding: isMobile ? 1 : undefined,
                                  color: likedDiaries.has(diary.id) ? 'error.main' : 'inherit',
                                  fontWeight: likedDiaries.has(diary.id) ? 'bold' : 'normal',
                                  transition: 'color 0.2s, transform 0.2s',
                                  justifyContent: 'center',
                                  '&:hover': { transform: 'scale(1.05)', backgroundColor: 'transparent' },
                                  display: 'flex',
                                  gap: 1,
                                  alignItems: 'center'
                                }}
                              >
                                {isMobile ? (
                                  likedDiaries.has(diary.id)
                                    ? <Favorite color="error" />
                                    : <FavoriteBorder />
                                ) : (
                                  <>
                                    {likedDiaries.has(diary.id)
                                      ? <Favorite color="error" />
                                      : <FavoriteBorder />
                                    }
                                    {t('like')}
                                  </>
                                )}
                                <Typography ml={0.5}>
                                  {diaryLikes[diary.id] > 0 ? diaryLikes[diary.id] : ''}
                                </Typography>
                              </Button>
                            </Tooltip>

                            <Tooltip title={`Have something to say?`}>
                              <Button
                                onClick={() => handleExpandDiary(diary.id)}
                                size="medium"
                                sx={{ minWidth: 40, justifyContent: 'center', '&:hover': { backgroundColor: 'transparent' } }}
                              >
                                {isMobile ? (
                                  <ChatBubbleOutlineOutlinedIcon />
                                ) : (
                                  <>
                                    <ChatBubbleOutlineOutlinedIcon />
                                    <Typography ml={1}>
                                      {t('comment')}
                                    </Typography>
                                  </>
                                )}
                                <Typography ml={1}>
                                  {diary.comments.length ? (diary.comments.length) : ('')}
                                </Typography>
                              </Button>
                            </Tooltip>

                            <Tooltip title={`Share this post`}>
                              <Button
                                size="medium"
                                sx={{ minWidth: 40, justifyContent: 'center', '&:hover': { backgroundColor: 'transparent' } }}
                                onClick={() => {
                                  handleCopyLink(diary.id);
                                  setSelectedDiaryId(diary.id);
                                  setSharePopup(true);
                                }}
                              >
                                {isMobile ? <ShareOutlinedIcon sx={{ mb: 0.5 }} /> : <> <ShareOutlinedIcon sx={{ mb: 0.5 }} /> <Typography ml={1}>{t('share')}</Typography> </>}
                                <Typography ml={1}>

                                </Typography>
                              </Button>
                            </Tooltip>

                            <Tooltip title={isSaved(diary) ? "Remove from saved" : "Save this post"}>
                              {isSaved(diary) ? (
                                <Button
                                  size="medium"
                                  color="success"
                                  disabled={loading}
                                  onClick={() => handleRemove(diary.id)}
                                  sx={{ minWidth: 40, '&:hover': { backgroundColor: 'transparent' } }}
                                >
                                  <TurnedInIcon />
                                  {!isMobile && <Typography ml={1}>{t('saved')}</Typography>}
                                  <Typography ml={1}>
                                    {diary.favorited_user_ids.length || ''}
                                  </Typography>
                                </Button>
                              ) : (
                                <Button
                                  size="medium"
                                  disabled={loading}
                                  onClick={() => handleSave(diary.id)}
                                  sx={{ minWidth: 40, '&:hover': { backgroundColor: 'transparent' } }}
                                >
                                  <TurnedInNotOutlinedIcon />
                                  {!isMobile && <Typography ml={1}>{t('save')}</Typography>}
                                  <Typography ml={1}>
                                    {diary.favorited_user_ids.length || ''}
                                  </Typography>
                                </Button>
                              )}
                            </Tooltip>

                          </Box>

                          <Collapse in={expandedDiary === diary.id}>
                            <Box sx={{ mt: 2 }}>
                              <Box sx={{
                                position: 'relative',
                                border: 1,
                                borderRadius: '8px',
                              }}>
                                <TextField
                                  fullWidth
                                  placeholder={t('placeholder')}
                                  value={commentTexts[diary.id] || ''}
                                  onChange={(e) => setCommentTexts(prev => ({ ...prev, [diary.id]: e.target.value }))}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleAddComment(diary.id);
                                    }
                                  }}
                                  disabled={commentLoading[diary.id]}
                                  multiline
                                  rows={2}
                                  sx={{
                                    '& .MuiOutlinedInput-root': {
                                      fontSize: '0.95rem',
                                      '& fieldset': {
                                        border: 'none',
                                      },
                                      '&:hover fieldset': {
                                        border: 'none',
                                      },
                                      '&.Mui-focused fieldset': {
                                        border: 'none',
                                      },
                                    }
                                  }}
                                  onFocus={toggleShowButton}
                                />
                                <Divider />
                                {showButton && (
                                  <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 1,
                                    right: 5,
                                    bottom: 5,
                                    p: 1,
                                  }}>

                                    <Tooltip title='Comment as image?'>
                                      <Button
                                        component='label'
                                        sx={{
                                          minWidth: 0
                                        }}
                                      >
                                        <ImageIcon />
                                        <input
                                          type="file"
                                          hidden
                                          multiple
                                          accept="image/*"
                                          onChange={(e) => handleMediaUpload(e, diary.id)}
                                        />
                                      </Button>
                                    </Tooltip>
                                    <Box
                                      sx={{
                                        display: 'flex',
                                        gap: 1,
                                        alignItems: 'center'
                                      }}
                                    >
                                      <Tooltip title='Tag your friend?'>
                                        <Button
                                          sx={{
                                            minWidth: 0
                                          }}
                                        >
                                          <AlternateEmailIcon />
                                        </Button>
                                      </Tooltip>
                                      <Button
                                        variant="contained"
                                        onClick={() => handleAddComment(diary.id)}
                                        disabled={!commentTexts[diary.id]?.trim() || commentLoading[diary.id]}
                                        sx={{
                                          px: 3,
                                          borderRadius: '8px',
                                          fontWeight: 500
                                        }}
                                        size="medium"
                                      >
                                        {commentLoading[diary.id] ? (
                                          <CircularProgress size={24} color="inherit" />
                                        ) : (
                                          t('send')
                                        )}
                                      </Button>
                                    </Box>
                                  </Box>
                                )}

                                {selectedCommentImages[diary.id]?.length > 0 && (
                                  <Box sx={{
                                    p: 1,
                                    borderRadius: 0,
                                    borderTop: '1px solid',
                                    borderColor: 'divider'
                                  }}>
                                    <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                      Selected images ({selectedCommentImages[diary.id].length})
                                    </Typography>
                                    <Box sx={{
                                      display: 'flex',
                                      flexWrap: 'wrap',
                                      gap: 0.5
                                    }}>
                                      {selectedCommentImages[diary.id].map((img, index) => (
                                        <Box key={index}
                                          sx={{
                                            position: 'relative',
                                            width: 50,
                                            height: 50,
                                          }}
                                        >
                                          <img
                                            src={img}
                                            alt={`Preview ${index}`}
                                            style={{
                                              width: '100%',
                                              height: '100%',
                                              objectFit: 'cover',
                                              borderRadius: 4,
                                            }}
                                          />
                                          <IconButton
                                            size="small"
                                            onClick={() => removeMedia(index, null, diary.id, 'image')}
                                            sx={{
                                              position: 'absolute',
                                              top: -4,
                                              right: -4,
                                              bgcolor: 'error.main',
                                              color: 'white',
                                              width: 20,
                                              height: 20,
                                              '&:hover': {
                                                bgcolor: 'error.dark'
                                              },
                                            }}
                                          >
                                            <CloseIcon sx={{ fontSize: 12 }} />
                                          </IconButton>
                                        </Box>
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              </Box>

                              <Divider textAlign="left" sx={{ py: 2, color: 'primary.main' }}>Comments {diary.comments.length ? (diary.comments.length) : ('')}</Divider>

                              {diaryComments[diary.id]?.all?.length > 0 ? (
                                <Box>
                                  {diaryComments[diary.id]?.all
                                    ?.slice(0, diaryComments[diary.id].visibleCount)
                                    .map(comment => (
                                      <CommentItemWithActions
                                        key={comment.id}
                                        comment={comment}
                                        diaryId={diary.id}
                                        profile={profile}
                                        handleImageUpload={handleMediaUpload}
                                        selectedCommentImages={selectedCommentImages}
                                        setSelectedCommentImages={setSelectedCommentImages}
                                        onEditComment={handleEditComment}
                                        onDeleteComment={handleCommentDeleteClick}
                                        replyingTo={replyingTo}
                                        setReplyingTo={setReplyingTo}
                                        onMediaClick={handleMediaClick}
                                      />
                                    ))}

                                  {rootCommentsCount > comments.visibleCount && (
                                    <Box>
                                      <Button
                                        size="small"
                                        onClick={() => handleLoadMoreComments(diary.id)}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                        }}
                                        startIcon={<ExpandMoreSharpIcon />}
                                        color='success'
                                      >

                                        <Typography>
                                          See more comments ({rootCommentsCount - comments.visibleCount})
                                        </Typography>
                                      </Button>
                                    </Box>
                                  )}

                                </Box>
                              ) : (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                  align="center"
                                  sx={{
                                    py: 2,
                                    fontStyle: 'italic'
                                  }}
                                >
                                  {t('no_comments')}
                                </Typography>
                              )}
                            </Box>
                          </Collapse>
                        </Box>
                      )}
                    </Card>
                  </Box>
                );
              })}
            </Box>
          )}

        </Box>
      </Box>

      <ShareComponent
        open={sharePopup}
        onClose={() => setSharePopup(false)}
        friends={friends}
        copyLink={copyLink}
        showMessage={showMessage}
        profile={profile}
        diaryId={selectedDiaryId}
        groups={groups}
        onDataUpdate={onDataUpdate}
      />

    </Box>
  );
};

export default ProfileDiary;