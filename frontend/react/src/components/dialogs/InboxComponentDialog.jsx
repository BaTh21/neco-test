// InboxComponentDialog.jsx
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import MailIcon from '@mui/icons-material/Mail';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import {
    acceptFriendRequest,
    acceptGroupInvite,
    declineFriendRequest,
    deleteInvite,
    getPendingFriendRequests,
    getPendingGroupInvites,
    refreshTokenIfNeeded
} from '../../services/api';
import { websocketService } from '../../services/websocketService';
import { formatCambodiaTime } from '../../utils/dateUtils';
import DeleteDialog from './DeleteDialog';

import { Dialog, DialogActions, DialogContent, DialogTitle, Paper } from '@mui/material';
import { useRef } from "react";
import Draggable from "react-draggable";
import { useTranslation } from 'react-i18next';

function DraggablePaper(props) {
    const nodeRef = useRef(null);

    return (
        <Draggable
            nodeRef={nodeRef}
            handle="#draggable-dialog-title"
            cancel={'[class*="MuiDialogContent-root"]'}
        >
            <div ref={nodeRef} style={{ width: '100%', justifyContent: 'center', display: 'flex' }}>
                <Paper {...props} />
            </div>
        </Draggable>
    );
}

// Export a function to get the current friend request count for other components
let externalFriendRequestCount = 0;
let externalGroupInviteCount = 0;
let externalNewMessageCount = 0;
let externalTotalNotificationCount = 0;
let externalNotificationCallback = null;

export const getFriendRequestCount = () => externalFriendRequestCount;
export const getGroupInviteCount = () => externalGroupInviteCount;
export const getNewMessageCount = () => externalNewMessageCount;
export const getTotalNotificationCount = () => externalTotalNotificationCount;

export const onNotificationCountChange = (callback) => {
    externalNotificationCallback = callback;
    return () => { externalNotificationCallback = null; };
};

// Helper to update all counts and notify callback
const updateExternalCounts = (friendCount, groupCount, messageCount) => {
    externalFriendRequestCount = friendCount;
    externalGroupInviteCount = groupCount;
    externalNewMessageCount = messageCount;
    externalTotalNotificationCount = friendCount + groupCount + messageCount;

    if (externalNotificationCallback) {
        externalNotificationCallback({
            friendRequests: friendCount,
            groupInvites: groupCount,
            newMessages: messageCount,
            total: externalTotalNotificationCount
        });
    }
};

