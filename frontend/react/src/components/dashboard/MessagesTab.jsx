import {
  Close as CloseIcon,
  EmojiEmotions as EmojiEmotionsIcon,
  InsertEmoticon as InsertEmoticonIcon,
  Send as SendIcon
} from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  CircularProgress,
  Drawer
} from '@mui/material';
import { useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAvatar } from '../../hooks/useAvatar';
import { useWebSocket } from '../../hooks/useWebSocket';
import {
  toggleReaction,
  sendVoiceMessage as apiSendVoiceMessage,
  deleteImageMessage,
  deleteMessage,
  editMessage,
  getBlockedUsers,
  getPrivateChat,
  replaceFileMessage,
  sendMediaMessage,
  togglePinPrivateMessage,
  getPinPrivateMessage,
} from '../../services/api';
import ChatMessage from '../chat/ChatMessage';
import EmojiButton from '../EmojiButton';
import EmojiPicker from '../EmojiPicker';
import { useAuth } from '../../context/AuthContext';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VoiceRecorder from '../group/VoiceRecorder';
import GroupListComponent from '../chat/GroupListComponent';
import ModeCommentRoundedIcon from '@mui/icons-material/ModeCommentRounded';
import useTypewriter from '../../hooks/useTypewriter';
import AddIcon from '@mui/icons-material/Add';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PushPinIcon from "@mui/icons-material/PushPin";
import MicIcon from '@mui/icons-material/Mic';
import { formatCambodiaTime } from '../../utils/dateUtils';
import { keyframes } from "@mui/system";
import FriendProfileDialog from '../dialogs/FriendProfileDialog';

const getWebSocketBaseUrl = () => {
  const wsUrl = import.meta.env.VITE_API_URL.replace(/^http/, "ws");
  if (!wsUrl) {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return apiUrl.replace(/^http/, 'ws');
  }
  return wsUrl;
};
const BASE_URI = getWebSocketBaseUrl();

