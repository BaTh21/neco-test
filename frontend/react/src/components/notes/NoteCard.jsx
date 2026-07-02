import {
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Group as GroupIcon,
  MoreVert as MoreIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
  Public as PublicIcon,
  Share as ShareIcon,
  Unarchive as UnarchiveIcon,
} from '@mui/icons-material';
import CloseIcon from '@mui/icons-material/Close';

import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Slide,
  AppBar,
  Toolbar
} from '@mui/material';
import BookmarkRemoveIcon from '@mui/icons-material/BookmarkRemove';
import HttpsIcon from '@mui/icons-material/Https';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

const NoteCard = ({ note, onEdit, onDelete, onTogglePin, onToggleArchive, onShare, onLeaveNote }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);

  const { t } = useTranslation();

  const { auth } = useAuth();
  const currentUser = auth.user;
  const currentUserId = currentUser?.id;

  const isOwner = note.user.id === currentUserId;

  let isSharedWithEdit = false;

  if (!isOwner) {
    if (note.can_edit !== undefined) {
      isSharedWithEdit = note.can_edit;
    } else if (note.shared_with && Array.isArray(note.shared_with)) {
      isSharedWithEdit = note.shared_with.some(share => {
        if (typeof share === "object") {
          return share.user_id === currentUserId && share.can_edit;
        } else {
          return share === currentUserId;
        }
      });
    } else if (note.permissions && note.permissions.can_edit !== undefined) {
      isSharedWithEdit = note.permissions.can_edit;
    }
  }

  const handleMenuOpen = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (e) => {
    e.stopPropagation();
    setAnchorEl(null)
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (isOwner || isSharedWithEdit) {
      onEdit(note);
    } else {
      alert(t("edit_not_allowed"));
    }
    handleMenuClose();
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = (e) => {
    e.stopPropagation();
    onDelete(note.id);
    setDeleteDialogOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleTogglePin = (e) => {
    e.stopPropagation();
    onTogglePin(note.id);
    handleMenuClose();
  };

  const handleToggleArchive = (e) => {
    e.stopPropagation();
    if (!isOwner) {
      alert(t("owner_only_archive"));
      handleMenuClose();
      return;
    }
    onToggleArchive(note.id);
    handleMenuClose();
  };

  const handleShare = (e) => {
    e.stopPropagation();
    if (!isOwner) {
      alert(t("owner_only_share"));
      handleMenuClose();
      return;
    }
    onShare(note);
    handleMenuClose();
  };

  const handleLeaveClick = (e) => {
    e.stopPropagation();
    onLeaveNote(note.id);
    handleMenuClose();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const getEditLabel = () => {
    if (isOwner) return t("edit");
    if (isSharedWithEdit) return t("edit_shared");
    return t("view_only");
  };

  return (
    <>
      <Card
        onClick={() => setViewOpen(true)}
        sx={{
          cursor: "pointer",
          height: "100%",
          width: '100%',
          backgroundColor: note.color || "#ffffff",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          transition: "all 0.2s",
          "&:hover": { boxShadow: 3, transform: "translateY(-2px)" },
          position: "relative",
          width: { md: 300, xs: 300 },
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent sx={{ p: 2, pb: 1 }}>

          {/* Sharing Indicators */}
          <Box sx={{ top: 0, display: "flex", justifyContent: 'space-between', flexDirection: 'row-reverse', gap: 0.5, width: '100%', py: 0.25 }}>

            {note.share_type && (
              <Box
                sx={{
                  display: 'flex',
                }}
              >
                {note.share_type === "public" && (
                  <PublicIcon
                    fontSize="small"
                    color="primary"
                    titleAccess={t("public_note")}
                  />
                )}

                {note.share_type === "private" && (
                  <HttpsIcon
                    fontSize="small"
                    color="primary"
                    titleAccess={t("public_note")}
                  />
                )}

                {note.share_type === "shared" && note.shared_with?.length > 0 && (
                  <GroupIcon
                    fontSize="small"
                    color="primary"
                    titleAccess={t("shared_with_count", { count: note.shared_with.length })}
                  />
                )}

                {(isHovered || note.is_pinned) && (
                  <IconButton size="small" onClick={handleTogglePin} sx={{ mt: -0.5 }}>
                    {note.is_pinned ? <PinIcon fontSize="small" /> : <PinOutlinedIcon fontSize="small" />}
                  </IconButton>
                )}

                <IconButton size="small" onClick={handleMenuOpen} sx={{ mt: -0.5 }}>
                  <MoreIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {!isOwner && (
              <Chip
                label={isSharedWithEdit ? t("can_edit") : t("view_only")}
                size="small"
                color={isSharedWithEdit ? "primary" : "secondary"}
                sx={{
                  height: 20,
                  fontSize: "0.6rem",
                  opacity: 0.75
                }}
              />
            )}

          </Box>

          <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1 }}>
            <Typography
              variant="h6"
              sx={{
                flexGrow: 1,
                fontWeight: 600,
                lineHeight: 1.3,
                mr: 1,
                pr: 2
              }}
            >
              {note.title}
            </Typography>

          </Box>

          {note.content && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                mb: 2,
                lineHeight: 1.4,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                height: 100
              }}
            >
              {note.content.length > 150
                ? `${note.content.substring(0, 150)}...`
                : note.content}
            </Typography>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>

            {isOwner ? (
              <Typography variant="caption">
                You
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Typography variant="caption">From: </Typography>
                <Avatar
                  src={note?.user?.avatar_url}
                  alt={note.user.username}
                  sx={{
                    width: 18,
                    height: 18
                  }}
                >
                  {note.user.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="caption">{note.user.username}</Typography>
                </Box>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              {note.updated_at
                ? `Edited at ${formatDate(note.updated_at)}`
                : formatDate(note.created_at)}
            </Typography>

          </Box>
        </CardContent>

        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>

          {(isSharedWithEdit || isOwner) && (
            <MenuItem onClick={handleEdit}>
              <EditIcon fontSize="small" sx={{ mr: 1 }} />
              {getEditLabel()}
            </MenuItem>
          )}

          {isOwner && (
            <MenuItem onClick={handleTogglePin}>
              {note.is_pinned ? (
                <>
                  <PinOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                  {t("unpin")}
                </>
              ) : (
                <>
                  <PinIcon fontSize="small" sx={{ mr: 1 }} />
                  {t("pinned")}
                </>
              )}
            </MenuItem>
          )}

          {isOwner && (
            <MenuItem onClick={handleToggleArchive}>
              {note.is_archived ? (
                <>
                  <UnarchiveIcon fontSize="small" sx={{ mr: 1 }} />
                  {t("unarchive")}
                </>
              ) : (
                <>
                  <ArchiveIcon fontSize="small" sx={{ mr: 1 }} />
                  {t("archive")}
                </>
              )}
            </MenuItem>
          )}

          {isOwner && (
            <MenuItem onClick={handleShare}>
              <ShareIcon fontSize="small" sx={{ mr: 1 }} />
              {t("share")}
            </MenuItem>
          )}

          {isOwner && (
            <MenuItem onClick={handleDeleteClick} sx={{ color: "error.main" }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
              {t("delete")}
            </MenuItem>
          )}

          {!isOwner && (
            <MenuItem onClick={handleLeaveClick} sx={{ color: "error.main" }}>
              <BookmarkRemoveIcon fontSize="small" sx={{ mr: 1 }} />
              Remove
            </MenuItem>
          )}
        </Menu>
      </Card>

      <Dialog
        fullScreen
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        TransitionComponent={Slide}
      >
        <AppBar sx={{ position: "relative", bgcolor: note.color || "primary.main", color: 'black' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setViewOpen(false)}>
              <CloseIcon />
            </IconButton>

            <Typography sx={{ ml: 2, flex: 1 }} variant="h6">
              {note.title}
            </Typography>

            {(isOwner || isSharedWithEdit) && (
              <Button
                color="inherit"
                onClick={() => {
                  setViewOpen(false);
                  onEdit(note);
                }}
              >
                {t("edit")}
              </Button>
            )}
          </Toolbar>
        </AppBar>

        <Box sx={{ p: 3, maxWidth: 900, mx: "auto" }}>
          {/* Meta */}
          <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            {isOwner ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Avatar
                  src={note?.user?.avatar_url}
                  alt={note.user.username}
                  sx={{
                    width: 35,
                    height: 35
                  }}
                >
                  {note.user.username.charAt(0).toUpperCase()}
                </Avatar>
                <Typography variant="caption">
                  You
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Typography variant="caption">From: </Typography>
                <Avatar
                  src={note?.user?.avatar_url}
                  alt={note.user.username}
                  sx={{
                    width: 18,
                    height: 18
                  }}
                >
                  {note.user.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="caption">{note.user.username}</Typography>
                </Box>
              </Box>
            )}
            <Typography variant="caption" color="text.secondary">
              {note.updated_at
                ? `Edited at ${formatDate(note.updated_at)}`
                : `Created at ${formatDate(note.created_at)}`}
            </Typography>

            {!isOwner && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                • {isSharedWithEdit ? t("can_edit") : t("view_only")}
              </Typography>
            )}
          </Box>

          {/* Content */}
          <Typography
            variant="body1"
            sx={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.7,
              fontSize: "1rem"
            }}
          >
            {note.content || t("empty_note")}
          </Typography>
        </Box>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle sx={{ bgcolor: "error.main", color: "white" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DeleteIcon />
            {t("delete_note")}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ py: 3 }}>
          <DialogContentText sx={{ color: "text.primary" }}>
            {t("delete_note_description")}
          </DialogContentText>

          <Card variant="outlined" sx={{ bgcolor: "grey.50", borderColor: "grey.300", p: 2, mb: 2 }}>
            <Typography variant="subtitle1" fontWeight="600" gutterBottom>
              {note.title}
            </Typography>

            {note.content && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {note.content}
              </Typography>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              {t("last_updated")} {formatDate(note.updated_at)}
            </Typography>
          </Card>

          <DialogContentText sx={{ color: "error.main", fontWeight: 500, display: "flex", alignItems: "center", gap: 1 }}>
            <DeleteIcon fontSize="small" />
            {t("irreversible_action")}
          </DialogContentText>
        </DialogContent>

        <DialogActions sx={{ py: 2, px: 3, gap: 1 }}>
          <Button onClick={handleDeleteCancel} variant="outlined">
            {t("cancel")}
          </Button>

          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
          >
            {t("delete_note_button")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NoteCard;