export default function InboxComponent({ open, onClose, onSuccess, showBadgeOnButton = null }) {
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletePopup, setDeletePopup] = useState(false);
    const [inviteId, setInviteId] = useState(null);
    const [processingInviteId, setProcessingInviteId] = useState(null);

    const [friendRequests, setFriendRequests] = useState([]);
    const [newMessages, setNewMessages] = useState([]);
    const [wsConnected, setWsConnected] = useState(false);
    const [loadingFriendRequests, setLoadingFriendRequests] = useState(false);

    // State for tracking total notification counts
    const [friendRequestCount, setFriendRequestCount] = useState(0);
    const [groupInviteCount, setGroupInviteCount] = useState(0);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [totalNotificationCount, setTotalNotificationCount] = useState(0);
    const { t, i18n } = useTranslation();

    // Update counts whenever friendRequests, invites, or newMessages change
    useEffect(() => {
        const friendCount = Array.isArray(friendRequests) ? friendRequests.length : 0;
        const groupCount = Array.isArray(invites) ? invites.length : 0;
        const messageCount = Array.isArray(newMessages) ? newMessages.length : 0;
        const total = friendCount + groupCount + messageCount;

        setFriendRequestCount(friendCount);
        setGroupInviteCount(groupCount);
        setNewMessageCount(messageCount);
        setTotalNotificationCount(total);

        // Update external counts
        updateExternalCounts(friendCount, groupCount, messageCount);
    }, [friendRequests, invites, newMessages]);

    // Initialize arrays on mount
    useEffect(() => {
        if (!Array.isArray(friendRequests)) {
            setFriendRequests([]);
        }
        if (!Array.isArray(invites)) {
            setInvites([]);
        }
        if (!Array.isArray(newMessages)) {
            setNewMessages([]);
        }
    }, []);

    const fetchInvites = async () => {
        try {
            setLoading(true);
            const res = await getPendingGroupInvites();
            setInvites(res);
        } catch (error) {
            console.error("Error fetching invites:", error);
            setInvites([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchFriendRequests = async () => {
        try {
            setLoadingFriendRequests(true);

            // Check and refresh token if needed
            const tokenResult = await refreshTokenIfNeeded();
            if (!tokenResult.success) {
                toast.error("Session expired. Please login again.");
                setFriendRequests([]);
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
                return;
            }

            const response = await getPendingFriendRequests();

            if (response && Array.isArray(response)) {
                const normalizedRequests = response.map((req, index) => ({
                    friend_request_id: req.friend_request_id || req.id || `req-${index}`,
                    requester_id: req.requester_id || req.id || 0,
                    requester_username: req.requester_username || req.username || t('unknown_user'),
                    requester_avatar_url: req.requester_avatar_url || req.avatar_url || '',
                    created_at: req.created_at || new Date().toISOString(),
                    status: req.status || 'pending'
                }));

                setFriendRequests(normalizedRequests);
            } else {
                console.warn("Response is not an array or empty:", response);
                setFriendRequests([]);
            }
        } catch (apiError) {
            console.error("API Error:", apiError);

            if (apiError.response?.status === 404) {
                toast.error("Friend requests endpoint not found");
            } else if (apiError.response?.status === 401) {
                toast.error("Session expired. Please login again.");
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                toast.error("Failed to load friend requests");
            }

            setFriendRequests([]);
        } finally {
            setLoadingFriendRequests(false);
        }
    };

    const handleAcceptInvite = async (inviteId) => {
        try {
            setProcessingInviteId(inviteId);
            await acceptGroupInvite(inviteId);
            toast.success(t("group_joined"));
            fetchInvites();
        } catch (error) {
            toast.error(error.message || t("accept_failed"));
        } finally {
            setProcessingInviteId(null);
        }
    };

    const handleDeleteInvite = async () => {
        try {
            await deleteInvite(inviteId);
            toast.success(t("invite_deleted"));
            setDeletePopup(false);
            fetchInvites();
        } catch (error) {
            toast.error(error.message || t("delete_faileds"));
        }
    };

    // WebSocket message handlers
    const handleFriendRequest = useCallback((data) => {
        console.log('📬 Friend request received:', data);
        if (data.type === 'friend_request') {
            const requestData = data.data || data;

            toast.info(`${t('new_friend_request')} ${requestData.requester_username}`, {
                position: "top-right",
                autoClose: 5000,
            });

            setFriendRequests(prev => {
                const currentRequests = Array.isArray(prev) ? prev : [];
                const requestId = requestData.id || requestData.friend_request_id;

                // Check if already exists
                if (currentRequests.some(req => req.friend_request_id === requestId)) {
                    return currentRequests;
                }

                return [...currentRequests, {
                    friend_request_id: requestId,
                    requester_id: requestData.requester_id,
                    requester_username: requestData.requester_username,
                    requester_avatar_url: requestData.requester_avatar_url || '',
                    created_at: requestData.created_at || new Date().toISOString(),
                    status: 'pending'
                }];
            });
        }
    }, []);

    const handleFriendRequestSent = useCallback((data) => {
        if (data.type === 'friend_request_sent') {
            toast.success(`${t('friend_request_sent')} ${data.data?.recipient_username}`, {
                position: "top-right",
                autoClose: 3000,
            });
        }
    }, []);

    const handleAcceptFriendRequest = async (requesterId, friendRequestId) => {
        try {
            const response = await acceptFriendRequest(requesterId);
            toast.success(response.msg || t("friend_accepted"));

            // Remove from list
            setFriendRequests(prev => {
                const currentRequests = Array.isArray(prev) ? prev : [];
                return currentRequests.filter(req => req.requester_id !== requesterId);
            });
        } catch (error) {
            console.error("Error accepting friend request:", error);
            toast.error(error.response?.data?.detail || t("accept_friend_failed"));
        }
    };

    const handleDeclineFriendRequest = async (requesterId, friendRequestId) => {
        try {
            const response = await declineFriendRequest(requesterId);
            toast.success(response.msg || t("friend_declined"));

            // Remove from list
            setFriendRequests(prev => {
                const currentRequests = Array.isArray(prev) ? prev : [];
                return currentRequests.filter(req => req.requester_id !== requesterId);
            });
        } catch (error) {
            toast.error(error.response?.data?.detail || t("decline_friend_failed"));
        }
    };

    const handleGroupInvite = useCallback((data) => {
        if (data.type === 'group_invite') {
            const groupName = data.data?.group_name || 'a group';
            toast.info(`${t('new_group_invite')} ${groupName}`);
            fetchInvites(); // Refresh invites
        }
    }, []);

    const handleNewMessage = useCallback((data) => {
        if (data.type === 'message') {
            setNewMessages(prev => {
                const currentMessages = Array.isArray(prev) ? prev : [];
                if (currentMessages.some(msg => msg.id === data.id)) {
                    return currentMessages;
                }
                return [...currentMessages, {
                    type: 'message',
                    ...data
                }];
            });

            if (data.sender_username) {
                const preview = data.content?.length > 50
                    ? `${data.content.substring(0, 50)}...`
                    : data.content || "New message";
                toast.info(`${t('new_message')} ${data.sender_username}: ${preview}`);
            }
        }
    }, []);

    const handleFriendRequestAccepted = useCallback((data) => {
        if (data.type === 'friend_request_accepted') {
            const requestData = data.data || data;
            toast.success(`${requestData.friend_username} accepted your friend request!`);

            setFriendRequests(prev => {
                const currentRequests = Array.isArray(prev) ? prev : [];
                return currentRequests.filter(req => req.requester_id !== requestData.friend_id);
            });
        }
    }, []);

    const handleFriendRequestDeclined = useCallback((data) => {
        if (data.type === 'friend_request_declined') {
            const requestData = data.data || data;
            toast.info(`${requestData.declined_by_username} declined your friend request`);

            setFriendRequests(prev => {
                const currentRequests = Array.isArray(prev) ? prev : [];
                return currentRequests.filter(req => req.requester_id !== requestData.declined_by_id);
            });
        }
    }, []);

    const handleFriendAdded = useCallback((data) => {
        if (data.type === 'friend_added') {
            const requestData = data.data || data;
            toast.success(`You are now friends with ${requestData.friend_username}!`);

            setFriendRequests(prev => {
                const currentRequests = Array.isArray(prev) ? prev : [];
                return currentRequests.filter(req => req.requester_id !== requestData.friend_id);
            });
        }
    }, []);

    const handleUnfriended = useCallback((data) => {
        if (data.type === 'unfriended') {
            const requestData = data.data || data;
            toast.info(`${requestData.unfriended_by_username} unfriended you`);
        }
    }, []);

    // WebSocket connection management
    useEffect(() => {
        if (open) {
            console.log('📬 Opening inbox...');

            // Connect WebSocket with proper error handling
            console.log('🔌 Initializing WebSocket...');

            const connectWebSocket = async () => {
                try {
                    // Check and refresh token if needed
                    const tokenResult = await refreshTokenIfNeeded();

                    if (!tokenResult.success) {
                        toast.error('Session expired. Please login again.');
                        onClose(); // Close inbox modal
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                        return;
                    }

                    // Fetch initial data
                    await fetchInvites();
                    await fetchFriendRequests();

                    // Now connect to WebSocket with valid token
                    const authResult = await websocketService.connectToNotifications();
                    console.log('✅ WebSocket connected and authenticated:', authResult);

                    const status = websocketService.getStatus();
                    setWsConnected(status.isConnected && status.isAuthenticated);

                    // Register WebSocket handlers
                    websocketService.onMessage('friend_request', handleFriendRequest);
                    websocketService.onMessage('friend_request_sent', handleFriendRequestSent);
                    websocketService.onMessage('friend_request_accepted', handleFriendRequestAccepted);
                    websocketService.onMessage('friend_request_declined', handleFriendRequestDeclined);
                    websocketService.onMessage('friend_added', handleFriendAdded);
                    websocketService.onMessage('unfriended', handleUnfriended);
                    websocketService.onMessage('group_invite', handleGroupInvite);
                    websocketService.onMessage('message', handleNewMessage);
                    websocketService.onMessage('auth_success', (data) => {
                        console.log('🎉 WebSocket authenticated:', data);
                        setWsConnected(true);
                    });

                } catch (error) {
                    console.error('❌ Failed to connect WebSocket:', error);
                    setWsConnected(false);

                    // Check if it's a token error
                    if (error.message.includes('token') ||
                        error.message.includes('expired') ||
                        error.message.includes('401') ||
                        error.message.includes('auth')) {
                        toast.error('Session expired. Please login again.');
                        onClose();
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    } else {
                        toast.error('Failed to connect to notifications: ' + error.message);
                    }
                }
            };

            connectWebSocket();

            // Monitor connection status periodically
            const connectionMonitor = setInterval(() => {
                const status = websocketService.getStatus();
                console.log('📡 WebSocket Status:', status);
                setWsConnected(status.isConnected && status.isAuthenticated);
            }, 5000);

            return () => {
                console.log('🧹 Cleaning up inbox WebSocket...');
                clearInterval(connectionMonitor);

                // Remove all handlers
                websocketService.removeHandler('friend_request');
                websocketService.removeHandler('friend_request_sent');
                websocketService.removeHandler('friend_request_accepted');
                websocketService.removeHandler('friend_request_declined');
                websocketService.removeHandler('friend_added');
                websocketService.removeHandler('unfriended');
                websocketService.removeHandler('group_invite');
                websocketService.removeHandler('message');
                websocketService.removeHandler('auth_success');
            };
        }
    }, [
        open,
        handleFriendRequest,
        handleFriendRequestSent,
        handleFriendRequestAccepted,
        handleFriendRequestDeclined,
        handleFriendAdded,
        handleUnfriended,
        handleGroupInvite,
        handleNewMessage
    ]);

    const handleSuccess = () => {
        onClose();
    };

    const handleMarkMessageAsRead = async (messageId) => {
        try {
            websocketService.send({
                type: 'read',
                message_id: messageId
            });

            setNewMessages(prev => {
                const currentMessages = Array.isArray(prev) ? prev : [];
                return currentMessages.filter(msg => msg.id !== messageId);
            });
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    };

    // Render friend requests
    const renderFriendRequests = () => {
        if (!Array.isArray(friendRequests)) {
            return (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
                    <Typography color="error" sx={{ textAlign: 'center' }}>
                        {t('error_loading_requests')}
                    </Typography>
                </Box>
            );
        }

        if (loadingFriendRequests) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    <CircularProgress size={24} />
                </Box>
            );
        }

        if (friendRequests.length === 0) {
            return (
                <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    {t('no_friend_requests')}
                </Typography>
            );
        }

        return (
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {t('friend_requests')} ({friendRequests.length})
                </Typography>
                <List sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                    {friendRequests.map((request, index) => {
                        if (!request || typeof request !== 'object') {
                            return null;
                        }

                        const requestId = request.friend_request_id || request.requester_id || `request-${index}`;
                        const requesterName = request.requester_username || t('unknown_user');

                        return (
                            <div key={requestId}>
                                <ListItem>
                                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                        {request.requester_avatar_url ? (
                                            <Avatar
                                                src={request.requester_avatar_url}
                                                sx={{ mr: 2, width: 40, height: 40 }}
                                            />
                                        ) : (
                                            <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                                                {requesterName.charAt(0).toUpperCase()}
                                            </Avatar>
                                        )}
                                        <ListItemText
                                            primary={requesterName}
                                            secondary={
                                                <Box>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {t('wants_to_be_friend')}
                                                    </Typography>
                                                    {request.created_at && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatCambodiaTime(request.created_at)}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1, ml: 2 }}>
                                        <Button
                                            startIcon={<CheckCircleIcon />}
                                            onClick={() => handleAcceptFriendRequest(request.requester_id, request.friend_request_id)}
                                            size="small"
                                            color="success"
                                            variant="contained"
                                        >
                                            {t('accept')}
                                        </Button>
                                        <Button
                                            startIcon={<DeleteIcon />}
                                            onClick={() => handleDeclineFriendRequest(request.requester_id, request.friend_request_id)}
                                            size="small"
                                            color="error"
                                            variant="outlined"
                                        >
                                            {t('decline')}
                                        </Button>
                                    </Box>
                                </ListItem>
                                {index < friendRequests.length - 1 && <Divider />}
                            </div>
                        );
                    })}
                </List>
            </Box>
        );
    };

    // Render new messages
    const renderNewMessages = () => {
        if (newMessages.length === 0) return null;

        return (
            <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {t('new_messages')} ({newMessages.length})
                </Typography>
                <List sx={{ bgcolor: 'action.hover', borderRadius: 1 }}>
                    {newMessages.map((message, index) => (
                        <div key={message.id || index}>
                            <ListItem
                                button
                                onClick={() => handleMarkMessageAsRead(message.id)}
                            >
                                <ListItemText
                                    primary={message.sender_username || 'Unknown'}
                                    secondary={
                                        <Box>
                                            <Typography variant="body2" color="text.secondary">
                                                {message.content && message.content.length > 50
                                                    ? `${message.content.substring(0, 50)}...`
                                                    : message.content || "No content"}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {formatCambodiaTime(message.created_at)}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                            {index < newMessages.length - 1 && <Divider />}
                        </div>
                    ))}
                </List>
            </Box>
        );
    };

    return (
        <>
            <DeleteDialog
                open={deletePopup}
                onClose={() => setDeletePopup(false)}
                onSuccess={handleSuccess}
                title="Delete invite"
                description="Are you sure want to delete invite?"
                onConfirm={handleDeleteInvite}
            />
            <Dialog
                open={open}
                onClose={onClose}
                aria-labelledby="inbox-dialog-title"
                aria-describedby="inbox-dialog-description"
                // PaperProps={{
                //     component: DraggablePaper, // Keeps draggable functionality
                // }}
                maxWidth="md"
                fullWidth
                sx={{
                    '& .MuiDialog-paper': {
                        width: { xs: '90%', md: 800 },
                        maxHeight: '80vh',
                        borderRadius: 2,
                    },
                }}
                PaperComponent= {DraggablePaper}
            >
                <DialogTitle id="draggable-dialog-title" sx={{ cursor: 'move' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Typography variant="h6">
                                {t('inbox')}
                                {totalNotificationCount > 0 && (
                                    <Badge
                                        badgeContent={totalNotificationCount}
                                        color="error"
                                        sx={{ ml: 2 }}
                                    />
                                )}
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: wsConnected ? 'success.main' : 'error.main'
                            }} />
                            <Typography variant="caption" color="text.secondary">
                                {wsConnected ? t('connected') : t('disconnected')}
                            </Typography>
                        </Box>
                    </Box>
                </DialogTitle>

                <DialogContent dividers>
                    {renderFriendRequests()}
                    {renderNewMessages()}

                    {/* Group Invites Section */}
                    <Box sx={{ mb: 3, mt: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            {t('pending_group_invites')} ({invites.length})
                        </Typography>

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress />
                            </Box>
                        ) : invites.length === 0 ? (
                            <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                {t('no_group_invites')}
                            </Typography>
                        ) : (
                            <List>
                                {invites.map((invite, index) => {
                                    const expiresAt = new Date(invite.expires_at).getTime();
                                    const now = Date.now();
                                    const timeDiffMs = expiresAt - now;
                                    const fiveMinutesMs = 5 * 60 * 1000;
                                    const isExpiringSoon = timeDiffMs > 0 && timeDiffMs <= fiveMinutesMs;
                                    const isExpired = timeDiffMs <= 0;

                                    return (
                                        <div key={invite.id}>
                                            <ListItem>
                                                <ListItemText
                                                    primary={`${invite.group?.name || t('unknown_group')}`}
                                                    secondary={`${t('invited_by')} ${invite.inviter?.username || t('unknown_user')} • Status: ${invite.status || 'pending'}`}
                                                />
                                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 150 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Created: {formatCambodiaTime(invite.created_at)}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color={isExpired ? "error.main" : isExpiringSoon ? "warning.main" : "text.secondary"}
                                                    >
                                                        {isExpired
                                                            ? "Expired"
                                                            : isExpiringSoon
                                                                ? "Expires in 5 minutes"
                                                                : `Expires: ${formatCambodiaTime(invite.expires_at)}`}
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => handleAcceptInvite(invite.id)}
                                                    disabled={isExpired || invite.status !== "pending" || processingInviteId === invite.id}
                                                    sx={{ color: 'green', ml: 2 }}
                                                    size="small"
                                                >
                                                    {processingInviteId === invite.id ? t('accepting') : t('accept')}
                                                </Button>

                                                <Button
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() => {
                                                        setInviteId(invite.id);
                                                        setDeletePopup(true);
                                                    }}
                                                    sx={{ color: 'red', ml: 1 }}
                                                    size="small"
                                                >
                                                    {t('delete')}
                                                </Button>
                                            </ListItem>
                                            {index < invites.length - 1 && <Divider />}
                                        </div>
                                    );
                                })}
                            </List>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ borderTop: 1, borderColor: 'divider' }}>
                    <Button variant="outlined" onClick={onClose}>
                        {t('close')}
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => {
                            fetchInvites();
                            fetchFriendRequests();
                            toast.info(t("refreshed"));
                        }}
                    >
                        {t('refresh')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* <Modal
                open={open}
                onClose={onClose}
                aria-labelledby="inbox-modal-title"
                aria-describedby="inbox-modal-description"
                PaperComponent = {DraggablePaper}
            >
                <Box 
                id="draggable-dialog-title"
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: '90%', md: 800 },
                        bgcolor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 24,
                        p: 3,
                        cursor:"move",
                        maxHeight: '80vh',
                        overflow: 'auto',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }} >
                        <Typography variant="h6" gutterBottom sx={{ flexGrow: 1 }}>
                            Inbox
                            {totalNotificationCount > 0 && (
                                <Badge
                                    badgeContent={totalNotificationCount}
                                    color="error"
                                    sx={{ ml: 2 }}
                                />
                            )}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{
                                width: 10,
                                height: 10,
                                borderRadius: '50%',
                                bgcolor: wsConnected ? 'success.main' : 'error.main'
                            }} />
                            <Typography variant="caption" color="text.secondary">
                                {wsConnected ? 'Connected' : 'Disconnected'}
                            </Typography>
                        </Box>
                    </Box>

                    {renderFriendRequests()}
                    {renderNewMessages()}

                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Pending Group Invites ({invites.length})
                        </Typography>

                        {loading ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                                <CircularProgress />
                            </Box>
                        ) : invites.length === 0 ? (
                            <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                                No pending group invites
                            </Typography>
                        ) : (
                            <List>
                                {invites.map((invite, index) => {
                                    const expiresAt = new Date(invite.expires_at).getTime();
                                    const now = Date.now();
                                    const timeDiffMs = expiresAt - now;
                                    const fiveMinutesMs = 5 * 60 * 1000;
                                    const isExpiringSoon = timeDiffMs > 0 && timeDiffMs <= fiveMinutesMs;
                                    const isExpired = timeDiffMs <= 0;

                                    return (
                                        <div key={invite.id}>
                                            <ListItem>
                                                <ListItemText
                                                    primary={`${invite.group?.name || 'Unknown Group'}`}
                                                    secondary={`Invited by ${invite.inviter?.username || 'Unknown User'} • Status: ${invite.status || 'pending'}`}
                                                />
                                                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 150 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Created: {formatCambodiaTime(invite.created_at)}
                                                    </Typography>
                                                    <Typography
                                                        variant="body2"
                                                        color={isExpired ? "error.main" : isExpiringSoon ? "warning.main" : "text.secondary"}
                                                    >
                                                        {isExpired
                                                            ? "Expired"
                                                            : isExpiringSoon
                                                                ? "Expires in 5 minutes"
                                                                : `Expires: ${formatCambodiaTime(invite.expires_at)}`}
                                                    </Typography>
                                                </Box>

                                                <Button
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => handleAcceptInvite(invite.id)}
                                                    disabled={isExpired || invite.status !== "pending" || processingInviteId === invite.id}
                                                    sx={{ color: 'green', marginLeft: 2 }}
                                                    size="small"
                                                >
                                                    {processingInviteId === invite.id ? 'Accepting...' : 'Accept'}
                                                </Button>

                                                <Button
                                                    startIcon={<DeleteIcon />}
                                                    onClick={() => {
                                                        setInviteId(invite.id);
                                                        setDeletePopup(true);
                                                    }}
                                                    sx={{ color: 'red', marginLeft: 1 }}
                                                    size="small"
                                                >
                                                    Delete
                                                </Button>
                                            </ListItem>
                                            {index < invites.length - 1 && <Divider />}
                                        </div>
                                    );
                                })}
                            </List>
                        )}
                    </Box>

                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1,
                        mt: 2,
                        pt: 2,
                        borderTop: 1,
                        borderColor: 'divider'
                    }}>
                        <Button variant="outlined" onClick={onClose}>
                            Close
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => {
                                fetchInvites();
                                fetchFriendRequests();
                                toast.info("Inbox refreshed");
                            }}
                        >
                            Refresh
                        </Button>
                    </Box>
                </Box>
            </Modal> */}
        </>
    );
}

