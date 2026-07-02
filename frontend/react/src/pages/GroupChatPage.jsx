import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon
} from '@mui/icons-material';
import {
  AppBar,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Menu, MenuItem,
  TextField,
  Toolbar,
  Typography,
  Drawer,
  Tooltip,
  Chip
} from '@mui/material';
import {
  EmojiEmotions as EmojiEmotionsIcon,
  InsertEmoticon as InsertEmoticonIcon,
} from '@mui/icons-material';
import { useEffect, useRef, useState, useCallback } from 'react';
import GroupMenuDialog from '../components/dialogs/GroupMenuDialog';
import { useAuth } from '../context/AuthContext';
import { getGroupMembers, getGroupMessage, getGroupById, uploadFileMessage, editGroupFileMessage, uploadVoiceMessage, makeReaction, pinMessage, unpinMessage } from '../services/api';
import { formatCambodiaTime } from '../utils/dateUtils';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import PreviewDialog from '../components/dialogs/ImageDialog';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import ReplyIcon from '@mui/icons-material/Reply';
import ShortcutIcon from '@mui/icons-material/Shortcut';
import RemoveRedEyeIcon from '@mui/icons-material/RemoveRedEye';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import SeenMessageListDialog from '../components/dialogs/SeenMessageListDialog';
import GroupListComponent from '../components/chat/GroupListComponent';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import { VoiceMessagePlayer } from '../components/group/VoiceMessagePlayer';
import VoiceRecorder from '../components/group/VoiceRecorder';
import EmojiPicker from '../components/EmojiPicker';
import ModeCommentRoundedIcon from '@mui/icons-material/ModeCommentRounded';
import useTypewriter from '../hooks/useTypewriter';
import DeleteDialog from '../components/dialogs/DeleteDialog';
import EmojiButton from '../components/EmojiButton';
import { useGroupWebsocket } from '../hooks/useGroupWebsocket';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DoneIcon from '@mui/icons-material/Done';
import CloseIcon from '@mui/icons-material/Close';
import PushPinIcon from "@mui/icons-material/PushPin";

import DescriptionIcon from "@mui/icons-material/Description";
import ImageIcon from "@mui/icons-material/Image";
import MicIcon from "@mui/icons-material/Mic";
import { keyframes } from "@mui/system";
import AddIcon from '@mui/icons-material/Add';