const MessagesTab = ({ friends, profile, isError, setError, setSuccess, showFriend, selectedFriend, toggleGroupList, chats, currentChatId, currentChatType, setCallRequest, send }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef(null);
  const { t } = useTranslation();
  const [showTextbox, setShowTextbox] = useState(false);
  const messageRefs = useRef({});

  const LIMIT = 10;

  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState([]);
  const [pinMessage, setPinMessage] = useState(null);

  const [blockedUsers, setBlockedUsers] = useState([]);

  const { auth } = useAuth();
  const user = auth?.user;
  const sentReadReceipts = useRef(new Set());
  const isConnectedRef = useRef(false);
  const sendWsMessageRef = useRef(null);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const loadingMoreRef = useRef(false);
  const initialScrollDone = useRef(false);
  const fileInputRef = useRef(null);

  const audioBlobRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const tempToRealIdMap = useRef({});
  const cancelReply = () => setReplyTo(null);

  const [openDrawer, setOpenDrawer] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState("");
  const selectedFilesRef = useRef([]);
  const [profileDialog, setProfileDialog] = useState(null);

  const [highlightedMessageId, setHighlightedMessageId] = useState(null);

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

  const { getAvatarUrl, getUserAvatar } = useAvatar();

  const handleReply = (message) => {
    setReplyTo({
      id: message.id,
      content: message.content,
      sender: message.sender,
      message_type: message.message_type,
      voice_duration: message.voice_duration,
      file_size: message.file_size,
    });
  };

  useEffect(() => {
    if (!selectedFriend) return;

    sentReadReceipts.current = new Set();
    initialScrollDone.current = false;

    setMessages([]);
    setNewMessage('');
    setAudioUrl(null);
    setRecordingTime(0);
    setIsRecording(false);

    loadInitialMessages();
    fetchPinMessage(selectedFriend.id);
  }, [selectedFriend]);

  const scrollToBottomIfNeeded = useCallback((behavior = 'smooth') => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 150;

    if (isNearBottom || initialScrollDone.current) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
    }
  }, []);

  const getWsUrl = useCallback(() => {
    if (!selectedFriend) return null;
    const rawToken = localStorage.getItem('accessToken') || '';
    const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7) : rawToken;
    return `${BASE_URI}/api/v1/ws/private/${selectedFriend.id}?token=${token}`;
  }, [selectedFriend]);

  const handleWebSocketMessage = useCallback(
    async (data) => {
      const { type } = data;

      if (type === "reaction_added") {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id) {
            const currentReactions = msg.reactions || [];
            const exists = currentReactions.some(r => r.id === data.reaction.id);
            if (!exists) {
              return {
                ...msg,
                reactions: [...currentReactions, data.reaction]
              };
            }
          }
          return msg;
        }));
        return;

      } else if (type === "reaction_removed") {
        setMessages(prev => prev.map(msg => {
          if (msg.id === data.message_id) {
            const currentReactions = msg.reactions || [];
            return {
              ...msg,
              reactions: currentReactions.filter(r => r.id !== data.reaction_id)
            };
          }
          return msg;
        }));
        return;
      }

      else if (type === "message") {

        const realMessage = {
          id: data.id,
          temp_id: data.temp_id || null,
          content: data.content,
          is_temp: false,
          message_type: data.message_type,
          sender_id: data.sender_id,
          sender: {
            id: data.sender_id,
            username: data.sender_username,
            avatar_url: getAvatarUrl(data.avatar_url),
          },
          sender_username: data.sender_username,
          sender_avatar_url: getAvatarUrl(data.avatar_url),
          created_at: data.created_at,
          edited_at: data.edited_at || null,
          voice_duration: data.voice_duration || 0,
          file_size: data.file_size || 0,

          reply_to_id: data.reply_to_id || null,
          reply_to: data.reply_to || null,
          is_forwarded: data.is_forwarded || null,
          original_sender: data.original_sender || null,
          original_sender_avatar: data.original_sender_avatar || null
        };

        setMessages((prev) => {
          const updated = [...prev];
          if (data.temp_id) {
            const tempIndex = updated.findIndex(m => m.is_temp && m.temp_id === data.temp_id);
            if (tempIndex !== -1) {
              tempToRealIdMap.current[data.temp_id] = data.id;
              const prevTempMsg = updated[tempIndex];
              updated[tempIndex] = {
                ...realMessage,
                seen_by: prevTempMsg.seen_by || realMessage.seen_by || [],
              };
            }
          }

          if (!updated.some((m) => m.id === data.id)) {
            updated.push(realMessage);
          }
          return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        });

        if (data.sender_id !== user.id) {
          sendReadReceipt(data.id);
        }

        requestAnimationFrame(() => {
          scrollToBottomIfNeeded('smooth');
        });
      }
      else if (type === "message_replace") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === data.message_id
              ? {
                ...m,
                content: data.new_content,
                file_size: data.file_size,
                message_type: data.message_type,
                edited_at: data.edited_at,
                is_edited: true,
              }
              : m
          )
        );
      }

      else if (type === "new_call_message") {
        const realMessage = {
          id: data.message_id,
          content: data.content,
          message_type: "system",
          is_temp: false,
          temp_id: null,
          sender_id: data.sender_id,
          sender: {
            id: data.sender.id,
            username: data.sender.username,
            avatar_url: getAvatarUrl(data.sender.avatar_url),
          },
          created_at: data.created_at,
          edited_at: data.edited_at,
          edited: false,
        };

        setMessages(prev => {
          const exists = prev.some(m => m.id === data.message_id);
          if (!exists) {
            return [...prev, realMessage].sort(
              (a, b) => new Date(a.created_at) - new Date(b.created_at)
            );
          }
          return prev;
        });

        if (data.sender_id !== user.id) {
          sendReadReceipt(data.id);
        }

        requestAnimationFrame(() => {
          scrollToBottomIfNeeded('smooth');
        });

      } else if (type === "message_updated") {
        setMessages((prev) =>
          prev.map((msg) => {
            const messageIdsToCheck = [
              msg.id,
              msg.temp_id,
              tempToRealIdMap.current[msg.id],
              tempToRealIdMap.current[msg.temp_id]
            ].filter(Boolean);

            const matches =
              messageIdsToCheck.includes(data.message_id) ||
              messageIdsToCheck.includes(data.id) ||
              msg.id === data.message_id ||
              msg.id === data.id;

            if (matches) {
              if (data.seen_by) {
                return {
                  ...msg,
                  content: data.content || msg.content,
                  message_type: data.message_type || msg.message_type,
                  edited_at: data.edited_at,
                  edited: true,
                };
              }

              return {
                ...msg,
                content: data.content || msg.content,
                message_type: data.message_type || msg.message_type,
                edited_at: data.edited_at,
                edited: true,
              };
            }
            return msg;
          })
        );

      } else if (type === "message_deleted") {
        setMessages((prev) => prev.filter((m) => m.id !== data.message_id));
      }
      else if (type === "messages_read") {
        setMessages(prev =>
          prev.map(msg =>
            msg.sender?.id === user.id
              ? {
                ...msg,
                is_read: true,
                read_at: new Date().toISOString(),
              }
              : msg
          )
        );
      }
      else if (type === "chat_read") {
        setMessages(prev =>
          prev.map(msg =>
            msg.sender?.id === user.id
              ? {
                ...msg,
                is_read: true,
                read_at: new Date().toISOString(),
              }
              : msg
          )
        );
      } else if (type === "reaction_updated") {
        setMessages(prev =>
          prev.map(msg => {
            if (msg.id === data.message_id) {

              let myReaction = data.my_reaction ?? null;

              if (data.action === "removed") {
                myReaction = null;
              }

              return {
                ...msg,
                reactions: data.reactions || [],
                my_reaction: myReaction,
              };
            }
            return msg;
          })
        );
        return;
      } else if (type === "message_pinned") {
        setPinMessage(data);
      }
      else if (type === "message_unpinned") {
        setPinMessage(null);
      }
    },
    [
      blockedUsers,
      getAvatarUrl,
      friends,
      selectedFriend,
      getUserAvatar,
      setSuccess
    ]
  );

  const sendReadReceipt = useCallback((messageId, senderId) => {
    if (!isConnectedRef.current) return;
    if (!sendWsMessageRef.current) return;

    sendWsMessageRef.current({
      type: "read_message",
      message_id: messageId,
      user_id: senderId
    });
  }, []);

  const sendSeenMessage = useCallback(() => {
    if (!selectedFriend || !isConnectedRef.current) return;

    messages.forEach((msg) => {
      if (msg.sender_id !== user.id && !msg.is_read) {
        sendReadReceipt(msg.id, msg.sender_id);
      }
    });
  }, [messages, selectedFriend, sendReadReceipt, user.id]);

  const handleWebSocketOpen = useCallback(() => {
    console.log('[WS] Connected');
    setError(null);
    isConnectedRef.current = true;

    if (selectedFriend && messages.length > 0) {
      const unread = messages.filter(
        m => m.sender_id !== user.id && !m.is_read && m.id && !m.is_temp
      );
      unread.forEach(m => {
        if (!sentReadReceipts.current.has(m.id)) {
          sendWsMessageRef.current?.({
            type: "read_message",
            message_id: m.id,
          });
          sentReadReceipts.current.add(m.id);
        }
      });
    }
  }, [sendSeenMessage, messages.length, selectedFriend]);

  const handleWebSocketClose = useCallback((event) => {
    console.log('[WS] Closed', event.code, event.reason);
  }, []);

  const handleWebSocketError = useCallback((error) => {
    console.error('[WS] Error', error);
  }, []);

  const handleReconnect = useCallback((attempt) => {
    console.log(`[WS] Reconnect attempt #${attempt}`);
  }, []);

  const {
    sendMessage: sendWsMessage,
    isConnected,
  } = useWebSocket(getWsUrl(), {
    onMessage: handleWebSocketMessage,
    onOpen: handleWebSocketOpen,
    onClose: handleWebSocketClose,
    onError: handleWebSocketError,
    onReconnect: handleReconnect,
  });

  useEffect(() => {
    sendWsMessageRef.current = sendWsMessage;
  }, [sendWsMessage]);

  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const blockedUsersList = await getBlockedUsers();
        setBlockedUsers(blockedUsersList);

        const statusMap = {};
        blockedUsersList.forEach(user => {
          statusMap[user.id] = true;
        });
      } catch (error) {
        console.error('Error fetching blocked users:', error);
      }
    };

    fetchBlockedUsers();
  }, []);

  const fetchPinMessage = async (friendId) => {
    const res = await getPinPrivateMessage(friendId);

    if (!res) {
      setPinMessage(null);
      return;
    }
    setPinMessage(res);
    try {
    } catch (error) {
      console.error('Error fetching pin message:', error);
    }
  }

  const handleVoiceConfirm = (blob) => {
    if (!blob || !selectedFriend) return;

    audioBlobRef.current = blob;

    sendVoiceMessage();
  };

  const sendVoiceMessage = async () => {
    if (!audioBlobRef.current || audioBlobRef.current.size === 0) {
      setError('Empty voice recording');
      return;
    }
    cancelReply();

    const blobToSend = audioBlobRef.current;
    audioBlobRef.current = null;

    const tempId = `temp-voice-${Date.now()}`;
    const tempMsg = {
      id: tempId,
      temp_id: tempId,
      sender_id: profile.id,
      receiver_id: selectedFriend.id,
      content: URL.createObjectURL(blobToSend),
      message_type: 'voice',
      is_read: false,
      is_temp: true,
      voice_duration: Math.max(recordingTime, 1),

      reply_to_id: replyTo?.id || null,
      reply_to: replyTo
        ? {
          id: replyTo.id,
          sender_username: replyTo.sender?.username,
          content: replyTo.content,
          message_type: replyTo.message_type,
        }
        : null,

      sender: {
        id: profile.id,
        username: profile.username,
        avatar_url: getUserAvatar(profile),
      },

      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMsg]);
    requestAnimationFrame(() => {
      scrollToBottomIfNeeded('smooth');
    });

    const formData = new FormData();
    formData.append('voice_file', blobToSend, 'voice.webm');
    formData.append('duration', tempMsg.voice_duration.toString());
    formData.append('temp_id', tempId);

    if (replyTo?.id) {
      formData.append('reply_to_id', replyTo.id);
    }

    try {
      const sentMessage = await apiSendVoiceMessage(selectedFriend.id, formData);

      setMessages((prev) =>
        prev.map((m) =>
          m.temp_id === tempId
            ? {
              ...sentMessage,
              is_temp: false,
              sender: {
                id: profile.id,
                username: profile.username,
                avatar_url: getUserAvatar(profile),
              },
            }
            : m
        )
      );
    } catch (err) {
      console.error(err.response?.data || err);
      setError(err.response?.data?.message || 'Failed to send voice');

      setMessages((prev) => prev.filter((m) => m.temp_id !== tempId));
    }
  };

  const removeMedia = (id) => {
    setMediaPreviews((prev) => {
      const itemToRemove = prev.find((item) => item.id === id);

      if (itemToRemove?.url) {
        URL.revokeObjectURL(itemToRemove.url);
      }

      const updated = prev.filter((item) => item.id !== id);

      selectedFilesRef.current = updated.map(
        (item) => item.file
      );

      return updated;
    });
  };

  useEffect(() => {
    return () => {
      mediaPreviews.forEach((item) => {
        if (item.url) {
          URL.revokeObjectURL(item.url);
        }
      });
    };
  }, []);

  const handleFileUpload = async (file) => {
    if (!selectedFriend) return;

    const tempId = `temp-file-${crypto.randomUUID()}`;
    const fileUrl = URL.createObjectURL(file);

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    const messageType = isImage
      ? "image"
      : isVideo
        ? "video"
        : "file";

    try {
      setUploadingImage(true);
      cancelReply();

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          temp_id: tempId,
          content: fileUrl,
          message_type: messageType,
          is_temp: true,

          sender_id: profile.id,
          sender: {
            id: profile.id,
            username: profile.username,
            avatar_url: getUserAvatar(profile),
          },

          sender_username: profile.username,
          sender_avatar_url: getUserAvatar(profile),

          created_at: new Date().toISOString(),

          file_size: file.size,
          file_name: file.name,

          reply_to_id: replyTo?.id || null,
          reply_to: replyTo
            ? {
              id: replyTo.id,
              sender_username: replyTo.sender?.username,
              content: replyTo.content,
              message_type: replyTo.message_type,
            }
            : null,

          is_read: false,
        },
      ]);

      await sendMediaMessage(
        selectedFriend.id,
        file,
        messageType,
        replyTo?.id,
        tempId
      );

      setMessages((prev) => prev.filter((m) => m.id !== tempId));

    } catch (err) {
      console.error("Upload error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    const previews = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file",
      sending: false
    }));

    setMediaPreviews((prev) => [...prev, ...previews]);

    selectedFilesRef.current = [
      ...selectedFilesRef.current,
      ...files
    ];

    e.target.value = "";
  };

  const handleReplace = (message) => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept =
      "image/*,video/*,.pdf,.doc,.docx,.zip,.rar";

    input.onchange = async (e) => {
      const file = e.target.files?.[0];

      if (!file) return;

      const previewUrl = URL.createObjectURL(file);

      try {
        // optimistic update
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id
              ? {
                ...m,
                content: previewUrl,
                file_size: file.size,
                is_edited: true,
              }
              : m
          )
        );

        await replaceFileMessage(message.id, file);

      } catch (err) {
        console.error(err);

        // rollback
        setMessages((prev) =>
          prev.map((m) =>
            m.id === message.id ? message : m
          )
        );
      }
    };

    input.click();
  };

  const handleDeleteMessage = (messageId, isTemp = false) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    setMessageToDelete({ id: messageId, isTemp, message });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!messageToDelete) return;
    setIsDeleting(true);
    const { id, isTemp, message } = messageToDelete;
    const isImage = message.message_type === 'image';

    if (!isTemp) {
      setDeleteConfirmOpen(false);
      try {
        if (isImage) {
          await deleteImageMessage(id);
        } else {
          await deleteMessage(id);
        }
        setMessages(prev => prev.filter(m => m.id !== id));
      } catch (err) {
        setError(t('failed_delete_message'));
        setMessages(prev => [...prev, message]);
      }
    }
    setIsDeleting(false);
    setMessageToDelete(null);
  };

  const handleTypingStart = useCallback(() => {
    if (!selectedFriend || !isConnected) return;
    sendWsMessage({ type: 'typing', is_typing: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendWsMessage({ type: 'typing', is_typing: false });
    }, 3000);
  }, [selectedFriend, isConnected, sendWsMessage]);

  const buildSeenBy = (msg) => {
    if (msg.seen_by && Array.isArray(msg.seen_by)) {
      return msg.seen_by.map(s => ({
        user_id: s.user_id || s.userId,
        username: s.username,
        avatar_url: s.avatar_url || s.avatarUrl,
        seen_at: s.seen_at || s.seenAt,
      }));
    }

    if (msg.is_read) {
      const otherUserId = msg.receiver_id === profile?.id ? selectedFriend.id : profile.id;
      return [{
        user_id: otherUserId,
        username: msg.receiver_id === profile?.id ? selectedFriend.username : profile.username,
        avatar_url: msg.receiver_id === profile?.id ? getUserAvatar(selectedFriend) : getUserAvatar(profile),
        seen_at: msg.read_at || new Date().toISOString(),
      }];
    }

    return [];
  };

  const loadInitialMessages = async () => {
    if (!selectedFriend) return;

    setLoadingInitial(true);
    setHasMore(true);

    try {
      const data = await getPrivateChat(selectedFriend.id, LIMIT, 0);

      if (data.length < LIMIT) setHasMore(false);

      const enhanced = enhanceMessages(data);

      setMessages(
        enhanced.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      );

      setPage(1);

      requestAnimationFrame(() => scrollToBottom(true));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInitial(false);
    }
  };

  const dedupeMessages = (messages) => {
    const map = new Map();
    messages.forEach(msg => {
      map.set(msg.id, msg);
    });
    return Array.from(map.values());
  };

  const loadMoreMessages = async () => {
    if (!selectedFriend || loadingMoreRef.current || !hasMore) return;

    const container = messagesContainerRef.current;
    if (!container) return;

    const prevScrollHeight = container.scrollHeight;

    setLoadingMore(true);
    loadingMoreRef.current = true;

    try {
      const data = await getPrivateChat(selectedFriend.id, LIMIT, page * LIMIT);

      if (data.length < LIMIT) setHasMore(false);

      const enhanced = enhanceMessages(data);

      setMessages(prev => {
        const merged = dedupeMessages([...enhanced, ...prev])
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); // old → new
        return merged;
      });

      setPage(prev => prev + 1);

      requestAnimationFrame(() => {
        const newScrollHeight = container.scrollHeight;
        container.scrollTop = newScrollHeight - prevScrollHeight;
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMore(false);
      loadingMoreRef.current = false;
    }
  };

  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container || loadingMoreRef.current || !hasMore) return;

    if (container.scrollTop < 50) {
      loadMoreMessages();
    }
  };

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (!messages.length) return;
    if (initialScrollDone.current) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
        initialScrollDone.current = true;
      });
    });
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMoreRef.current, page]);

  const enhanceMessages = (chatMessages) => {
    return chatMessages
      .filter(msg => !blockedUsers.some(u => u.id === msg.sender_id))
      .map(msg => {
        const messageType = msg.message_type;
        const sender = {
          id: msg.sender_id,
          username: msg.sender_id === profile.id ? profile.username : selectedFriend.username,
          avatar_url: getUserAvatar(msg.sender_id === profile.id ? profile : selectedFriend),
        };
        const seen_by = buildSeenBy(msg);
        return { ...msg, sender, seen_by, message_type: messageType, is_temp: false };
      });
  };

  <EmojiButton
    onSelect={(emoji) => setNewMessage(prev => prev + emoji)}
    disabled={!selectedFriend || uploadingImage || isRecording}
    placement="top-start"
    width={340}
    height={400}
    buttonProps={{
      sx: { color: 'primary.main' }
    }}
  />

  const sendTextMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;

    const tempId = `temp-${Date.now()}`;

    const tempMsg = {
      id: tempId,
      temp_id: tempId,
      sender_id: profile.id,
      receiver_id: selectedFriend.id,
      content: newMessage.trim(),
      message_type: 'text',
      reply_to_id: replyTo?.id || null,
      reply_to: replyTo
        ? {
          id: replyTo.id,
          sender_username: replyTo.sender?.username,
          content: replyTo.content,
          message_type: replyTo.message_type,
        }
        : null,
      is_temp: true,
      created_at: new Date().toISOString(),
      sender: {
        id: profile.id,
        username: profile.username,
        avatar_url: getUserAvatar(profile),
      },
    };

    setNewMessage('');
    setReplyTo(null);

    const payload = {
      type: 'message',
      content: tempMsg.content,
      message_type: 'text',
      temp_id: tempId,
      reply_to_id: replyTo?.id || undefined,
    };

    sendWsMessage(payload);

    requestAnimationFrame(() => {
      scrollToBottomIfNeeded('smooth');
    });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !audioUrl && selectedFilesRef.current.length === 0) return;

    setSending(true);

    try {
      if (newMessage.trim()) {
        await sendTextMessage();
      }

      if (audioBlobRef.current) {
        await sendVoiceMessage();
      }

      if (selectedFilesRef.current.length > 0) {
        // Keep files for upload
        const filesToUpload = [...selectedFilesRef.current];

        // Clear UI immediately
        setMediaPreviews([]);
        selectedFilesRef.current = [];

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        // Upload in background
        await Promise.all(
          filesToUpload.map((file) => handleFileUpload(file))
        );

        // Cleanup object URLs after upload
        filesToUpload.forEach((file) => {
          const preview = mediaPreviews.find(
            (item) => item.file === file
          );

          if (preview?.url) {
            URL.revokeObjectURL(preview.url);
          }
        });
      }

      setNewMessage('');
      setAudioUrl(null);
      setReplyTo(null);
      setError(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = null;
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || t('failed_send_message'));
    } finally {
      setSending(false);
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    if (e.target.value.trim() && selectedFriend && isConnected) {
      handleTypingStart();
    }
  };

  const handleForwardMessage = (message, targets) => {

    sendWsMessage({
      type: "forward",
      message_id: message.id,
      targets: {
        users: targets.users || [],
        groups: targets.groups || []
      }
    })
  };

  const scrollToBottom = (smooth = true) => {
    const container = messagesContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const handleEditMessage = async (messageId, newContent) => {
    if (!newContent.trim()) return;

    const message = messages.find(
      (m) => m.id === messageId || m.temp_id === messageId
    );
    if (!message) return;

    const oldContent = message.content;

    const realMessageId = tempToRealIdMap.current[messageId] || messageId;

    setMessages((prev) =>
      prev.map((m) => {
        const matches = m.id === messageId || m.id === realMessageId || m.temp_id === messageId;
        if (matches) {
          return {
            ...m,
            content: newContent,
            edited_at: new Date().toISOString(),
            edited: true,
            message_type: m.message_type,
            sender: m.sender,
            is_temp: m.is_temp,
          };
        }
        return m;
      })
    );

    try {
      await editMessage(realMessageId, newContent);

      setSuccess(t("message_edited"));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      console.error("Edit failed:", err);
      setError(t("failed_edit_message"));

      setMessages((prev) =>
        prev.map((m) => {
          const matches = m.id === messageId || m.id === realMessageId || m.temp_id === messageId;
          if (matches) {
            return {
              ...m,
              content: oldContent,
              edited_at: m.created_at,
              edited: false,
            };
          }
          return m;
        })
      );
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleReaction = async (messageId, emoji) => {
    try {
      await toggleReaction(messageId, emoji);
    } catch (error) {
      console.error(error);
    }
  }

  const handlePinMessage = async (messageId) => {
    try {
      await togglePinPrivateMessage(messageId);
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message);
    }
  }

  const handleStartCall = (callType) => {
    if (!selectedFriend) return;

    console.log("call type", callType)
    send({
      type: "call_start",
      scope: "private",
      to: selectedFriend.id,
      call_type: callType
    })

    setCallRequest({
      status: 'waiting',
      name: selectedFriend.name,
      avatar: selectedFriend.avatar,
      type: 'private',
      call_type: callType
    })

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

  if (loadingInitial) {
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

  const renderReplyMessage = (message) => {
    return (
      <Typography variant="body2" noWrap>
        {message.message_type === 'text' && message.content}
        {message.message_type === 'video' && 'Video'}
        {message.message_type === 'image' && 'Image'}
        {message.message_type === 'file' && 'Doument'}
        {message.message_type === 'voice' && 'Voice message'}
        {message.message_type === 'system' && 'Call'}
      </Typography>
    )
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        height: '88vh',
        overflow: 'auto',
        borderColor: 'divider',
        bgcolor: 'transparent',
        mx: { sm: 'auto', md: 0 },
        position: 'relative'
      }}
    >
      {/* Delete Confirmation */}
      {deleteConfirmOpen && messageToDelete && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            bgcolor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setDeleteConfirmOpen(false)}
        >
          <Box
            sx={{
              bgcolor: 'white',
              borderRadius: '12px',
              p: 3,
              maxWidth: 400,
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom>
              {t('delete')} {messageToDelete.message.message_type === 'image' ? 'Image' : 'Message'}?
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {t('irreversible_action')}.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                onClick={() => setDeleteConfirmOpen(false)}
                variant="outlined"
              >
                {t('cancel')}
              </Button>
              <Button
                onClick={confirmDelete}
                variant="contained"
                color="error"
                disabled={isDeleting}
              >
                {t('delete')}
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 3, width: { xs: '100%', sm: '100%' }, height: '88vh' }}>

        <Drawer
          anchor='right'
          open={openDrawer}
          onClose={toggleDrawer}>
          {DrawerBox}
        </Drawer>

        {showFriend && (
          <Box
            sx={{
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              bgcolor: isError ? '#ff8b8911' : '#f8f9fa',
              overflow: 'hidden',
              border: 1,
              borderColor: isError ? 'error.main' : 'divider',
            }}>
            {selectedFriend && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    px: { xs: 2, md: 3 },
                    py: { xs: 1.25 },
                    boxShadow: '0px 2px 4px rgba(0,0,0,0.12)',
                    '&:hover': { bgcolor: 'grey.200' },
                  }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <IconButton
                      edge="start"
                      color="inherit"
                      onClick={toggleGroupList}
                      sx={{
                        display: { xs: 'block', md: 'none' }
                      }}
                    >
                      <ArrowBackIcon />
                    </IconButton>
                    <Avatar
                      src={getUserAvatar(selectedFriend.avatar)}
                      sx={{
                        width: { xs: 38, md: 44 },
                        height: { xs: 38, md: 44 },
                        border: 1,
                        borderColor: 'divider',
                        p: 0.25
                      }}
                      onClick={() => setProfileDialog(selectedFriend)}
                    >
                      {selectedFriend.name.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="h6" fontWeight="600">{selectedFriend.name}</Typography>
                      <Typography sx={{ display: { xs: 'block', md: 'none' } }} variant="caption" color="text.secondary">{status.text}</Typography>
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
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
                      onClick={() => handleStartCall({ callType: "voice" })}
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
                      onClick={() => handleStartCall({ callType: "video" })}
                    />
                  </Box>
                </Box>

                {pinMessage?.content && (
                  <Box
                    sx={{
                      position: "absolute",
                      mt: 9,
                      ml: 0.5,
                      mr: 0.5,
                      zIndex: 999,
                      width: { xs: '99%', md: '99%' },

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
                          {pinMessage.pinned_by_user?.id === currentChatId
                            ? "Pinned by You"
                            : `Pinned by ${pinMessage.pinned_by_user?.username}`}
                          {" • "}
                          {formatCambodiaTime(pinMessage.pinned_at)}
                          )
                        </Typography>
                      </Box>

                      <Box
                        onClick={() => scrollToMessage(pinMessage.id)}
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
                      >
                        {renderPinnedContent(pinMessage)}
                      </Box>
                    </Box>

                    {/* Close Button */}
                    <IconButton
                      size="small"
                      onClick={() => handlePinMessage(pinMessage.id)}
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
                  ref={messagesContainerRef}
                  className="messages-area"
                  sx={{
                    flex: 1,
                    overflowY: 'auto',
                    px: { xs: 1, sm: 2 },
                    py: { xs: 1, sm: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    minHeight: { xs: '200px', sm: 'auto' },
                  }}
                >
                  {loadingMore && (
                    <Box display="flex" justifyContent="center" alignItems="center" mt={2}>
                      <CircularProgress />
                    </Box>
                  )}
                  {messages.length === 0 ? (
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      height: '100%',
                      flexDirection: 'column',
                      color: 'text.secondary',
                    }}>
                      <ModeCommentRoundedIcon sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">{t('no_message_yet')}</Typography>
                      <Typography color="text.secondary">{t('say_hello')} {selectedFriend.name}!</Typography>
                    </Box>
                  ) : (
                    messages.map((message) => {

                      const isPinned = message.id === pinMessage?.id;
                      const isMine = message.sender_id === profile?.id;
                      return (
                        <Box
                          key={message.id}
                          data-message-id={message.id}
                          ref={(el) => {
                            if (el) messageRefs.current[message.id] = el;
                          }}
                          sx={{
                            flexShrink: 0,

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
                          }}
                        >
                          <ChatMessage
                            message={message}
                            isMine={isMine}
                            onUpdate={handleEditMessage}
                            onDelete={handleDeleteMessage}
                            onForward={() => {
                              setSelectedMessage(message);
                              toggleDrawer();
                            }}
                            onReply={() => handleReply(message)}
                            userId={user.id}
                            onReplace={() => handleReplace(message)}
                            onReact={handleReaction}
                            onPin={handlePinMessage}
                            isPinned={isPinned}
                            onScrollToMessage={scrollToMessage}
                            onStartCall={() => handleStartCall({ callType: "voice" })}
                          />
                        </Box>
                      );
                    })
                  )}
                </Box>

                {mediaPreviews.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1,
                      flexWrap: "wrap",
                      maxHeight: 120,
                      overflowY: "auto",
                      py: 1,
                      px: 1
                    }}
                  >
                    {mediaPreviews.map((media) => (
                      <Box
                        key={media.id}
                        sx={{
                          position: "relative",
                          width: 48,
                          height: 48,
                          flexShrink: 0,
                          mb: 1
                        }}
                      >
                        {/* Remove Button */}
                        <IconButton
                          size="small"
                          onClick={() => removeMedia(media.id)}
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

                        {/* Image */}
                        {media.type === "image" && (
                          <img
                            src={media.url}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        )}

                        {/* Video */}
                        {media.type === "video" && (
                          <video
                            src={media.url}
                            muted
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        )}

                        {/* File */}
                        {media.type === "file" && (
                          <Box
                            sx={{
                              height: "100%",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              p: 1,
                              textAlign: "center"
                            }}
                          >
                            <InsertDriveFileIcon
                              sx={{ fontSize: 36, color: "primary.main" }}
                            />
                            <Typography
                              variant="caption"
                              sx={{
                                mt: 0.5,
                                maxWidth: "100%",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }}
                            >
                              {media.name}
                            </Typography>
                          </Box>
                        )}

                        {/* Uploading Overlay */}
                        {media.sending && (
                          <Box
                            sx={{
                              position: "absolute",
                              inset: 0,
                              bgcolor: "rgba(0,0,0,0.45)",
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center"
                            }}
                          >
                            <CircularProgress size={28} sx={{ color: "#fff" }} />
                          </Box>
                        )}
                      </Box>
                    ))}

                    <Box
                      component="label"
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
                      <input
                        hidden
                        multiple
                        type="file"
                        onChange={handleFileSelect}
                        accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar"
                      />
                    </Box>
                  </Box>
                )}

                {replyTo && (
                  <Box
                    sx={{
                      p: 1,
                      bgcolor: "grey.200",
                      borderRadius: 2,
                      borderLeft: "4px solid #1976d2",
                      display: 'flex',
                      justifyContent: 'space-between',
                      alightItems: 'center',
                      width: '97%',
                      mx: 1
                    }}
                  >
                    <Box>
                      <Typography variant="caption" fontWeight={600}>
                        Replying to {replyTo.sender.username}
                      </Typography>
                      {renderReplyMessage(replyTo)}
                    </Box>

                    <IconButton size="small" onClick={cancelReply}>
                      <CloseIcon />
                    </IconButton>
                  </Box>
                )}

                <Box
                  className="input-area"
                  sx={{
                    p: 1,
                    borderTop: 1,
                    borderColor: isError ? 'error.main' : 'divider',
                    bgcolor: 'white',
                    display: 'flex',
                    alightItems: 'center',
                    gap: { xs: 0.5, sm: 1.5 },
                    flexShrink: 0,
                    minHeight: { xs: '60px', sm: 'auto' }
                  }}>

                  {!showTextbox && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        width: isRecording ? '100%' : 150
                      }}
                    >
                      <input
                        accept="image/*,video/*,.pdf,.doc,.docx,.zip,.rar"
                        multiple
                        style={{ display: 'none' }}
                        id="image-upload" type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                      />
                      <label htmlFor="image-upload">
                        <IconButton
                          variant='contained'
                          component="span"
                          size='small'
                          disabled={!selectedFriend || uploadingImage}>
                          {uploadingImage ? <AttachFileIcon /> : <AttachFileIcon />}
                        </IconButton>
                      </label>

                      <VoiceRecorder
                        onConfirm={handleVoiceConfirm}
                        onRecordingChange={setIsRecording}
                      />

                      {!isRecording && (
                        <Box sx={{ position: 'relative' }}>
                          <IconButton
                            size='small'
                            ref={emojiButtonRef}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            disabled={!selectedFriend || uploadingImage || isRecording}
                            sx={{
                              fontSize: 50,
                              color: 'orange'
                            }}
                          >
                            {showEmojiPicker ? <EmojiEmotionsIcon /> : <InsertEmoticonIcon />}
                          </IconButton>

                          {showEmojiPicker && (
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

                  {!isRecording && (
                    <TextField
                      fullWidth
                      size="small"
                      placeholder={!selectedFriend ? t('select_friend') : t('type_message')}
                      value={newMessage}
                      onChange={handleInputChange}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && selectedFriend && !isRecording) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      onFocus={() => setShowTextbox(true)}
                      onBlur={() => setShowTextbox(false)}
                      multiline
                      maxRows={3}
                      disabled={!selectedFriend || uploadingImage || isRecording}
                      sx={{
                        bgcolor: 'grey.100',
                        borderRadius: 2,
                        '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                      }}
                    />
                  )}

                  {!isRecording && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleSendMessage}
                      disabled={
                        !selectedFriend || sending ||
                        (!newMessage.trim() && !audioUrl && mediaPreviews.length === 0)
                      }
                      sx={{
                        minWidth: 30,
                        borderRadius: 2,
                        py: 1,
                        px: 1.5
                      }}
                    >
                      <SendIcon />
                    </Button>
                  )}

                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
      <FriendProfileDialog
        open={Boolean(profileDialog)}
        onClose={() => setProfileDialog(null)}
        profile={profileDialog}
        onCall={handleStartCall}
        currentChatId={currentChatId}
      />

    </Box>
  );
};

export default MessagesTab;