// New component to show badge on a button
export function InboxButtonWithBadge({ onClick, children, sx = {} }) {
    const [totalNotificationCount, setTotalNotificationCount] = useState(0);

    useEffect(() => {
        const unsubscribe = onNotificationCountChange((counts) => {
            setTotalNotificationCount(counts.total);
        });
        return unsubscribe;
    }, []);

    return (
        <Badge
            badgeContent={totalNotificationCount}
            color="error"
            sx={{
                '& .MuiBadge-badge': {
                    fontSize: '0.75rem',
                    height: '20px',
                    minWidth: '20px',
                    top: 8,
                    right: 8
                }
            }}
        >
            <Button onClick={onClick} sx={sx}>
                {children}
            </Button>
        </Badge>
    );
}

// Alternative: Simple badge-only component
export function NotificationBadge({ sx = {} }) {
    const [totalNotificationCount, setTotalNotificationCount] = useState(0);

    useEffect(() => {
        const unsubscribe = onNotificationCountChange((counts) => {
            setTotalNotificationCount(counts.total);
        });
        return unsubscribe;
    }, []);

    if (totalNotificationCount === 0) return null;

    return (
        <Badge
            badgeContent={totalNotificationCount}
            color="error"
            sx={{
                '& .MuiBadge-badge': {
                    fontSize: '0.75rem',
                    height: '20px',
                    minWidth: '20px',
                    top: 8,
                    right: 8,
                },
                ...sx
            }}
        />
    );
}