const GroupChatPage = ({ groupId, toggleGroupList, chats, setError, currentChatId, currentChatType, setCallRequest, send }) => {

  const { auth } = useAuth();
  const user = auth?.user;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const WS_BASE_URI = import.meta.env.VITE_API_URL.replace(/^http/, "ws");
  const token = localStorage.getItem('accessToken');
  const [open, setOpen] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [secondAnchorEl, setSecondAnchorEl] = useState(null);
  const [activeMessageId, setActiveMessageId] = useState(null);
  const [file, setFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const activeMessage = messages.find((m) => m.id === activeMessageId);
  const [replyTo, setReplyTo] = useState(null);
  const messagesContainerRef = useRef(null);
  const [openSeenMessage, setOpenSeenMessage] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const messagesRef = useRef([]);
  const generateTempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  const [recording, setRecording] = useState(false);
  const [showTextbox, setShowTextbox] = useState(false);
  const emojiButtonRef = useRef(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const firstLoadRef = useRef(true);
  const canLoadMoreRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const [isError, setIsError] = useState(false);
  const [files, setFiles] = useState([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  const [sending, setSending] = useState(false);

  const LIMIT = 30;
  const pageRef = useRef(0);

  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fileInputRef = useRef(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef(null);

  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

  const ALLOWED_EXTENSIONS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".pdf",
    ".doc",
    ".docx",
    ".txt",
    ".zip",
    ".mp4",
    ".mov",
    ".mkv"
  ];

  const reactions = [
    { emoji: "👍", value: "like" },
    { emoji: "❤️", value: "love" },
    { emoji: "😂", value: "laugh" },
    { emoji: "😮", value: "wow" },
    { emoji: "😢", value: "sad" },
    { emoji: "😡", value: "angry" },
  ];

  const reactionMap = {
    like: "👍",
    love: "❤️",
    laugh: "😂",
    wow: "😮",
    sad: "😢",
    angry: "😡",
  };

  const getMessageType = (file) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (["png", "jpg", "jpeg", "webp", "gif"].includes(ext)) {
      return "image";
    }

    if (["mp4", "mov", "mkv"].includes(ext)) {
      return "video";
    }

    return "file";
  };

  const mergeMessages = (existingMessages, newMessages) => {
    const allMessages = [...newMessages, ...existingMessages];
    const map = new Map();

    allMessages.forEach(msg => {
      const id = msg.id ?? msg.temp_id;
      if (!map.has(id)) map.set(id, msg);
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.created_at || a.temp_created_at) - new Date(b.created_at || b.temp_created_at)
    );
  };

  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    setLoadingMore(true);

    const prevScrollHeight = container.scrollHeight;

    try {
      const offset = pageRef.current * LIMIT;
      const data = await getGroupMessage(groupId, LIMIT, offset);

      if (data.length < LIMIT) setHasMore(false);

      setMessages(prev => {
        const merged = mergeMessages(prev, data);

        requestAnimationFrame(() => {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - prevScrollHeight;
        });

        return merged;
      });

      pageRef.current += 1;

    } catch (err) {
      console.error("Failed to load more messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, groupId]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (firstLoadRef.current) {
      container.scrollTop = container.scrollHeight;
      firstLoadRef.current = false;
    }
  }, [messages]);

  const toggleDrawer = () => {
    setOpenDrawer(prev => !prev);
  };

  const DrawerBox = (
    <Box
      sx={{
        width: 350
      }}
      role="presentation"
    >
      <GroupListComponent
        onClose={() => setOpenDrawer(false)}
        message={selectedMessage}
        onForward={(msg, targets) => {
          handleForwardMessage(msg, targets);
          setOpenDrawer(false);
        }}
        chats={chats}
        currentChatId={currentChatId}
        currentChatType={currentChatType}
      />
    </Box>
  )

  const handleForwardMessage = (message, targets) => {
    if (
      !wsRef.current ||
      (!targets?.users?.length && !targets?.groups?.length)
    ) return;

    sendWs(({
      action: "forward",
      message_id: message.id,
      targets: {
        users: targets.users || [],
        groups: targets.groups || []
      }
    }));
  };

  const scrollToBottom = (smooth = true) => {
    const end = messagesEndRef.current;

    if (end) {
      requestAnimationFrame(() => {
        end.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "end" });
      });
    }
  };

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container || firstLoadRef.current) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    const isNearBottom = distanceFromBottom < 150;

    if (isNearBottom) {
      scrollToBottom(true);
    }
  }, [messages]);

  useEffect(() => {
    firstLoadRef.current = true;
    canLoadMoreRef.current = false;
    userHasScrolledRef.current = false;
    lastScrollTopRef.current = 0;
  }, [groupId]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const openSecondMenu = (event, messageId) => {
    if (sending) return;

    setSecondAnchorEl(event.currentTarget);
    setActiveMessageId(messageId);
  };

  const closeSecondMenu = () => {
    setSecondAnchorEl(null);
    setActiveMessageId(null);
  };

  const handleSave = () => {
    onEdit(editingMessageId, editedContent);
    setEditingMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
  };

  const onEdit = (messageId, content) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const editPayload = {
      action: "edit",
      message_id: messageId,
      new_content: content,
    };

    sendWs(editPayload);
    setEditingMessageId(null);
  };

  const onDelete = async (activeMessageId) => {
    if (!activeMessageId) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const payload = {
      action: "delete",
      message_id: activeMessageId,
    };

    try {
      setDeleting(true);
      closeSecondMenu();
      sendWs(payload);
      setMessages(prev => prev.filter(msg => msg.id !== activeMessageId));
    } catch (err) {
      console.error("Failed to send delete via WS:", err);
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchGroupData();
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        getGroupMessage(groupId),
        getGroupMembers(groupId),
        getGroupById(groupId)
      ]);

      const messagesData = results[0].status === 'fulfilled' ? results[0].value : [];
      const membersData = results[1].status === 'fulfilled' ? results[1].value : [];
      const groupData = results[2].status === 'fulfilled' ? results[2].value : { id: groupId, name: `Group ${groupId}` };

      messagesData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      setMessages(messagesData);
      setMembers(membersData);
      setGroup({
        ...groupData,
        members: membersData
      });

      pageRef.current = Math.ceil(messagesData.length / LIMIT);
      setHasMore(messagesData.length >= LIMIT);

    } catch (error) {
      console.error('Failed to fetch group data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (!loadingMore && hasMore && container.scrollTop <= 50) {
      loadMoreMessages();
    }
  }, [loadingMore, hasMore, loadMoreMessages]);

  const handleWSMessage = async (event) => {
    const data = JSON.parse(event.data);
    console.log('WS received:', data);

    switch (data.action) {

      case "edit":
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.message_id
              ? { ...msg, content: data.new_content, updated_at: data.updated_at }
              : msg
          )
        );
        break;

      case "delete":
        setMessages(prev => prev.filter(msg => msg.id !== data.message_id));
        break;

      case "file_upload":
        setMessages(prev => {
          const updated = [...prev];

          if (data.temp_id) {
            const tempIndex = updated.findIndex(msg => msg.id === data.temp_id);
            if (tempIndex !== -1) {
              updated[tempIndex] = {
                ...updated[tempIndex],
                id: data.id,
                file_url: data.file_url,
                message_type: data.message_type,
                created_at: data.created_at,
                is_temp: false,
                uploading: false,
                progress: 100
              };
              return updated;
            }
          }

          if (updated.some(msg => msg.id === data.id)) {
            return updated;
          }

          updated.push({
            ...data,
            is_temp: false,
            uploading: false,
            progress: 100
          });

          requestAnimationFrame(scrollToBottom);
          return updated;
        });
        break;

      case "file_update":
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.message_id
              ? {
                ...msg,
                file_url: data.file_url,
                message_type: data.message_type,
                updated_at: data.updated_at,
                uploading: false,
                progress: 100
              }
              : msg
          )
        );
        break;

      case "new_message":
        setMessages(prev => {
          if (prev.some(msg => msg.id === data.id)) return prev;
          requestAnimationFrame(scrollToBottom);
          return [...prev, data];
        });
        break;

      case "message":
        setMessages((prev) => {
          const updated = [...prev];

          if (data.temp_id) {
            const tempIndex = updated.findIndex(msg => msg.id === data.temp_id);
            if (tempIndex !== -1) {
              updated[tempIndex] = { ...updated[tempIndex], ...data, is_temp: false };
              return updated;
            }
          }

          if (updated.some(msg => msg.id === data.id)) {
            return updated;
          }

          updated.push(data);
          requestAnimationFrame(scrollToBottom);
          return updated;
        });
        break;
      case "messages_read":
        setMessages(prev =>
          prev.map(msg => {
            if (!data.message_ids.includes(msg.id)) {
              return msg;
            }

            const existing = msg.seen_by || [];

            if (existing.some(u => u.id === data.user.id)) {
              return msg;
            }

            return {
              ...msg,
              seen_by: [...existing, data.user]
            };
          })
        );
        break;
      case "message_reaction":
        setMessages(prev =>
          prev.map(msg =>
            msg.id === data.message_id
              ? {
                ...msg,
                reaction_summary: data.reaction_summary,
                my_reaction: data.my_reaction
              }
              : msg
          )
        );
        break;

      case "message_pinned":
        setGroup(prev => ({
          ...prev,
          pinned_message: {
            "id": data.message_id,
            "content": data.content,
            "message_type": data.message_type,
            "pinned_by_id": data.pinned_by_id,
            "pinned_by": data.pinned_by.username,
            "pinned_at": data.pinned_at,
          },
        }));
        break;

      case "message_unpinned":
        setGroup(prev => ({
          ...prev,
          pinned_message: null,
        }));
        break;

      default:
        break;
    }

  };

  const wsRef = useGroupWebsocket({ groupId, token, WS_BASE_URI });

  useEffect(() => {
    if (!wsRef.current) return;

    const handleMessage = (event) => {
      JSON.parse(event.data);
      handleWSMessage(event);
    };

    wsRef.current.addEventListener("message", handleMessage);

    return () => {
      wsRef.current?.removeEventListener("message", handleMessage);
    };
  }, [wsRef, handleWSMessage]);

  const sendWs = (payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    } else {
      console.warn("WebSocket not connected yet!");
    }
  };

  const handleSendMessage = () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected yet!");
      return;
    }
    setSending(true);

    const tempId = generateTempId();
    const tempMessage = {
      id: tempId,
      sender: user,
      content: trimmedMessage,
      created_at: new Date().toISOString(),
      is_temp: true,
      reply_to_message: replyTo || null,
    };

    setMessages((prev) => [...prev, tempMessage]);

    requestAnimationFrame(scrollToBottom);

    const payload = {
      action: "message",
      content: trimmedMessage,
      temp_id: tempId,
      reply_to: replyTo?.id || null,
    };

    try {
      sendWs(payload);
    } catch (err) {
      console.error("Failed to send message via WS:", err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === tempId ? { ...msg, is_temp: false, failed: true } : msg
        )
      );
    }

    setNewMessage("");
    setReplyTo(null);
    setSending(false);

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuccess = () => {
    fetchGroupData();
  }

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    const validFiles = [];

    for (const file of selectedFiles) {
      const fileExt = "." + file.name.split(".").pop().toLowerCase();

      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        setIsError(true);
        setError(`${file.name}: Invalid file type`);
        continue;
      }

      validFiles.push({
        raw: file,
        preview: URL.createObjectURL(file),
        file_name: file.name,
        message_type: getMessageType(file),
      });
    }

    if (validFiles.length) {
      setFiles((prev) => [...prev, ...validFiles]);
    }

    e.target.value = "";
  };

  const handleRemoveFile = (index) => {
    setFiles((prev) => {
      const fileToRemove = prev[index];

      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }

      return prev.filter((_, i) => i !== index);
    });

    if (fileInputRef.current && files.length === 1) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveAllFiles = () => {
    files.forEach((file) => {
      if (file.preview) URL.revokeObjectURL(file.preview);
    });

    setFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearSelectedFiles = () => {
    setFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (preview) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.preview === preview);

      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }

      return prev.filter((f) => f.preview !== preview);
    });
  };

  const handleUploadFileMessage = async (groupId) => {
    if (!files.length) return;

    const filesToUpload = [...files];

    clearSelectedFiles();

    setIsUploadingFiles(true);
    setSending(true);

    const tempMessages = filesToUpload.map((file) => {
      const tempId = generateTempId();

      return {
        tempId,
        message: {
          id: tempId,
          file_url: file.preview,
          sender: user,
          created_at: new Date().toISOString(),
          is_temp: true,
          uploading: true,
          progress: 0,
          message_type: getMessageType(file.raw),
          parent_message: replyTo || null,
        },
        file,
      };
    });

    setMessages((prev) => [
      ...prev,
      ...tempMessages.map((item) => item.message),
    ]);

    requestAnimationFrame(scrollToBottom);

    try {
      await Promise.all(
        tempMessages.map(({ file, tempId }) =>
          uploadFileMessage(
            groupId,
            file.raw,
            tempId,
            replyTo?.id || null
          )
        )
      );
    } catch (err) {
      console.error("Failed to upload files:", err);

      setMessages((prev) =>
        prev.map((msg) =>
          tempMessages.some((item) => item.tempId === msg.id)
            ? { ...msg, uploading: false, failed: true }
            : msg
        )
      );
    } finally {
      setReplyTo(null);
      setIsUploadingFiles(false);
      setSending(false);
    }
  };

  const updateFileMessage = async (messageId, newFile) => {
    if (!newFile) return;

    const tempId = generateTempId();
    const tempPreviewUrl = URL.createObjectURL(newFile);
    const messageType = getMessageType(newFile);

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
            ...msg,
            temp_id: tempId,
            file_url: tempPreviewUrl,
            message_type: messageType,
            uploading: true,
            progress: 0,
            failed: false,
          }
          : msg
      )
    );

    try {
      await editGroupFileMessage(messageId, newFile, tempId);

    } catch (err) {
      console.error("Failed to send file_update via WS:", err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, uploading: false, failed: true } : msg
        )
      );
    } finally {
      setFile(null);
    }
  };

  const handleUploadVoiceMessage = async (voiceFile) => {
    if (!voiceFile) return;

    setIsUploadingFiles(true);
    setSending(true);

    const tempId = generateTempId();

    const tempMessage = {
      id: tempId,
      voice_url: URL.createObjectURL(voiceFile),
      message_type: 'voice',
      sender: user,
      created_at: new Date().toISOString(),
      is_temp: true,
      uploading: true,
      progress: 0,
      parent_message: replyTo || null
    };

    setMessages((prev) => [...prev, tempMessage]);
    requestAnimationFrame(scrollToBottom);

    try {
      await uploadVoiceMessage(groupId, voiceFile, tempId, replyTo?.id || null);
    } catch (err) {
      console.error("Failed to upload voice message:", err);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === tempId ? { ...msg, uploading: false, failed: true } : msg
        )
      )
    }
    finally {
      setReplyTo(null);
      setIsUploadingFiles(false);
      setSending(false);
    }
  };

  const handlePinMessage = async (message) => {
    await pinMessage(groupId, message.id)
  }

  const handleUnpinMessage = async (messageId) => {
    await unpinMessage(groupId, messageId)
  }

  const handleStartGroupCall = (callType) => {
    if (!groupId) return;

    send({
      type: "call_start",
      scope: "group",
      group_id: groupId,
      call_type: callType
    })

    setCallRequest({
      status: 'waiting',
      name: group.name,
      avatar: group?.images?.length
        ? group.images.reduce((latest, img) =>
          new Date(img.created_at) > new Date(latest.created_at) ? img : latest
        ).url
        : undefined,
      type: 'group',
      call_type: callType
    })
  }

  const highlightMessage = (messageId) => {
    setHighlightedMessageId(messageId);

    setTimeout(() => {
      setHighlightedMessageId(null);
    }, 2000);
  };

  const scrollToMessage = async (messageId) => {
    if (!messageId) return;

    let element = document.querySelector(
      `[data-message-id="${messageId}"]`
    );

    // Load older messages until found
    while (!element && hasMore) {
      await loadMoreMessages();

      element = document.querySelector(
        `[data-message-id="${messageId}"]`
      );
    }

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });

      highlightMessage(messageId);
    }
  };

  const highlightAnimation = keyframes`
  0% {
    background-color: rgba(255, 235, 59, 0.8);
  }
  100% {
    background-color: transparent;
  }
`;

  const animatedText = useTypewriter('Connecting...', 120, 1000);

  // if (loading || !wsConnected) {
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '80%',
          flexDirection: 'column',
          color: 'text.secondary',
        }}
      >
        <CircularProgress />
        <Typography mt={1}>
          {animatedText}
        </Typography>
      </Box>
    );
  }

  const renderPinnedContent = (msg) => {
    const commonStyle = {
      display: "flex",
      alignItems: "center",
      gap: 0.5,
      fontSize: 13,
      color: "text.primary",
    };

    switch (msg.message_type) {
      case "text":
        return (
          <Typography
            sx={{
              fontSize: 13,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {msg.content}
          </Typography>
        );

      case "file":
        return (
          <Box sx={commonStyle}>
            <DescriptionIcon fontSize="small" />
            <span>Document</span>
          </Box>
        );

      case "image":
        return (
          <Box sx={commonStyle}>
            <ImageIcon fontSize="small" />
            <span>Photo</span>
          </Box>
        );

      case "voice":
        return (
          <Box sx={commonStyle}>
            <MicIcon fontSize="small" />
            <span>Voice Message</span>
          </Box>
        );

      case "video":
        return (
          <Box sx={commonStyle}>
            <VideocamIcon fontSize="small" />
            <span>Video</span>
          </Box>
        );

      default:
        return (
          <Typography sx={{ fontSize: 13 }}>
            {msg.content || "Unsupported message"}
          </Typography>
        );
    }
  };

  const renderVideoContent = (msg) => {

    const handlePlay = () => {
      if (videoRef.current) {
        videoRef.current.play();
        setIsPlaying(true);
      }
    };

    return (
      <>
        <Box
          sx={{
            position: 'relative',
            borderRadius: 2,
            overflow: 'hidden',
            width: '100%',
            maxWidth: 200,
            bgcolor: 'black',
          }}
          onClick={(e) => openSecondMenu(e, msg.id)}
        >
          <video
            ref={videoRef}
            controls={isPlaying}
            style={{ width: '100%', display: 'block' }}
            onEnded={() => setIsPlaying(false)}
          >
            <source src={msg.file_url} type="video/mp4" />
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
        {msg.uploading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(255,255,255,.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
      </>
    );
  };

  const renderFileContent = (message, isMine) => {
    const fileName = message.file_url
      ? message.file_url.split('/').pop()
      : 'Download File';

    return (
      <>
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
          onClick={(e) => openSecondMenu(e, message.id)}
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
              }
            }}
          >
            {fileName}
          </Typography>
        </Box>
        {message.uploading && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: "rgba(255,255,255,.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
      </>
    );
  };

  const renderCallMessage = (message, isMine) => {
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
          }}
        >
          <CallIcon
            sx={{
              fontSize: 18,
              mr: 0.5
            }}
          />
          Call Again
        </Button>
      </Box>
    );
  };

  const renderReplyMessage = (message) => {
    return (
      <Typography variant="body2" noWrap>
        {message.message_type === 'text' && message.content}
        {message.message_type === 'video' && 'Video'}
        {message.message_type === 'image' && 'Image'}
        {message.message_type === 'file' && 'Doument'}
        {message.message_type === 'voice' && 'Voice message'}
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        width: '100%',
        border: 1,
        borderColor: isError ? 'error.main' : 'divider'
      }}
    >
      <AppBar
        position="static"
        color="default"
        elevation={2}
        sx={{
          bgcolor: isError ? '#ff8b8911' : 'inherit',
          '&:hover': { bgcolor: 'grey.200' },
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={toggleGroupList}
              sx={{
                '&:hover': { bgcolor: 'grey.200' },
                display: { xs: 'block', md: 'none' }
              }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Avatar
              sx={{
                width: { xs: 38, md: 44 },
                height: { xs: 38, md: 44 },
                border: 1,
                borderColor: 'divider',
                fontSize: 28
              }}
              src={
                group?.images?.length
                  ? group.images.reduce((latest, img) =>
                    new Date(img.created_at) > new Date(latest.created_at) ? img : latest
                  ).url
                  : undefined
              }
              onClick={() => setOpen(true)}
            >
              {group?.name?.charAt(0) || 'G'}
            </Avatar>

            <Box sx={{ flexGrow: 1, overflow: 'hidden', display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="h6" fontWeight={600} noWrap>
                {group?.name || 'Group Chat'}
              </Typography>

              <Typography variant="caption" color="text.secondary" noWrap>
                {members.length} members
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1, sm: 2 },
              alignItems: 'center',
            }}
          >
            <CallIcon
              sx={{
                fontSize: { xs: 22, md: 26 },
                color: 'primary.main',
                transition: 'transform 1s',
                '&:hover': {
                  scale: 1.1
                }
              }}
              onClick={() => handleStartGroupCall({ callType: "voice" })}
            />
            <VideocamIcon
              sx={{
                fontSize: { xs: 24, md: 30 },
                color: 'primary.main',
                transition: 'transform 1s',
                '&:hover': {
                  scale: 1.1
                }
              }}
              onClick={() => handleStartGroupCall({ callType: "video" })}
            />
          </Box>
        </Toolbar>
      </AppBar>

      {group.pinned_message && (
        <Box
          sx={{
            position: "absolute",
            mt: 1,
            ml: 0.5,
            mr: 0.5,
            zIndex: 999,
            width: '98%',

            display: "flex",
            alignItems: "flex-start",

            bgcolor: "background.paper",
            borderRadius: 2,
            boxShadow: 2,
            overflow: "hidden",

            border: "1px solid",
            borderColor: "divider",
          }}
        >
          {/* Left Accent */}
          <Box
            sx={{
              width: 4,
              bgcolor: "primary.main",
            }}
          />

          {/* Content */}
          <Box
            sx={{
              flex: 1,
              p: 1.5,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mb: 0.5,
                alightItems: 'center'
              }}
            >
              <PushPinIcon
                sx={{
                  fontSize: 16,
                  color: "primary.main",
                }}
              />

              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                }}
              >
                Pinned Message
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >(
                {group.pinned_message.pinned_by_id === user.id
                  ? "Pinned by You"
                  : `Pinned by ${group.pinned_message.pinned_by}`}
                {" • "}
                {formatCambodiaTime(group.pinned_message.pinned_at)}
                )
              </Typography>
            </Box>

            <Box
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                backgroundColor: 'grey.100',
                opacity: '0.7',
                p: 0.25,
                borderRadius: 1,
                '&:hover': {
                  opacity: 1,
                }
              }}
              onClick={() => scrollToMessage(group.pinned_message.id)}
            >
              {renderPinnedContent(group.pinned_message)}
            </Box>
          </Box>

          {/* Close Button */}
          <IconButton
            size="small"
            onClick={() => handleUnpinMessage(group.pinned_message.id)}
            sx={{
              m: 0.5,
              color: "text.secondary",
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          height: '80vh',
          bgcolor: isError ? '#ff8b8911' : 'inherit',
          width: '100%',
          overflowX: 'hidden'
        }}>

        <Drawer
          anchor='right'
          open={openDrawer}
          onClose={toggleDrawer}>
          {DrawerBox}
        </Drawer>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
            ref={messagesContainerRef}
            onScroll={handleScroll}
          >

            {loadingMore && (
              <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
                <CircularProgress />
              </Box>
            )}

            {messages.length === 0 ? (
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                  flexDirection: 'column',
                  color: 'text.secondary',
                }}
              >
                <ModeCommentRoundedIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  No messages yet
                </Typography>
                <Typography>Start a conversation with the group</Typography>
              </Box>
            ) : (
              messages
                .filter(Boolean)
                .slice()
                .sort((a, b) => new Date(a.created_at || a.temp_created_at) - new Date(b.created_at || b.temp_created_at))
                .map((message) => {
                  const isEditing = editingMessageId === message.id;
                  const messageKey = message.id ?? message.temp_id ?? `temp-${Math.random()}`;

                  const isForwarded = !!message.forwarded_by;

                  const isOwn = message.sender?.id === user?.id;

                  const seenCount = message.seen_by?.length || 0;
                  const hasBeenSeen = seenCount > 0;

                  const isPinned = message.id === group.pinned_message?.id;

                  return (
                    <Box
                      key={messageKey}
                      data-message-id={messageKey}
                      sx={{
                        display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end',
                        mb: 1,
                        position: 'relative',

                        bgcolor:
                          highlightedMessageId === message.id
                            ? 'rgba(255,235,59,0.8)'
                            : isPinned
                              ? 'rgba(255,193,7,0.28)'
                              : 'transparent',

                        animation:
                          highlightedMessageId === message.id
                            ? `${highlightAnimation} 2s ease`
                            : 'none',

                        ...(isPinned && {
                          '&::before': {
                            content: '"📌"',
                            position: 'absolute',
                            top: -6,
                            left: isOwn ? 'auto' : -25,
                            right: isOwn ? -10 : 'auto',
                            zIndex: 1000,
                          },
                        }),
                      }}
                    >
                      {!isOwn && message.sender?.username && (
                        <Avatar
                          src={message.sender.avatar_url}
                          alt={message.sender.username || 'User'}
                          sx={{ width: 25, height: 25, mr: 1, fontSize: 14 }}
                        >
                          {message.sender.username?.charAt(0).toUpperCase() || 'P'}
                        </Avatar>
                      )}

                      <Box sx={{ maxWidth: '70%', position: 'relative' }}>
                        {!isOwn && (
                          <Typography variant="caption" sx={{ fontWeight: 600, ml: 1 }}>
                            {message.sender?.username}
                          </Typography>
                        )}

                        <Box>
                          {isEditing ? (
                            <Box
                              sx={{
                                alignItems: 'center',
                                gap: 1,
                                p: 1,
                                borderRadius: 3,
                                // bgcolor: 'primary.main',
                                boxShadow: 2,
                              }}
                            >
                              <TextField
                                fullWidth
                                size="small"
                                value={editedContent}
                                onChange={(e) => setEditedContent(e.target.value)}
                                placeholder="Edit message…"
                                variant="outlined"
                                multiline
                                maxRows={4}
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
                                  mt: 1
                                }}
                              >

                                <EmojiButton
                                  onSelect={(emoji) => setEditedContent((prev) => prev + emoji)}
                                  placement="bottom-start"
                                  size="small"
                                  width={300}
                                  height={350}
                                />

                                <Box sx={{ display: 'flex', gap: 0.5 }}>

                                  <Button
                                    size="small"
                                    variant="text"
                                    onClick={handleCancelEdit}
                                    sx={{
                                      color: 'black',
                                      opacity: 0.85,
                                      '&:hover': {
                                        opacity: 1,
                                        bgcolor: 'rgba(255,255,255,0.12)',
                                      },
                                    }}
                                  >
                                    Cancel
                                  </Button>

                                  <Button
                                    size="small"
                                    variant="contained"
                                    onClick={handleSave}
                                    sx={{
                                      bgcolor: 'primary.main',
                                      color: 'primary.contrastText',
                                      '&:hover': {
                                        bgcolor: 'primary.dark',
                                      },
                                    }}
                                  >
                                    Save
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          ) : (
                            <Box
                              sx={{
                                bgcolor: "#e8f0fe",
                                borderRadius: 1,
                              }}
                            >
                              {isForwarded && (
                                <Box
                                  sx={{
                                    bgcolor: "#e8f0fe",
                                    px: 2,
                                    py: 1,
                                    borderLeft: "3px solid #1a73e8",
                                    borderRadius: 1,
                                  }}
                                >
                                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                    Forwarded from {message.forwarded_by.id !== user?.id ?
                                      <Box
                                        sx={{
                                          display: 'flex',
                                          gap: 0.2,
                                          alightItems: 'center'
                                        }}
                                      >
                                        <Avatar
                                          src={message.forwarded_by.avatar_url}
                                          alt={message.forwarded_by.username || "author image"}
                                          sx={{
                                            width: 14,
                                            height: 14,
                                            mt: 0.3,
                                            fontSize: 8
                                          }}
                                        >{message.forwarded_by.username.charAt(0).toUpperCase() || "P"}</Avatar>
                                        {message.forwarded_by.username}
                                      </Box>
                                      :
                                      (" you")}
                                  </Typography>
                                </Box>
                              )}

                              {message.parent_message && (
                                <Box
                                  onClick={() => scrollToMessage(message.parent_message.id)}
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
                                      {message.parent_message.sender?.username}
                                    </Typography>

                                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                                      {message.parent_message.message_type === "text" && (
                                        message.parent_message.content
                                      )}
                                      {message.parent_message.message_type === "image" && (
                                        "Image"
                                      )}
                                      {message.parent_message.message_type === "voice" && (
                                        "Voice message"
                                      )}
                                      {message.parent_message.message_type === "file" && (
                                        "File"
                                      )}
                                      {message.parent_message.message_type === "video" && (
                                        "Video"
                                      )}
                                    </Typography>

                                  </Box>
                                </Box>
                              )}

                              {message.voice_url && message.message_type === 'voice' && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: isOwn ? "flex-end" : "flex-start",
                                    maxWidth: { md: 400, xs: 200 },
                                    mb: 1,
                                  }}
                                  onClick={(e) => openSecondMenu(e, message.id)}
                                >
                                  <VoiceMessagePlayer url={message.voice_url} isOwn={isOwn} />
                                </Box>
                              )}

                              {message.file_url && message.message_type === 'image' && (
                                <Box
                                  sx={{ position: 'relative' }}
                                >
                                  <img
                                    component="img"
                                    src={message.file_url}
                                    onClick={(e) => openSecondMenu(e, message.id)}
                                    alt="upload"
                                    style={{
                                      maxWidth: '100%',
                                      maxHeight: 200,
                                      borderRadius: '8px',
                                      cursor: 'pointer',
                                      objectFit: 'cover',
                                    }}
                                  />

                                  {message.uploading && (
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        inset: 0,
                                        bgcolor: "rgba(0,0,0,0.4)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <CircularProgress
                                        size={30}
                                        sx={{ color: "white" }}
                                      />
                                    </Box>
                                  )}

                                  {message.failed && (
                                    <Box
                                      sx={{
                                        position: "absolute",
                                        inset: 0,
                                        bgcolor: "rgba(255,0,0,0.2)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Typography color="error" fontSize={12}>
                                        Failed
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              )}

                              {message.file_url && message.message_type === 'video' && (
                                renderVideoContent(message)
                              )}

                              {message.file_url && message.message_type === 'file' && (
                                renderFileContent(message, isOwn)
                              )}

                              {message.content && message.message_type === 'system' && (
                                renderCallMessage(message, isOwn)
                              )}

                              {message.content && message.message_type === 'text' && (
                                <Typography
                                  variant="body2"
                                  sx={{
                                    bgcolor: isOwn ? 'primary.main' : 'white',
                                    color: isOwn ? 'white' : 'text.primary',
                                    p: 2,
                                    borderRadius: 3,
                                    boxShadow: 1,
                                    wordBreak: 'break-word',
                                    transition: 'all 0.2s',
                                    textAlign: isOwn ? 'right' : 'left'
                                  }}
                                  onClick={(e) => openSecondMenu(e, message.id)}
                                >
                                  {message.content}
                                </Typography>
                              )}

                            </Box>
                          )}
                        </Box>

                        {(isOwn || message.sender?.username) && (
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: isOwn ? 'end' : 'start'
                            }}
                          >
                            {message.reaction_summary &&
                              Object.entries(message.reaction_summary).map(([reaction, count]) => {
                                const reactedByMe = message.my_reaction === reaction;

                                return (
                                  <Tooltip
                                    key={reaction}
                                    title={
                                      reactedByMe
                                        ? `You and ${count - 1} others`
                                        : `${count} reactions`
                                    }
                                  >
                                    <Chip
                                      label={`${reactionMap[reaction]} ${count}`}
                                      size="small"
                                      color={reactedByMe ? "primary" : "default"}
                                    />
                                  </Tooltip>
                                );
                              })}
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{
                                display: 'block',
                                textAlign: isOwn ? 'right' : 'left',
                                mt: 0.5,
                                mx: 1
                              }}
                            >
                              {message.call_content && message.updated_at ? (
                                `ended at: ${formatCambodiaTime(message.updated_at)}`
                              ) : message.updated_at ? (
                                `edited at: ${formatCambodiaTime(message.updated_at)}`
                              ) : (
                                formatCambodiaTime(message.created_at)
                              )}
                              {/* {message.is_temp && ' • Sending...'} */}
                            </Typography>

                            {isOwn && (
                              message.is_temp ? (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: 'block',
                                    textAlign: isOwn ? 'right' : 'left',
                                    mt: 0.5,
                                    mx: 1
                                  }}
                                > • Sending...
                                </Typography>
                              ) : hasBeenSeen ? (
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
                        )}

                      </Box>

                    </Box>
                  );
                })
            )}

            <Menu
              anchorEl={secondAnchorEl}
              open={Boolean(secondAnchorEl)}
              onClose={closeSecondMenu}
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
              >
                {reactions.map((reaction) => {
                  const reactedByMe =
                    activeMessage?.my_reaction === reaction.value;

                  return (
                    <IconButton
                      key={reaction.value}
                      size="small"
                      onClick={() => {
                        makeReaction(
                          groupId,
                          activeMessage.id,
                          reaction.value
                        );
                        closeSecondMenu();
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
              {activeMessage &&
                [
                  <MenuItem
                    key="pin"
                    onClick={() => {
                      activeMessage.id === group.pinned_message?.id
                        ? handleUnpinMessage(activeMessage.id)
                        : handlePinMessage(activeMessage);

                      closeSecondMenu();
                    }}
                  >
                    <PushPinIcon sx={{ mr: 1.5 }} />
                    {activeMessage.id === group.pinned_message?.id ? "Unpin" : "Pin"}
                  </MenuItem>,

                  <MenuItem
                    key="reply"
                    onClick={() => {
                      setReplyTo(activeMessage);
                      closeSecondMenu();
                    }}
                  >
                    <ReplyIcon sx={{ mr: 1.5 }} /> Reply
                  </MenuItem>,

                  !activeMessage.call_content
                    ? (
                      <MenuItem
                        key="forward"
                        onClick={() => {
                          setSelectedMessage(activeMessage);
                          toggleDrawer();
                          closeSecondMenu();
                        }}
                      >
                        <ShortcutIcon sx={{ mr: 1.5 }} /> Forward
                      </MenuItem>
                    )
                    : null,

                  activeMessage.content && activeMessage.sender?.id === user?.id
                    ? (
                      <MenuItem
                        key="edit"
                        onClick={() => {
                          setEditingMessageId(activeMessage.id);
                          setEditedContent(activeMessage.content);
                          closeSecondMenu();
                        }}
                      >
                        <EditIcon sx={{ mr: 1.5 }} /> Edit
                      </MenuItem>
                    )
                    : null,

                  activeMessage.file_url
                    ? [
                      <MenuItem
                        key="view-img"
                        onClick={() => {
                          setSelectedImage(activeMessage);
                          closeSecondMenu();
                        }}
                      >
                        <RemoveRedEyeIcon sx={{ mr: 1.5 }} /> View Image
                      </MenuItem>,

                      <MenuItem
                        key="save-img"
                        onClick={async () => {
                          const response = await fetch(activeMessage.file_url);
                          const blob = await response.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = activeMessage.file_url.split("/").pop();
                          a.click();
                          URL.revokeObjectURL(url);
                          closeSecondMenu();
                        }}
                      >
                        <SaveAltIcon sx={{ mr: 1.5 }} /> Save Image
                      </MenuItem>,

                      activeMessage.sender?.id === user?.id
                        ? (
                          <MenuItem
                            key="replace-img"
                            onClick={() => {
                              const input = document.createElement("input");
                              input.type = "file";
                              input.accept = "image/*";
                              input.onchange = (e) => {
                                if (e.target.files[0])
                                  updateFileMessage(activeMessage.id, e.target.files[0]);
                              };
                              input.click();
                              closeSecondMenu();
                            }}
                          >
                            <AutorenewIcon sx={{ mr: 1.5 }} /> Replace Image
                          </MenuItem>
                        )
                        : null,
                    ]
                    : null,

                  (activeMessage.sender?.id === user?.id ||
                    activeMessage.forwarded_by?.id === user?.id) ? (
                    <MenuItem
                      key="delete"
                      onClick={() => {
                        setActiveMessageId(activeMessage.id);
                        setDeleteOpen(true);
                      }}
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon sx={{ mr: 1.5 }} /> Delete
                    </MenuItem>
                  ) : null,
                ].flat().filter(Boolean)}
            </Menu>

            <div ref={messagesEndRef} />
          </Box>

          <Box
            sx={{
              py: 1,
              px: 2,
              borderTop: 1,
              borderColor: "divider",
              bgcolor: "white",
              width: "100%",
            }}
          >
            {files.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexWrap: "wrap",
                  maxHeight: 120,
                  overflowY: "auto",
                  py: 1,
                }}
              >
                {files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      position: "relative",
                      width: 48,
                      height: 48,
                      flexShrink: 0,
                      mb: 1
                    }}
                  >
                    {file.raw.type.startsWith("image/") ? (
                      <img
                        src={file.preview}
                        alt={file.raw.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                    ) : file.raw.type.startsWith("video/") ? (
                      <video
                        src={file.preview}
                        muted
                        playsInline
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          borderRadius: 1,
                          bgcolor: "#f5f5f5",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          p: 0.5,
                        }}
                      >
                        <AttachFileIcon fontSize="small" />
                        <Typography
                          variant="caption"
                          sx={{
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontSize: "8px",
                          }}
                        >
                          {file.raw.name}
                        </Typography>
                      </Box>
                    )}

                    {isUploadingFiles && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "rgba(0,0,0,.3)",
                        }}
                      >
                        <CircularProgress
                          size={16}
                          sx={{ color: "white" }}
                        />
                      </Box>
                    )}

                    <IconButton
                      size="small"
                      onClick={() => handleRemoveFile(index)}
                      sx={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        bgcolor: "#fff",
                        width: 18,
                        height: 18,
                        fontSize: 10,
                        zIndex: 1000,
                        '&:hover': {
                          bgcolor: "#edebeb",
                        }
                      }}
                    >
                      <CloseIcon sx={{ fontSize: 10 }} />
                    </IconButton>
                  </Box>
                ))}
                <Box
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 1,
                    border: "1px dashed",
                    borderColor: "divider",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    flexShrink: 0,
                    mb: 1,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 18 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "8px",
                      lineHeight: 1,
                    }}
                  >
                    Add
                  </Typography>
                </Box>

              </Box>
            )}

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>

              <Box
                sx={{
                  width: '100%'
                }}
              >
                {replyTo && (
                  <Box
                    sx={{
                      p: 1,
                      mb: 1,
                      bgcolor: "grey.200",
                      borderRadius: 2,
                      borderLeft: "4px solid #1976d2",
                      display: 'flex',
                      justifyContent: 'space-between',
                      alightItems: 'center'
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: "bold" }}>
                        Replying to {replyTo.sender?.username}
                      </Typography>

                      {renderReplyMessage(replyTo)}
                    </Box>

                    <IconButton
                      size="small"
                      onClick={() => setReplyTo(null)}
                      sx={{ textTransform: "none" }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </Box>
                )}

                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {!showTextbox && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: recording ? '100%' : 150
                      }}
                    >
                      <input
                        type="file"
                        multiple
                        accept=".png,.jpg,.jpeg,.webp,.gif,.doc,.docx,.txt,.pdf,.zip,.mp4,.mov,.mkv"
                        id="file-upload"
                        style={{ display: 'none' }}
                        ref={fileInputRef}
                        onChange={handleFileChange}
                      />
                      <label htmlFor="file-upload">
                        <IconButton component="span" size="small">
                          <AttachFileIcon />
                        </IconButton>
                      </label>
                      <VoiceRecorder
                        onConfirm={(blob) => {
                          handleUploadVoiceMessage(blob);
                        }}
                        onRecordingChange={setRecording}
                      />
                      {!recording && (
                        <Box sx={{ position: 'relative' }}>
                          <IconButton
                            ref={emojiButtonRef}
                            onClick={() => setShowEmojiPicker(true)}
                            disabled={recording}
                            sx={{
                              fontSize: 50,
                              color: 'orange'
                            }}
                          >
                            {showEmojiPicker ? <EmojiEmotionsIcon /> : <InsertEmoticonIcon />}
                          </IconButton>

                          {(showEmojiPicker) && (
                            <EmojiPicker
                              onSelect={(emoji) => {
                                setNewMessage(prev => prev + emoji);
                              }}
                              onClose={() => setShowEmojiPicker(false)}
                              anchorEl={emojiButtonRef.current}
                              placement="top-start"
                            />
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                  {(!recording || showTextbox) && (
                    <>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Aa..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        multiline
                        maxRows={4}
                        onFocus={() => setShowTextbox(true)}
                        onBlur={() => setShowTextbox(false)}
                        sx={{
                          bgcolor: 'grey.100',
                          borderRadius: 2,
                          '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                        }}
                      />

                      <Button
                        variant="contained"
                        onClick={async () => {
                          if (files.length > 0) {
                            await handleUploadFileMessage(groupId);
                          }

                          if (newMessage.trim()) {
                            handleSendMessage();
                          }
                        }}
                        disabled={!newMessage.trim() && files.length === 0}
                        sx={{
                          minWidth: 30,
                          borderRadius: 2,
                          py: 1,
                          px: 1.5,
                        }}
                      >
                        <SendIcon />
                      </Button>
                    </>
                  )}
                </Box>
              </Box>

            </Box>
          </Box>
        </Box>
      </Box >
      <GroupMenuDialog
        open={open}
        onClose={() => setOpen(false)}
        group={group}
        onSuccess={handleSuccess}
        members={members}
        currentChatId={user.id}
      />

      {selectedImage && (
        <PreviewDialog
          open={selectedImage}
          onClose={() => setSelectedImage(null)}
          url={selectedImage.file_url}
          type={selectedImage.message_type}
        />
      )}

      <SeenMessageListDialog
        open={openSeenMessage}
        onClose={() => setOpenSeenMessage(false)}
        messageId={selectedMessageId}
      />

      <DeleteDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete a message"
        description="Are you sure want to delete this message?"
        onConfirm={
          activeMessageId
            ? () => onDelete(activeMessageId)
            : undefined
        }
        tag={`${deleting ? ('Deleting') : ('Delete')}`}
      />

    </Box >

  );
};

export default GroupChatPage;