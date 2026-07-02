import { Block as BlockIcon, Search as SearchIcon, CheckCircle as CheckIcon, AccessTime as AccessTimeIcon } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  ToggleButton,
  ListItemIcon,
  Tooltip,
  TextField,
  InputAdornment
} from '@mui/material';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAvatar } from '../../hooks/useAvatar';
import {
  acceptFriendRequest,
  blockUser,
  unfriend,
  sendFriendRequest,
  deletePendingRequest,
  searchUsers
} from '../../services/api';
import BlockedUsersTab from '../BlockedUsersTab';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import SuggestFriendComponent from '../friend/SuggestFriendComponent';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AssistantIcon from '@mui/icons-material/Assistant';

const FriendsTab = ({
  friends,
  pendingRequests,
  setActiveTab,
  setError,
  setSuccess,
  onDataUpdate,          // Must refetch ALL data including blocked users
  suggestFriends,
  pendingFriends,
  blockedUsers,          // Parent must provide updated array after onDataUpdate()
  currentUserId,
}) => {
  const [acceptingId, setAcceptingId] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [activeMenu, setActiveMenu] = useState(0);
  const [suggestFriend, setSuggestFriend] = useState(
    (suggestFriends || []).filter(f => f.id !== currentUserId)
  );
  const [pendingFriend, setPendingFriend] = useState(
    (pendingFriends || []).filter(p => p.friend?.id !== currentUserId)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const { t } = useTranslation();
  const { getUserAvatar, getUserInitials } = useAvatar();

  // Debug: log when blockedUsers prop changes (to verify parent refresh)
  useEffect(() => {
    console.log('[FriendsTab] blockedUsers updated:', blockedUsers);
  }, [blockedUsers]);

  useEffect(() => {
    setSuggestFriend((suggestFriends || []).filter(f => f.id !== currentUserId));
  }, [suggestFriends, currentUserId]);

  useEffect(() => {
    setPendingFriend((pendingFriends || []).filter(p => p.friend?.id !== currentUserId));
  }, [pendingFriends, currentUserId]);

  const successTimeoutRef = useRef(null);

  const showSuccessMessage = useCallback(
    (message) => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      setSuccess(message);
      successTimeoutRef.current = setTimeout(() => {
        setSuccess('');
        successTimeoutRef.current = null;
      }, 3000);
    },
    [setSuccess]
  );

  const isFriend = (userId) => friends.some(friend => friend.id === userId);
  const isPendingOutgoing = (userId) => pendingFriend.some(pf => pf.friend?.id === userId);
  const isPendingIncoming = (userId) =>
    pendingRequests.some(req => (req.requester_id || req.id) === userId);

  const getFriendRequestStatus = (userId) => {
    if (isFriend(userId)) return 'already_friend';
    if (isPendingOutgoing(userId)) return 'pending_outgoing';
    if (isPendingIncoming(userId)) return 'pending_incoming';
    return 'can_add';
  };

  const AddFriendButton = ({ userId, username }) => {
    const status = getFriendRequestStatus(userId);
    let disabled = true;
    let tooltip = '';
    let icon = <PersonAddIcon />;

    switch (status) {
      case 'already_friend':
        tooltip = t('already_friend', 'Already friends');
        icon = <CheckIcon sx={{ color: 'success.main' }} />;
        break;
      case 'pending_outgoing':
        tooltip = t('request_already_sent', 'Request sent');
        icon = <AccessTimeIcon color="warning" />;
        break;
      case 'pending_incoming':
        tooltip = t('request_pending_from_them', 'Request received - check Requests tab');
        icon = <PersonAddIcon />;
        break;
      default:
        disabled = false;
        tooltip = t('add_friend', `Add {{username}} as friend`, { username });
        icon = <PersonAddIcon />;
        break;
    }

    return (
      <Tooltip title={tooltip}>
        <span>
          <IconButton
            size="small"
            onClick={() => !disabled && handleSendFriendRequest(userId)}
            disabled={disabled}
            sx={{
              minWidth: 0,
              bgcolor: 'transparent',
              '&:hover': {
                bgcolor: 'transparent',
                transform: disabled ? 'none' : 'scale(1.2)'
              }
            }}
          >
            {icon}
          </IconButton>
        </span>
      </Tooltip>
    );
  };

  const handleAcceptRequest = async (requesterId) => {
    setAcceptingId(requesterId);
    try {
      await acceptFriendRequest(requesterId);
      showSuccessMessage(t('friend_request_accepted'));
      onDataUpdate(); // parent must refresh friends, pending, blocked
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('friend_request_accept_failed'));
    } finally {
      setAcceptingId(null);
    }
  };

  const handleActionMenuOpen = (event, friend) => {
    setActionMenuAnchor(event.currentTarget);
    setSelectedFriend(friend);
  };

  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
    setSelectedFriend(null);
  };

  const handleSendFriendRequest = async (userId) => {
    const result = await sendFriendRequest(userId);
    if (result.success) {
      showSuccessMessage(result.message);
      setSuggestFriend(prev => prev.filter(f => f.id !== userId));
      if (searchResults) {
        setSearchResults(prev => prev.filter(u => u.id !== userId));
      }
      onDataUpdate();
    } else {
      setError(result.message);
    }
  };

  const handleDeletePendingRequest = async (pendingId) => {
    const res = await deletePendingRequest(pendingId);
    if (res === true) {
      showSuccessMessage("Pending has been canceled");
      setPendingFriend(prev => prev.filter(f => f.id !== pendingId));
      onDataUpdate();
    } else {
      setError(res);
    }
  };

  const handleUnfriend = async () => {
    if (!selectedFriend) return;
    setProcessingAction('unfriend');
    try {
      await unfriend(selectedFriend.id);
      showSuccessMessage(t('unfriended_user', { username: selectedFriend.username }));
      onDataUpdate(); // parent will refresh all lists including blocked
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('unfriend_failed'));
    } finally {
      setProcessingAction(null);
      handleActionMenuClose();
    }
  };

  const handleBlock = async () => {
    if (!selectedFriend) return;
    setProcessingAction('block');
    try {
      await blockUser(selectedFriend.id);
      showSuccessMessage(t('blocked_user', { username: selectedFriend.username }));
      onDataUpdate(); // parent MUST refetch blocked users after this
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('block_user_failed'));
    } finally {
      setProcessingAction(null);
      handleActionMenuClose();
    }
  };

  const handleMessageFriend = (friend) => {
    if (typeof setActiveTab === 'function') {
      localStorage.setItem('selectedFriend', JSON.stringify(friend));
      setActiveTab(1);
      showSuccessMessage(t('opening_chat', { username: friend.username }));
    } else {
      setError(t('cannot_open_messages'));
      setTimeout(() => setError(''), 2000);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setSearchLoading(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      const filteredResults = results.filter(user => user.id !== currentUserId);
      setSearchResults(filteredResults);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || t('search_users_failed'));
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') handleSearchUsers();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  const filteredFriends = useMemo(() => {
    if (!searchTerm.trim()) return friends;
    const lowerTerm = searchTerm.toLowerCase();
    return friends.filter(
      (friend) =>
        friend.username?.toLowerCase().includes(lowerTerm) ||
        friend.email?.toLowerCase().includes(lowerTerm)
    );
  }, [friends, searchTerm]);

  const getRequesterData = (request) => ({
    id: request.friend_request_id || request.id || request.requester_id,
    requesterId: request.requester_id || request.id,
    username: request.requester_username || request.username,
    email: request.requester_email || request.email,
    avatarUrl: request.requester_avatar_url || request.avatar_url
  });

  const menus = [
    { label: `All Friends (${friends.length})`, icon: <PeopleIcon /> },
    { label: `Add Friends`, icon: <PersonAddIcon /> },
    { label: `Request (${pendingRequests.length})`, icon: <PersonSearchIcon /> },
    { label: `Pending (${pendingFriend.length})`, icon: <AccessTimeIcon /> },
    { label: `Block (${blockedUsers?.length || 0})`, icon: <BlockIcon /> },
  ];

  return (
    <Box sx={{ py: { xs: 2, sm: 2 }, maxWidth: '100%', overflowY: 'auto', overflowX: 'hidden', height: '90vh', '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
      <SuggestFriendComponent suggestFriends={suggestFriend} />
      <Typography variant="h5" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>{t('friends')}</Typography>

      {/* Tab Menu */}
      <Box onWheel={(e) => { if (e.deltaY !== 0) { e.currentTarget.scrollLeft += e.deltaY; e.preventDefault(); } }} sx={{ display: 'flex', overflowX: 'auto', scrollBehavior: 'smooth', whiteSpace: 'nowrap', '&::-webkit-scrollbar': { display: 'none' }, my: 2 }}>
        <Box sx={{ display: 'inline-flex', width: { xs: 200, md: '100%' }, whiteSpace: 'nowrap' }}>
          {menus.map((item, index) => {
            const selected = activeMenu === index;
            return (
              <ToggleButton
                key={item.label}
                value={index}
                selected={selected}
                onClick={() => { setActiveMenu(index); setSearchTerm(''); clearSearch(); }}
                sx={{ flexShrink: 0, px: 2, py: 1, minHeight: 40, border: 'none', bgcolor: 'transparent', userSelect: 'none', color: selected ? 'primary.main' : 'text.secondary', '&:hover': { bgcolor: 'action.hover', color: 'primary.main' }, '&.Mui-selected': { bgcolor: 'transparent', color: 'primary.main' }, position: 'relative', '&::after': { content: '""', position: 'absolute', bottom: 0, left: 0, width: '100%', height: 3, bgcolor: 'primary.main', transform: selected ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 0.25s ease' } }}
              >
                <ListItemIcon sx={{ minWidth: 26, color: selected ? 'primary.main' : 'text.secondary' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: selected ? 600 : 500, whiteSpace: 'nowrap' }} />
              </ToggleButton>
            );
          })}
        </Box>
      </Box>

      {/* ALL FRIENDS TAB */}
      {activeMenu === 0 && (
        <>
          <TextField fullWidth size="small" placeholder={t('search') || 'Search by name or email...'} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ mb: 2 }} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }} />
          {filteredFriends.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>{searchTerm ? t('no_matching_friends') : t('no_friends_yet')}</Typography>
          ) : (
            <List sx={{ p: 0, mb: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 1, md: 2 } }}>
              {filteredFriends.map((friend) => (
                <ListItem key={friend.id} sx={{ mb: { xs: 0, md: 1 }, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: { xs: 2, sm: 0 }, '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' }, boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' } } }} onClick={(e) => handleActionMenuOpen(e, friend)}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' }, flex: 1, minWidth: 0, gap: 1 }}>
                    <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 } }}><Avatar src={getUserAvatar(friend)} sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, border: 1, borderColor: 'divider' }}>{getUserInitials(friend.username)}</Avatar></ListItemAvatar>
                    <ListItemText primary={<Typography variant="body1" fontWeight="500" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.username}</Typography>} secondary={<Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.email}</Typography>} sx={{ my: 0, mr: { xs: 0, sm: 2 }, flex: 1, minWidth: 0 }} />
                  </Box>
                  <Tooltip title={`send ${friend.username} a message?`}>
                    <IconButton size="small" onClick={() => handleMessageFriend(friend)} sx={{ bgcolor: 'transparent', '&:hover': { bgcolor: 'transparent', transform: 'scale(1.2)' } }}><AssistantIcon color="primary.main" /></IconButton>
                  </Tooltip>
                </ListItem>
              ))}
            </List>
          )}
        </>
      )}

      {/* ADD FRIENDS TAB */}
      {activeMenu === 1 && (
        <>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField fullWidth size="small" placeholder={t('search') || 'Search by username or email...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={handleSearchKeyPress} InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }} />
            <Button variant="contained" onClick={handleSearchUsers} disabled={searchLoading || !searchQuery.trim()}>{t('search')}</Button>
          </Box>
          {searchResults !== null ? (
            searchLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
            ) : searchResults.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>{t('no_users_found')}</Typography>
            ) : (
              <List sx={{ p: 0, mb: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 1, md: 2 } }}>
                {searchResults.map((user) => (
                  <ListItem key={user.id} sx={{ mb: { xs: 0, md: 1 }, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: { xs: 2, sm: 0 }, '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' }, boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '80%', sm: 'auto' }, flex: 1, minWidth: 0, gap: 1 }}>
                      <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 } }}><Avatar src={getUserAvatar(user)} sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, border: 1, borderColor: 'divider' }}>{getUserInitials(user.username)}</Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body1" fontWeight="500" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.username}</Typography>} secondary={<Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</Typography>} sx={{ my: 0, mr: { xs: 0, sm: 2 }, flex: 1, minWidth: 0 }} />
                    </Box>
                    <AddFriendButton userId={user.id} username={user.username} />
                  </ListItem>
                ))}
              </List>
            )
          ) : (
            !suggestFriend || suggestFriend.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>{t('no_friends_yet')}</Typography>
            ) : (
              <List sx={{ p: 0, mb: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 1, md: 2 } }}>
                {suggestFriend.map((friend) => (
                  <ListItem key={friend.id} sx={{ mb: { xs: 0, md: 1 }, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: { xs: 2, sm: 0 }, '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' }, boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '80%', sm: 'auto' }, flex: 1, minWidth: 0, gap: 1 }}>
                      <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 } }}><Avatar src={getUserAvatar(friend)} sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, border: 1, borderColor: 'divider' }}>{getUserInitials(friend.username)}</Avatar></ListItemAvatar>
                      <ListItemText primary={<Typography variant="body1" fontWeight="500" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.username}</Typography>} secondary={<Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend.email}</Typography>} sx={{ my: 0, mr: { xs: 0, sm: 2 }, flex: 1, minWidth: 0 }} />
                    </Box>
                    <AddFriendButton userId={friend.id} username={friend.username} />
                  </ListItem>
                ))}
              </List>
            )
          )}
        </>
      )}

      {/* REQUEST RECEIVED TAB (Incoming) */}
      {activeMenu === 2 && (
        pendingRequests && pendingRequests.length > 0 ? (
          <Box sx={{ p: 0, mb: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 1, md: 2 } }}>
            {pendingRequests.map((request, index) => {
              const requesterData = getRequesterData(request);
              const requestId = requesterData.id || `request-${index}`;
              return (
                <Box key={requestId} sx={{ p: 1, mb: { xs: 0, md: 1 }, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: { xs: 2, sm: 0 }, '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' }, boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' }, flex: 1, minWidth: 0, gap: 1 }}>
                    <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 } }}><Avatar src={requesterData.avatarUrl || getUserAvatar(request)} sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, border: 1, borderColor: 'divider' }}>{getUserInitials(requesterData.username)}</Avatar></ListItemAvatar>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body1" fontWeight="500" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{requesterData.username || t('unknown_user')}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{requesterData.email || ''}</Typography>
                    </Box>
                  </Box>
                  <Button variant="outlined" size="small" onClick={() => handleAcceptRequest(requesterData.requesterId)} disabled={acceptingId === requesterData.requesterId} sx={{ borderRadius: '8px', minWidth: 0, mt: { xs: 1, sm: 0 }, ml: { xs: 0, sm: 2 } }}>Confirm</Button>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No requesting friend</Typography>
        )
      )}

      {/* PENDING OUTGOING TAB */}
      {activeMenu === 3 && (
        pendingFriend && pendingFriend.length > 0 ? (
          <Box sx={{ p: 0, mb: 1, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: { xs: 1, md: 2 } }}>
            {pendingFriend.map((friend) => (
              <Box key={friend.id} sx={{ p: 1, mb: { xs: 0, md: 1 }, borderRadius: '12px', border: '1px solid', borderColor: 'divider', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: { xs: 2, sm: 0 }, '&:hover': { transform: { xs: 'none', sm: 'translateY(-2px)' }, boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' } } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: { xs: '100%', sm: 'auto' }, flex: 1, minWidth: 0, gap: 1 }}>
                  <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 } }}><Avatar src={friend?.friend?.avatar_url} sx={{ width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, border: 1, borderColor: 'divider' }}>{getUserInitials(friend?.friend?.username)}</Avatar></ListItemAvatar>
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight="500" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend?.friend?.username || t('unknown_user')}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{friend?.friend?.email || ''}</Typography>
                  </Box>
                </Box>
                <Button variant="outlined" size="small" onClick={() => handleDeletePendingRequest(friend.id)} sx={{ borderRadius: '8px', minWidth: 0, mt: { xs: 1, sm: 0 }, ml: { xs: 0, sm: 2 } }}>Cancel</Button>
              </Box>
            ))}
          </Box>
        ) : (
          <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>No pending requests</Typography>
        )
      )}

      {/* BLOCKED TAB */}
      {activeMenu === 4 && (
        <BlockedUsersTab
          setError={setError}
          setSuccess={showSuccessMessage}
          blockedUser={blockedUsers || []}   // ensure array
          onDataUpdate={onDataUpdate}
        />
      )}

      {/* Action Menu (Unfriend/Block) */}
      <Menu anchorEl={actionMenuAnchor} open={Boolean(actionMenuAnchor)} onClose={handleActionMenuClose} PaperProps={{ sx: { borderRadius: '8px', minWidth: 140, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' } }} transformOrigin={{ horizontal: 'right', vertical: 'top' }} anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <MenuItem onClick={handleUnfriend} disabled={processingAction === 'unfriend'} sx={{ color: 'error.main', fontSize: { xs: '0.9rem', sm: '1rem' }, py: 1.5 }}>
          {processingAction === 'unfriend' && <CircularProgress size={16} sx={{ mr: 1 }} />}
          {processingAction === 'unfriend' ? t('unfriending') : t('unfriend')}
        </MenuItem>
        <MenuItem onClick={handleBlock} disabled={processingAction === 'block'} sx={{ color: 'error.main', fontSize: { xs: '0.9rem', sm: '1rem' }, py: 1.5 }}>
          {processingAction === 'block' ? <CircularProgress size={16} sx={{ mr: 1 }} /> : <BlockIcon sx={{ mr: 1, fontSize: { xs: 18, sm: 20 } }} />}
          {processingAction === 'block' ? t('blocking') : t('block_user')}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default FriendsTab;