// NEW: Mail Icon with Badge that shows TOTAL notification count
export function InboxIconButton({ onClick, sx = {}, size = "medium", showTooltip = true }) {
    const [totalNotificationCount, setTotalNotificationCount] = useState(0);
    const [notificationDetails, setNotificationDetails] = useState({
        friendRequests: 0,
        groupInvites: 0,
        newMessages: 0,
        total: 0
    });

    useEffect(() => {
        const unsubscribe = onNotificationCountChange((counts) => {
            setTotalNotificationCount(counts.total);
            setNotificationDetails(counts);
        });
        return unsubscribe;
    }, []);

    // Tooltip content showing breakdown
    const tooltipContent = totalNotificationCount > 0 ? (
        <Box sx={{ p: 1 }}>
            <Typography variant="body2" fontWeight="bold">Notifications</Typography>
            {notificationDetails.friendRequests > 0 && (
                <Typography variant="caption" display="block">
                    👤 {notificationDetails.friendRequests} friend request{notificationDetails.friendRequests !== 1 ? 's' : ''}
                </Typography>
            )}
            {notificationDetails.groupInvites > 0 && (
                <Typography variant="caption" display="block">
                    👥 {notificationDetails.groupInvites} group invite{notificationDetails.groupInvites !== 1 ? 's' : ''}
                </Typography>
            )}
            {notificationDetails.newMessages > 0 && (
                <Typography variant="caption" display="block">
                    💬 {notificationDetails.newMessages} new message{notificationDetails.newMessages !== 1 ? 's' : ''}
                </Typography>
            )}
        </Box>
    ) : "No new notifications";

    return (
        <Box
            sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                ...sx
            }}
        >
            <IconButton
                onClick={onClick}
                sx={{
                    color: 'inherit',
                }}
                size={size}
                title={showTooltip ? `Inbox (${totalNotificationCount} notifications)` : undefined}
            >
                <MailIcon />
            </IconButton>

            {/* Notification badge */}
            {totalNotificationCount > 0 && (
                <Badge
                    badgeContent={totalNotificationCount}
                    color="error"
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        '& .MuiBadge-badge': {
                            fontSize: '0.65rem',
                            height: '18px',
                            minWidth: '18px',
                            border: '2px solid white',
                            boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
                        }
                    }}
                />
            )}
        </Box>
    );
}

