//dashboard/SearchUsersTab.jsx
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
  Typography,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchUsers, sendFriendRequest } from '../../services/api';

const SearchUsersTab = ({ 
  setError, 
  setSuccess, 
  onDataUpdate, 
  friends = [], 
  pendingRequests = [], 
  currentUser 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [failedImages, setFailedImages] = useState(new Set());
  const { t, i18n } = useTranslation();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Function to get full avatar URL
  const getAvatarUrl = (url) => {
    if (!url) {
      console.log('No avatar URL provided');
      return null;
    }

    if (failedImages.has(url)) {
      console.log('Avatar URL previously failed:', url);
      return null;
    }

    // If it's already a full URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log('Using full avatar URL:', url);
      return url;
    }

    // For relative paths, construct full URL to your backend
    const baseUrl = 'http://localhost:8000'; // Your FastAPI server
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    const fullUrl = `${baseUrl}${cleanUrl}`;
    console.log('Constructed avatar URL:', fullUrl);
    return fullUrl;
  };

  const handleImageError = (userId, url) => {
    console.log(`Avatar failed to load for user ${userId}:`, url);
    setFailedImages(prev => new Set([...prev, url]));
  };

  const handleImageLoad = (userId, url) => {
    console.log(`Avatar loaded successfully for user ${userId}:`, url);
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }
    
    setLoading(true);
    try {
      const results = await searchUsers(searchQuery.trim());
      console.log('🔍 Search results received:', results);
      
      // Debug: Check avatar URLs in results
      results.forEach(user => {
        console.log(`👤 User ${user.username}: avatar_url =`, user.avatar_url);
      });
      
      setSearchResults(results);
      setError(null);
    } catch (err) {
      setError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (user) => {
    if (sendingRequests.has(user.id)) return;

    setSendingRequests(prev => new Set(prev).add(user.id));
    
    try {
      const result = await sendFriendRequest(user.id);
      
      if (result.success) {
        if (result.code === 'ALREADY_EXISTS') {
          setSuccess(result.message || 'Friend request already sent');
        } else {
          setSuccess(result.message || 'Friend request sent successfully');
        }
        
        setSearchResults(prev => prev.filter(u => u.id !== user.id));
        if (onDataUpdate) onDataUpdate();
      } else {
        setError(result.message || 'Failed to send friend request');
      }
      
    } catch (err) {
      console.error('Send request failed:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.id);
        return newSet;
      });
    }
  };

  const shouldShowAddButton = (user) => {
    if (!currentUser) return false;
    
    const isCurrentUser = user.id === currentUser.id;
    const isAlreadyFriend = friends.some(friend => friend.id === user.id);
    const hasPendingRequest = pendingRequests.some(request => request.id === user.id);
    const isSending = sendingRequests.has(user.id);

    return !isCurrentUser && !isAlreadyFriend && !hasPendingRequest && !isSending;
  };

  const getUserStatusText = (user) => {
    if (!currentUser) return 'Add Friend';
    
    const isCurrentUser = user.id === currentUser.id;
    const isAlreadyFriend = friends.some(friend => friend.id === user.id);
    const hasPendingRequest = pendingRequests.some(request => request.id === user.id);
    const isSending = sendingRequests.has(user.id);

    if (isCurrentUser) return 'You';
    if (isAlreadyFriend) return 'Friends';
    if (hasPendingRequest) return 'Request Sent';
    if (isSending) return 'Sending...';
    return 'Add Friend';
  };

  const getStatusColor = (statusText) => {
    switch (statusText) {
      case 'Friends': return 'success';
      case 'Request Sent': return 'warning';
      case 'You': return 'default';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 1.5, sm: 3 },
      maxWidth: '100%',
      overflow: 'hidden'
    }}>
      <Typography variant="h5" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
        {t('search_users')}
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        gap: 1.5, 
        mb: 3 
      }}>
        <TextField
          fullWidth
          label={t('Search_by_username')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          disabled={loading}
          sx={{ 
            borderRadius: '8px',
            '& .MuiOutlinedInput-root': {
              fontSize: { xs: '0.875rem', sm: '1rem' }
            }
          }}
          size={isMobile ? 'small' : 'medium'}
        />
        <Button 
          variant="contained" 
          onClick={handleSearch}
          disabled={loading || searchQuery.trim().length < 2}
          sx={{ 
            borderRadius: '8px', 
            minWidth: { xs: '100%', sm: 120 },
            height: { xs: '42px', sm: '56px' },
            fontSize: { xs: '0.875rem', sm: '0.9375rem' }
          }}
          size={isMobile ? 'small' : 'medium'}
        >
          {loading ? <CircularProgress size={20} /> : 'Search'}
        </Button>
      </Box>

      {searchResults.length === 0 && searchQuery.trim().length >= 2 && !loading && (
        <Typography color="text.secondary" align="center" sx={{ py: 2, fontSize: { xs: '0.875rem', sm: '1rem' } }}>
          {t('No_users_found')} "{searchQuery}"
        </Typography>
      )}

      <List sx={{ p: 0 }}>
        {searchResults.map((user) => {
          const showAddButton = shouldShowAddButton(user);
          const statusText = getUserStatusText(user);
          const isSending = sendingRequests.has(user.id);
          const avatarUrl = getAvatarUrl(user.avatar_url);

          console.log(`🎨 Rendering user ${user.username}:`, {
            avatarUrl,
            hasAvatarUrl: !!user.avatar_url,
            showAddButton
          });

          return (
            <ListItem
              key={user.id}
              sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 1,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.2s ease',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'stretch', sm: 'center' },
                gap: { xs: 1.5, sm: 0 },
                '&:hover': {
                  transform: { xs: 'none', sm: 'translateY(-2px)' },
                  boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' },
                }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                width: { xs: '100%', sm: 'auto' },
                flex: 1
              }}>
                <ListItemAvatar sx={{ minWidth: { xs: 44, sm: 48 } }}>
                  <Avatar 
                    src={avatarUrl}
                    sx={{ 
                      width: { xs: 44, sm: 48 }, 
                      height: { xs: 44, sm: 48 },
                      fontSize: { xs: '1rem', sm: '1.25rem' }
                    }}
                    imgProps={{
                      onError: () => handleImageError(user.id, user.avatar_url),
                      onLoad: () => handleImageLoad(user.id, user.avatar_url),
                    }}
                  >
                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight="500" sx={{ 
                      fontSize: { xs: '0.9rem', sm: '1rem' },
                      lineHeight: 1.2
                    }}>
                      {user.username}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary" sx={{ 
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      lineHeight: 1.2,
                      mt: 0.5
                    }}>
                      {user.email}
                    </Typography>
                  }
                  sx={{ my: 0, ml: { xs: 1.5, sm: 2 } }}
                />
              </Box>
              
              <Box sx={{ 
                width: { xs: '100%', sm: 'auto' },
                display: 'flex',
                justifyContent: { xs: 'center', sm: 'flex-end' }
              }}>
                {showAddButton ? (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={
                      isSending ? 
                        <CircularProgress size={16} /> : 
                        <PersonAddIcon sx={{ fontSize: { xs: '18px', sm: '20px' } }} />
                    }
                    onClick={() => handleSendFriendRequest(user)}
                    disabled={isSending}
                    sx={{ 
                      borderRadius: '8px', 
                      minWidth: { xs: '100%', sm: 120 },
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      py: { xs: 1, sm: 0.75 }
                    }}
                  >
                    {isSending ? 'Sending...' : (isMobile ? 'Add Friend' : 'Add Friend')}
                  </Button>
                ) : (
                  <Chip 
                    label={isMobile ? 
                      (statusText === 'Request Sent' ? 'Sent' : 
                       statusText === 'Sending...' ? 'Sending' : statusText) 
                      : statusText} 
                    color={getStatusColor(statusText)}
                    variant="outlined"
                    size="small"
                    sx={{ 
                      width: { xs: '100%', sm: 'auto' },
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                      height: { xs: '32px', sm: 'auto' }
                    }}
                  />
                )}
              </Box>
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
};

export default SearchUsersTab;