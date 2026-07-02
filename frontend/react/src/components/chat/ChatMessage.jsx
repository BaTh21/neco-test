import {
  Close as CloseIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
  Done as DoneIcon,
  Edit as EditIcon,
  Image as ImageIcon,
  PushPin,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatCambodiaTime } from '../../utils/dateUtils';
import ShortcutIcon from '@mui/icons-material/Shortcut';
import CallIcon from '@mui/icons-material/Call';
import ReplyIcon from '@mui/icons-material/Reply';

import EmojiButton from '../EmojiButton';
import { VoiceMessagePlayer } from '../group/VoiceMessagePlayer';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PreviewDialog from '../dialogs/ImageDialog';

const ChatMessage = ({
  message,
  isMine,
  onUpdate,
  onDelete,
  onForward,
  onReply,
  userId,
  onReplace,
  onReact,
  onPin,
  isPinned,
  onScrollToMessage,
  onStartCall
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const { t } = useTranslation();

  const reactions = [
    { emoji: "👍", value: "like" },
    { emoji: "❤️", value: "love" },
    { emoji: "😂", value: "laugh" },
    { emoji: "😮", value: "wow" },
    { emoji: "😢", value: "sad" },
    { emoji: "😡", value: "angry" },
  ];

  const handleMenu = (e) => {
    if (message.is_temp || message.sendin) return;
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleEdit = async () => {
    if (!editText.trim() || editText === message.content || !onUpdate) {
      setEditing(false);
      handleClose();
      return;
    }

    setIsEditing(true);

    try {
      await onUpdate(message.id, editText, message.is_temp);
      setEditing(false);
      handleClose();
    } catch (err) {
      console.error('Edit error:', err);
    }

    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditText(message.content);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (onDelete) {
      try {
        await onDelete(message.id, message.is_temp);
      } catch (err) {
        console.error('Delete error:', err);
      }
    }
    handleClose();
  };

  const showMenu = true;

  const handleImageError = () => {
    setImageError(true);
  };

  const handleDownloadMedia = async (e) => {
    e.stopPropagation();

    try {
      const response = await fetch(message.content);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;

      let fileName = message.content.split("/").pop()?.split("?")[0];

      if (!fileName) {
        fileName = `chat-file-${message.id}-${Date.now()}`;
      }

      a.download = fileName;

      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  const handleViewFullImage = (e) => {
    e?.stopPropagation();
    setImageModalOpen(true);
  };

  const retryImageLoad = () => {
    setImageError(false);
  };

  const renderImageContent = () => (
    <Box sx={{ mb: 1, position: 'relative' }}>
      {imageError && (
        <Box
          sx={{
            width: '100%',
            height: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'grey.100',
            borderRadius: '8px',
            border: '1px solid primary.main',
            flexDirection: 'column',
            gap: 1,
            textAlign: isMine ? 'right' : 'left',
            direction: isMine ? 'rtl' : 'ltr',
          }}
        >
          <ImageIcon sx={{ color: 'grey.400', fontSize: 40 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            Failed to load image
          </Typography>
          <Button size="small" variant="outlined" onClick={retryImageLoad}>
            Retry
          </Button>
        </Box>
      )}

      {!imageError && (
        <>
          <img
            src={message.content}
            alt="Chat image"
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: 200,
              borderRadius: '8px',
              cursor: 'pointer',
              objectFit: 'cover',
            }}
            onClick={handleMenu}
          />

          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 0.5,
              opacity: 0,
              transition: 'opacity 0.2s',
            }}
            className="image-actions"
          >
            <IconButton
              size="small"
              onClick={handleViewFullImage}
              sx={{
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
              }}
            >
              <RemoveRedEyeIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDownloadMedia}
              sx={{
                bgcolor: 'rgba(0,0,0,0.7)',
                color: 'white',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' },
              }}
            >
              <SaveAltIcon fontSize="small" />
            </IconButton>
          </Box>
        </>
      )}
    </Box>
  );

  const renderVoiceContent = () => {

    return (
      <VoiceMessagePlayer
        url={message.content}
        isOwn={isMine}
      />

    );
  };

  const renderCallMessage = () => {
    return (
      <Box
        sx={{
          bgcolor: isMine ? 'primary.main' : 'white',
          color: isMine ? 'white' : 'text.primary',
          p: 2,
          borderRadius: 3,
          boxShadow: 1,
          wordBreak: 'break-word',
          transition: 'all 0.2s',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            wordBreak: 'break-word',
            lineHeight: 1.4,
            fontSize: '0.9rem',
            color: isMine ? 'white' : 'text.primary',
          }}
        >
          {message.content}
        </Typography>

        <Button
          variant="outlined"
          size="small"
          sx={{
            width: '100%',
            mt: 1,
            color: isMine ? 'white' : 'primary.dark',
            borderColor: isMine ? 'white' : 'primary.dark',
            '&:hover': {
              borderColor: isMine ? 'white' : 'primary.dark',
              backgroundColor: isMine ? 'rgba(255,255,255,0.1)' : undefined
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            onStartCall();
          }}
        >
          <CallIcon
            sx={{
              fontSize: 18,
              mr: 0.5
            }}
          />
          Call Back
        </Button>
      </Box>
    );
  };

  const renderVideoContent = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const videoRef = useRef(null);

    const handlePlay = () => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    };

    return (
      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          overflow: 'hidden',
          width: '100%',
          maxWidth: 200,
          bgcolor: 'black',
        }}
      >
        <video
          ref={videoRef}
          controls={isPlaying}
          style={{ width: '100%', display: 'block' }}
          onEnded={() => setIsPlaying(false)}
        >
          <source src={message.content} type="video/mp4" />
          Your browser does not support the video tag.
        </video>

        {!isPlaying && (
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handlePlay();
            }}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              bgcolor: 'rgba(0,0,0,0.6)',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
              borderRadius: '50%',
              width: 60,
              height: 60,
              color: 'white',
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 40 }} />
          </IconButton>
        )}
      </Box>
    );
  };

  const renderFileContent = () => {
    const fileName = message.content
      ? message.content.split('/').pop()
      : 'Download File';

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          bgcolor: isMine ? 'primary.main' : 'grey.300',
          color: isMine ? 'white' : 'black',
          borderRadius: 2,
          cursor: 'pointer',
          maxWidth: { xs: 200, sm: 400 },
        }}
      >

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'white',
            padding: 1,
            borderRadius: '50%',
            width: 40,
            height: 40,
            mr: 0.5
          }}
        >
          <InsertDriveFileIcon sx={{ mr: 1, color: isMine ? 'primary.main' : 'grey' }} />
        </Box>
        <Typography variant="body2" noWrap onClick={() => window.open(message.content, '_blank')}
          sx={{
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
              borderBottomColor: 'red'
            },
          }}
        >
          {fileName}
        </Typography>
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        alignItems: 'flex-end',
        mb: 1,
        position: 'relative',

        ...(isPinned && {
          '&::before': {
            content: '"📌"',
            position: 'absolute',
            top: -6,
            left: isMine ? 'auto' : -25,
            right: isMine ? 0 : 'auto',
            zIndex: 1000
          },
        }),
      }}
      data-message-id={message.id}
      data-is-unread={!isMine && !message.is_read && !message.is_temp ? "true" : "false"}
      data-is-friend={!isMine ? "true" : "false"}
      data-sender-id={message.sender_id}
    >

      {!isMine && (
        <Avatar
          src={message?.sender_avatar_url}
          sx={{
            width: 32,
            height: 32,
            mr: 1,
            mt: 'auto',
            fontSize: '0.8rem',
            fontWeight: 'bold',
          }}
        >
          {message.sender_username.charAt(0).toUpperCase() ?? 'P'}
        </Avatar>
      )}

      <Box sx={{ maxWidth: '70%', display: 'flex', flexDirection: 'column' }}>
        {!isMine && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1 }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', fontWeight: 'bold', mr: 1 }}
            >
              {message.sender_username}
            </Typography>
          </Box>
        )}

        {editing ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              p: 1.5,
              borderRadius: 3,
              bgcolor: 'background.paper',
              boxShadow: 1,
            }}
          >
            {/* Text input */}
            <TextField
              size="small"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              multiline
              maxRows={4}
              autoFocus
              placeholder={t('edit_message')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleEdit();
                } else if (e.key === 'Escape') {
                  handleCancelEdit();
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.95rem',
                  borderRadius: 2,
                  bgcolor: 'grey.50',
                  '& fieldset': {
                    borderColor: 'divider',
                  },
                  '&:hover fieldset': {
                    borderColor: 'text.secondary',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'primary.main',
                    borderWidth: 1,
                  },
                },
              }}
            />

            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <EmojiButton
                onSelect={(emoji) => setEditText((prev) => prev + emoji)}
                placement="bottom-start"
                size="small"
                width={300}
                height={350}
              />
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: 1,
                }}
              >
                <Button
                  size="small"
                  onClick={handleCancelEdit}
                  color="inherit"
                >
                  {t('cancel')}
                </Button>

                <Button
                  size="small"
                  variant="contained"
                  onClick={handleEdit}
                  disabled={isEditing}
                >
                  {isEditing ? t('saving') : t('save')}
                </Button>
              </Box>
            </Box>
          </Box>

        ) : (
          <Box sx={{ position: 'relative', width: '100%' }}>
            <Box
              className="message-bubble"
              onClick={handleMenu}
            >
              {message.is_forwarded && (
                <Box
                  sx={{
                    bgcolor: "#e8f0fe",
                    py: 1,
                    px: 3,
                    borderRadius: 1,
                    display: 'flex',
                    gap: 1,
                    maxHeight: '10vh',
                    maxWidth: 250,
                    overflow: 'hidden',
                    borderLeft: "3px solid #1a73e8",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    Forwarded from {message.forwarded_from_id !== userId ?
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.2,
                          alightItems: 'center'
                        }}
                      >
                        <Avatar
                          src={message.original_sender_avatar}
                          alt={message.original_sender || "author image"}
                          sx={{
                            width: 14,
                            height: 14,
                            mt: 0.3,
                            fontSize: 8
                          }}
                        >{message.original_sender.charAt(0).toUpperCase() || "P"}</Avatar>
                        {message.original_sender}
                      </Box>
                      :
                      (" you")}
                  </Typography>
                </Box>
              )}

              {message.reply_to && (
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    onScrollToMessage(message.reply_to.id);
                  }}
                  sx={{
                    bgcolor: "#e8f0fe",
                    py: 1,
                    px: 3,
                    borderRadius: 1,
                    display: 'flex',
                    gap: 1,
                    maxHeight: '10vh',
                    maxWidth: 250,
                    overflow: 'hidden',
                  }}
                >
                  <Typography variant="body2" sx={{ fontSize: 12, mt: 0.3 }}>
                    Reply to
                  </Typography>
                  <Box
                    sx={{
                      opacity: 0.6,
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {message.reply_to.sender_username}
                    </Typography>

                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      {message.reply_to.message_type === "text" && (
                        message.reply_to.content
                      )}
                      {message.reply_to.message_type === "image" && (
                        "Image"
                      )}
                      {message.reply_to.message_type === "voice" && (
                        "Voice message"
                      )}
                      {message.reply_to.message_type === "file" && (
                        "File"
                      )}
                      {message.reply_to.message_type === "system" && (
                        "Call"
                      )}
                      {message.reply_to.message_type === "video" && (
                        "Video"
                      )}
                    </Typography>

                  </Box>
                </Box>
              )}

              {message.message_type === 'image' ? (
                renderImageContent()
              ) : message.message_type === 'voice' ? (
                renderVoiceContent()
              ) : message.message_type === 'video' ? (
                renderVideoContent()
              ) : message.message_type === 'file' ? (
                renderFileContent()
              ) : message.message_type === 'system' ? (
                renderCallMessage()
              ) : (
                <Box
                  sx={{
                    bgcolor: isMine ? 'primary.main' : 'white',
                    p: 2,
                    borderRadius: 3,
                    boxShadow: 1,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: isMine ? 'white' : 'text.primary',
                      wordBreak: 'break-word',
                      transition: 'all 0.2s',
                      textAlign: isMine ? 'right' : 'left',
                    }}
                  >
                    {message.content}
                  </Typography>
                </Box>
              )}

              <Box sx={{
                display: 'flex',
                justifyContent: isMine ? 'flex-end' : 'flex-start',
                alignItems: 'center',
                mt: 0.5,
                gap: 0.5,
                alignItems: 'center'
              }}>
                {message.reactions?.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.5, mr: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(
                      message.reactions.reduce((acc, r) => {
                        acc[r.emoji] = (acc[r.emoji] || 0) + (r.count || 1);
                        return acc;
                      }, {})
                    ).map(([reaction, count]) => {
                      const reactedByMe = message.my_reaction === reaction;

                      return (
                        <Tooltip
                          key={reaction}
                          title={
                            reactedByMe
                              ? count > 1
                                ? `You and ${count - 1} others`
                                : `You reacted`
                              : `${count} reactions`
                          }
                        >
                          <Chip
                            label={`${reaction} ${count}`}
                            size="small"
                            color={reactedByMe ? "primary" : "default"}
                            variant={reactedByMe ? "filled" : "outlined"}
                            sx={{
                              height: 22,
                              fontSize: '0.7rem',
                              fontWeight: reactedByMe ? 600 : 400,
                            }}
                          />
                        </Tooltip>
                      );
                    })}
                  </Box>
                )}
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.7,
                    fontSize: '0.7rem',
                    lineHeight: 1,
                    color: 'text.secondary',
                    mt: 0.25
                  }}
                >
                  {message.edited_at && message.edited_at !== message.created_at && 'edited at '}
                  {formatCambodiaTime(message.created_at)}
                </Typography>
                {isMine && (
                  message.is_temp || message.sending ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: 'block',
                        textAlign: isMine ? 'right' : 'left',
                        mt: 0.5,
                        mx: 1
                      }}
                    > • Sending...
                    </Typography>
                  ) : message.is_read ? (
                    <DoneAllIcon
                      sx={{
                        color: 'primary.main',
                        fontSize: 16
                      }}
                    />
                  ) : (
                    <DoneIcon
                      sx={{
                        color: 'text.secondary',
                        fontSize: 16
                      }}
                    />
                  )
                )}
              </Box>

            </Box>
          </Box>
        )}

        {showMenu && (
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
            anchorOrigin={{ vertical: 'top', horizontal: isMine ? 'left' : 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: isMine ? 'right' : 'left' }}
            PaperProps={{
              sx: {
                borderRadius: "12px",
                overflow: "visible",
                mt: -10,
                position: "relative",
                width: 200
              },
            }}
          >
            {(() => {
              const menuItems = [];

              menuItems.push(
                <Box
                  sx={{
                    position: "absolute",
                    top: -55,
                    left: "50%",
                    transform: "translateX(-50%)",
                    bgcolor: "background.paper",
                    borderRadius: "999px",
                    px: 1,
                    py: 0.5,
                    display: "flex",
                    gap: 0.5,
                    boxShadow: 3,
                    zIndex: 1,
                    whiteSpace: "nowrap",
                  }}
                  key="reaction"
                >
                  {reactions.map((reaction) => {
                    const reactedByMe =
                      reaction.emoji === message.my_reaction;

                    return (
                      <IconButton
                        key={reaction.value}
                        size="small"
                        onClick={() => {
                          onReact(message.id, reaction.emoji)
                          handleClose();
                        }}
                        sx={{
                          bgcolor: reactedByMe ? "primary.main" : "transparent",
                          borderColor: "primary.main",
                          '&:hover': {
                            bgcolor: reactedByMe ? "primary.light" : "transparent",
                          }
                        }}
                      >
                        <span style={{ fontSize: 22 }}>
                          {reaction.emoji}
                        </span>
                      </IconButton>
                    );
                  })}
                </Box>
              );

              if (message.message_type !== 'system') {
                menuItems.push(
                  <MenuItem key="pin" onClick={() => { onPin(message.id); handleClose(); }}>
                    <PushPin fontSize="small" sx={{ mr: 1.5 }} />
                    {isPinned ? 'Unpin' : 'Pin'}
                  </MenuItem>
                );
              }

              menuItems.push(
                <MenuItem key="reply" onClick={() => { onReply(); handleClose(); }}>
                  <ReplyIcon fontSize="small" sx={{ mr: 1.5 }} />
                  Reply
                </MenuItem>
              );

              if (message.message_type !== 'system') {
                menuItems.push(
                  <MenuItem key="forward" onClick={() => { onForward(); handleClose(); }}>
                    <ShortcutIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {t('forward')}
                  </MenuItem>,

                );
              }

              if (isMine) {
                if (message.message_type === 'text') {
                  menuItems.push(
                    <MenuItem
                      key="edit"
                      onClick={() => {
                        setEditing(true);
                        setEditText(message.content);
                        handleClose();
                      }}
                    >
                      <EditIcon fontSize="small" sx={{ mr: 1.5 }} />
                      {t('edit')}
                    </MenuItem>
                  );
                }
              }

              if (
                ['image', 'video', 'file'].includes(message.message_type)
              ) {
                menuItems.push(
                  <MenuItem key="view-full" onClick={handleViewFullImage}>
                    <RemoveRedEyeIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {t('view_full_image')}
                  </MenuItem>,
                  <MenuItem key="download" onClick={handleDownloadMedia}>
                    <SaveAltIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {t('download_image')}
                  </MenuItem>,
                );
              }

              if (
                isMine &&
                ['image', 'video', 'file'].includes(message.message_type)
              ) {
                menuItems.push(
                  <MenuItem
                    key="replace"
                    onClick={() => {
                      onReplace();
                      handleClose();
                    }}
                  >
                    <RestartAltIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {t('replace')}
                  </MenuItem>
                );
              }

              if (isMine) {
                menuItems.push(
                  <MenuItem
                    key="delete"
                    onClick={handleDelete}
                    sx={{ color: 'error.main' }}
                  >
                    <DeleteIcon fontSize="small" sx={{ mr: 1.5 }} />
                    {t('delete')}
                  </MenuItem>
                );
              }
              return menuItems;
            })()}
          </Menu>
        )}
      </Box>
      <PreviewDialog
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        url={message.content}
        type={message.message_type}
      />

    </Box>
  );
};

export default ChatMessage;