// NEW: Advanced badge showing different colors for different notification types
export function AdvancedNotificationBadge({ onClick, sx = {} }) {
    const [notificationDetails, setNotificationDetails] = useState({
        friendRequests: 0,
        groupInvites: 0,
        newMessages: 0,
        total: 0
    });

    useEffect(() => {
        const unsubscribe = onNotificationCountChange(setNotificationDetails);
        return unsubscribe;
    }, []);

    // Determine badge color based on priority
    const getBadgeColor = () => {
        if (notificationDetails.friendRequests > 0) return 'error'; // Red for friend requests
        if (notificationDetails.groupInvites > 0) return 'warning'; // Orange for group invites
        if (notificationDetails.newMessages > 0) return 'info'; // Blue for new messages
        return 'default';
    };

    return (
        <Badge
            badgeContent={notificationDetails.total}
            color={getBadgeColor()}
            sx={{
                '& .MuiBadge-badge': {
                    fontSize: '0.7rem',
                    height: '20px',
                    minWidth: '20px',
                    top: 8,
                    right: 8,
                    boxShadow: '0 0 0 2px white',
                }
            }}
        >
            <IconButton
                onClick={onClick}
                sx={{
                    color: 'inherit',
                    ...sx
                }}
            >
                <MailIcon />
            </IconButton>
        </Badge>
    );
}