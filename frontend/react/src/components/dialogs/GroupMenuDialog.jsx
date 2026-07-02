import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Modal,
  List,
  ListItemIcon,
  Divider,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  Button,
  Tab,
  Tabs
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { leaveGroupById, uploadCover, getGroupCover, deleteCoverById, deleteGroupById, getGroupMessage } from '../../services/api';
import UpdateGroupDialog from './UpdateGroupDialog';
import InviteMemberComponent from './InviteMemberComponent';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteDialog from './DeleteDialog';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import GroupMemberComponent from '../group/GroupMemberComponent';
import GroupsIcon from '@mui/icons-material/Groups';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import PreviewDialog from './ImageDialog';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import { VoiceMessagePlayer } from '../group/VoiceMessagePlayer';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ImageIcon from '@mui/icons-material/Image';

function GroupMenuDialog({ open, onClose, group, onSuccess, members, currentChatId }) {
  const [updatePopup, setUpdatePopup] = useState(false);
  const [invitePopup, setInvitePopup] = useState(false);
  const [covers, setCovers] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deletePopup, setDeletePopup] = useState(false);
  const router = useNavigate();
  const { auth } = useAuth();
  const user = auth?.user;
  const [leavePopup, setLeavePopup] = useState(false);
  const [viewMember, setViewMember] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [imageError, setImageError] = useState(false); PlayArrowIcon
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [anchorEl, setAnchorEl] = useState(null);

  const TABS = ["all", "image", "voice", "video", "file"];
  const [selectedTab, setSelectedTab] = useState("all");

  const handleChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const filteredMessages =
    selectedTab === "all"
      ? messages
      : messages.filter((m) => m.message_type === selectedTab);

  const handleMoreClick = (event) => {
    setAnchorEl(event.currentTarget);
  }

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  useEffect(() => {
    if (open && group?.id) {
      setOffset(0);
      setHasMore(true);

      fetchCovers();
      fetchMessages(0, false);
    }
  }, [open, group?.id]);

  const fetchCovers = async () => {
    try {
      const data = await getGroupCover(group.id);

      if (Array.isArray(data)) {
        const sortedCovers = data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setCovers(sortedCovers);
        setCurrentIndex(0);
      } else {
        setCovers([]);
      }
    } catch (error) {
      console.error('Failed to fetch covers:', error);
    }
  };

  const fetchMessages = async (currentOffset = 0, append = false) => {
    try {
      setLoadingMore(true);

      const data = await getGroupMessage(
        group.id,
        limit,
        currentOffset,
        true
      );

      if (data.length < limit) {
        setHasMore(false);
      }

      setMessages((prev) =>
        append ? [...prev, ...data] : data
      );
    } catch (error) {
      console.error("Failed to fetch messages:", error);

      if (!append) {
        setMessages([]);
      }
    } finally {
      setLoadingMore(false);
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;

    const isNearBottom =
      scrollHeight - scrollTop - clientHeight < 100;

    if (isNearBottom && !loadingMore && hasMore) {
      const nextOffset = offset + limit;

      setOffset(nextOffset);
      fetchMessages(nextOffset, true);
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await leaveGroupById(group.id);
      onSuccess();
      router("/dashboard");
    } catch (error) {
      console.error('Failed to leave group', error);
    }
  };

  const handleCoverUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setCovers((prev) => [{ url: previewUrl, uploading: true }, ...prev]);
    setCurrentIndex(0);
    setLoading(true);

    try {
      await uploadCover(group.id, file);
      setSuccess('Group cover uploaded!');
      await fetchCovers();
      onSuccess?.();
    } catch (error) {
      console.error('Upload failed:', error);
      setError(`Failed: ${error}` || "Maxed size is 3MB");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCover = async (coverId) => {
    if (!coverId) return;
    setLoading(true);
    try {
      await deleteCoverById(coverId);
      setSuccess('Cover deleted!');
      await fetchCovers();
      onSuccess?.();
    } catch (error) {
      console.error('Delete failed:', error);
      setError('Failed to delete cover');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroupById(group.id);
      setSuccess("Group has been deleted");
      router("/dashboard");
    } catch (error) {
      setError('Failed to delete group');
    }
  }

  const handleImageError = () => {
    setImageError(true);
  };

  const retryImageLoad = () => {
    setImageError(false);
  };

  const renderImageContent = (message) => (
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
            src={message.file_url}
            alt="Chat image"
            onError={handleImageError}
            style={{
              maxWidth: '100%',
              maxHeight: 200,
              borderRadius: '8px',
              cursor: 'pointer',
              objectFit: 'cover',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMessage(message);
            }}
          />
        </>
      )}
    </Box>
  );

  const renderVoiceContent = (message) => {

    return (
      <VoiceMessagePlayer
        url={message.voice_url}
      />

    );
  };

  const renderVideoContent = (message) => {

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
          <source src={message.file_url} type="video/mp4" />
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

  const renderFileContent = (message, isMine) => {
    const fileName = message.file_url
      ? message.file_url.split('/').pop()
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

  const nextSlide = () => {
    if (covers.length > 0) setCurrentIndex((prev) => (prev + 1) % covers.length);
  };

  const prevSlide = () => {
    if (covers.length > 0) setCurrentIndex((prev) => (prev - 1 + covers.length) % covers.length);
  };

  const currentCover = covers[currentIndex];

  return (
    <>
      <Modal open={open} onClose={onClose}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: { xs: '90%', md: 380 },
            bgcolor: 'background.paper',
            borderRadius: 3,
            boxShadow: 24,
            p: 3,
            height: "80vh",
            overflowY: "auto",
          }}
          onScroll={handleScroll}
        >

          {error && (
            <Typography variant="body2" color="error.main">
              {error}
            </Typography>
          )}
          {success && (
            <Typography variant="body2" color="success">
              {success}
            </Typography>
          )}
          <List component="nav">
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                borderRadius: 2,
                overflow: 'hidden',
                mb: 1.5,
                py: 1,
                bgcolor: 'grey.100',
                display: 'flex',
                justifyContent: 'center'
              }}
            >
              {covers.length > 0 ? (
                <>
                  <Avatar
                    key={currentCover?.id}
                    src={currentCover?.url}
                    alt="group cover"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 8,
                      transition: 'transform 0.5s ease, opacity 0.5s ease',
                    }}
                  />

                  {/* Hover Overlay */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      opacity: 0,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 1,
                      borderRadius: 2,
                      transition: 'opacity 0.3s ease',
                      '&:hover': { opacity: 1 },
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={30} sx={{ color: 'white' }} />
                    ) : (
                      <>
                        {group.creator_id == user.id && (
                          <>
                            <Tooltip title="Upload cover" arrow>
                              <IconButton
                                sx={{ color: 'white' }}
                                onClick={() => document.getElementById('coverUploadInput').click()}
                              >
                                <CloudUploadIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete cover" arrow>
                              <IconButton
                                sx={{ color: 'white' }}
                                onClick={() => handleDeleteCover(currentCover?.id)}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </>
                    )}
                  </Box>

                  {/* Navigation buttons (always visible) */}
                  {covers.length > 1 && (
                    <>
                      <IconButton
                        onClick={prevSlide}
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: 8,
                          color: 'white',
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <ArrowBackIosNewIcon fontSize="small" />
                      </IconButton>

                      <IconButton
                        onClick={nextSlide}
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          right: 8,
                          color: 'white',
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          '&:hover': { backgroundColor: 'rgba(0,0,0,0.6)' },
                          transform: 'translateY(-50%)',
                        }}
                      >
                        <ArrowForwardIosIcon fontSize="small" />
                      </IconButton>

                      {/* Slide counter */}
                      <Typography
                        variant="caption"
                        sx={{
                          position: 'absolute',
                          bottom: 6,
                          right: 10,
                          backgroundColor: 'rgba(0,0,0,0.5)',
                          color: 'white',
                          px: 1,
                          py: 0.2,
                          borderRadius: 1,
                          fontSize: 12,
                        }}
                      >
                        {currentIndex + 1} / {covers.length}
                      </Typography>
                    </>
                  )}
                </>
              ) : (
                <Box
                  sx={{
                    width: 100,
                    height: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    color: 'text.secondary',
                    border: 1,
                    borderRadius: '50%'
                  }}
                >
                  <Typography variant="body2">No cover</Typography>
                  {group.creator_id == user.id && (
                    <Tooltip title="Upload cover" arrow>
                      <IconButton
                        onClick={() => document.getElementById('coverUploadInput').click()}
                        sx={{ color: 'primary.main' }}
                      >
                        <CloudUploadIcon />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              )}

              <input
                id="coverUploadInput"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />
            </Box>

            {/* Group name */}
            <Typography
              variant="h6"
              align="center"
              sx={{ fontWeight: 600 }}
            >
              {group.name}
            </Typography>
            <Typography align="center" variant="body2">{members.length > 0 ? (`${members.length} Members`) : ''}</Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack
              direction="row"
              justifyContent="space-evenly"
              sx={{ py: 2 }}
            >
              <Box textAlign="center">
                <IconButton
                  color="primary"
                  sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                  onClick={() => setInvitePopup(true)}
                >
                  <PersonAddAltRoundedIcon />
                </IconButton>
                <Typography variant="caption" display="block">
                  Invite
                </Typography>
              </Box>

              <Box textAlign="center">
                <IconButton
                  color="primary"
                  sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                  onClick={() => {
                    setSelectedCreatorId(group.creator_id);
                    setViewMember(true);
                    onClose();
                  }}
                >
                  <GroupsIcon />
                </IconButton>
                <Typography variant="caption" display="block">
                  Members
                </Typography>
              </Box>

              {group.creator_id === user.id && (
                <Box textAlign="center">
                  <IconButton
                    color="primary"
                    sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                    onClick={() => setUpdatePopup(true)}
                  >
                    <EditIcon />
                  </IconButton>
                  <Typography variant="caption" display="block">
                    Edit
                  </Typography>
                </Box>
              )}

              <Box textAlign="center">
                <IconButton
                  color="primary"
                  sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                  // onClick={() => setLeavePopup(true)}
                  onClick={handleMoreClick}
                >
                  <MoreHorizIcon />
                </IconButton>
                <Typography variant="caption" display="block">
                  More
                </Typography>
              </Box>
            </Stack>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleCloseMenu}
            >
              {group.creator_id === user.id && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    setUpdatePopup(true);
                  }}
                >
                  <ListItemIcon>
                    <EditIcon fontSize="small" />
                  </ListItemIcon>
                  Edit Group
                </MenuItem>
              )}

              {group.creator_id === user.id && (
                <MenuItem
                  onClick={() => {
                    handleCloseMenu();
                    setDeletePopup(true);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon>
                    <DeleteIcon fontSize="small" color="error" />
                  </ListItemIcon>
                  Delete Group
                </MenuItem>
              )}

              <MenuItem
                onClick={() => {
                  handleCloseMenu();
                  setLeavePopup(true);
                }}
                sx={{ color: 'error.main' }}
              >
                <ListItemIcon>
                  <ExitToAppIcon fontSize="small" color="error" />
                </ListItemIcon>
                Leave Group
              </MenuItem>
            </Menu>

            <Divider sx={{ mt: 1.5 }} />
          </List>
          <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={selectedTab}
              onChange={handleChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              {TABS.map((tab) => (
                <Tab
                  key={tab}
                  value={tab}
                  label={tab.toUpperCase()}
                />
              ))}
            </Tabs>
          </Box>
          <br />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1
            }}
          >
            {filteredMessages.length > 0 &&
              filteredMessages.map((message, index) => {

                const isOwn = message.sender?.id === currentChatId;
                return (
                  <div key={index}>
                    {message.message_type === "image" && message.file_url && (
                      renderImageContent(message)
                    )}
                    {message.message_type === "voice" && message.voice_url && (
                      renderVoiceContent(message)
                    )}
                    {message.message_type === "video" && message.file_url && (
                      renderVideoContent(message)
                    )}
                    {message.message_type === "file" && message.file_url && (
                      renderFileContent(message, isOwn)
                    )}
                  </div>
                );
              })}
            {loadingMore && <p>Loading...</p>}
          </Box>
        </Box>
      </Modal>

      <UpdateGroupDialog
        open={updatePopup}
        onClose={() => setUpdatePopup(false)}
        onSuccess={onSuccess}
        group={group}
      />
      <InviteMemberComponent
        open={invitePopup}
        onClose={() => setInvitePopup(false)}
        onSuccess={onSuccess}
        group={group}
      />
      <DeleteDialog
        open={deletePopup}
        onClose={() => setDeletePopup(false)}
        onSuccess={onSuccess}
        title="Delete group"
        description="Are you sure want to delete this group?"
        onConfirm={handleDeleteGroup}
      />
      <DeleteDialog
        open={leavePopup}
        onClose={() => setLeavePopup(false)}
        onSuccess={onSuccess}
        title="Leave group"
        tag='Leave'
        description="Are you sure want to leave this group?"
        onConfirm={handleLeaveGroup}
      />
      <GroupMemberComponent
        open={viewMember}
        onClose={() => setViewMember(false)}
        members={members}
        creatorId={selectedCreatorId}
        group={group}
      />

      {selectedMessage && (
        <PreviewDialog
          open={selectedMessage}
          onClose={() => setSelectedMessage(null)}
          url={selectedMessage.file_url}
          type={selectedMessage.message_type}
        />
      )}
    </>
  );
}

export default GroupMenuDialog;
