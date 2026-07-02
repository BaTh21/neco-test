import AddReactionIcon from '@mui/icons-material/AddReaction';
import SentimentSatisfiedAltIcon from '@mui/icons-material/SentimentSatisfiedAlt';
import {
  Avatar,
  Box,
  ClickAwayListener,
  Fade,
  IconButton,
  Popover,
  Tooltip,
  Typography
} from '@mui/material';
import EmojiPickerReact from 'emoji-picker-react';
import { useRef, useState } from 'react';

const MessageReactions = ({ 
  messageId,
  reactions = [],
  currentUserId,
  onAddReaction,
  onRemoveReaction,
  showAddButton = true,
  size = 'small',
  isMine = false
}) => {
  // Check if it's a temp message - RETURN EARLY
  const isTempMessage = typeof messageId === 'string' && 
    (messageId.startsWith('temp-') || messageId.includes('temp-'));
  
  // Don't render anything for temp messages
  if (isTempMessage) {
    return null;
  }

  const [showQuickPicker, setShowQuickPicker] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [hoveredReaction, setHoveredReaction] = useState(null);
  const reactionButtonRef = useRef(null);
  
  // Common quick reactions
  const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  // Handle quick reaction click
  const handleQuickReaction = (emoji) => {
    const existingReaction = reactions.find(r => 
      r.emoji === emoji && r.user_id === currentUserId
    );
    
    if (existingReaction) {
      onRemoveReaction?.(existingReaction.id);
    } else {
      onAddReaction?.(emoji);
    }
    setShowQuickPicker(false);
  };

  // Handle emoji picker selection
  const handleEmojiSelect = (emojiData) => {
    const emoji = emojiData.emoji;
    const existingReaction = reactions.find(r => 
      r.emoji === emoji && r.user_id === currentUserId
    );
    
    if (existingReaction) {
      onRemoveReaction?.(existingReaction.id);
    } else {
      onAddReaction?.(emoji);
    }
    setShowFullPicker(false);
  };

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        userReacted: false
      };
    }
    
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push({
      id: reaction.user_id,
      username: reaction.user?.username || 'User',
      avatar: reaction.user?.avatar_url
    });
    
    if (reaction.user_id === currentUserId) {
      acc[reaction.emoji].userReacted = true;
    }
    
    return acc;
  }, {});

  // Sort by count
  const sortedReactions = Object.values(groupedReactions)
    .sort((a, b) => b.count - a.count);

  // Get user tooltip content
  const getUserTooltipContent = (users) => {
    return (
      <Box sx={{ p: 0.5, maxWidth: 200 }}>
        {users.slice(0, 5).map((user, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Avatar 
              src={user.avatar} 
              sx={{ width: 20, height: 20, fontSize: '0.6rem' }}
            >
              {user.username?.[0]}
            </Avatar>
            <Typography variant="caption">{user.username}</Typography>
          </Box>
        ))}
        {users.length > 5 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            +{users.length - 5} more
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 0.5,
      flexWrap: 'wrap'
    }}>
      {/* Display reactions */}
      {sortedReactions.map((reaction, index) => (
        <Tooltip 
          key={index} 
          title={getUserTooltipContent(reaction.users)}
          placement="top"
          arrow
          TransitionComponent={Fade}
          TransitionProps={{ timeout: 200 }}
        >
          <IconButton
            size="small"
            onClick={() => handleQuickReaction(reaction.emoji)}
            onMouseEnter={() => setHoveredReaction(reaction.emoji)}
            onMouseLeave={() => setHoveredReaction(null)}
            sx={{
              bgcolor: reaction.userReacted 
                ? (isMine ? 'rgba(255, 255, 255, 0.3)' : 'primary.light') 
                : (isMine ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)'),
              color: reaction.userReacted 
                ? (isMine ? 'white' : 'primary.contrastText') 
                : (isMine ? 'rgba(255, 255, 255, 0.9)' : 'text.primary'),
              borderRadius: '16px',
              px: 0.75,
              py: 0.25,
              minWidth: 'auto',
              height: 24,
              fontSize: '0.875rem',
              border: '1px solid',
              borderColor: reaction.userReacted 
                ? (isMine ? 'rgba(255, 255, 255, 0.4)' : 'primary.main') 
                : (isMine ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)'),
              transition: 'all 0.15s ease',
              transform: hoveredReaction === reaction.emoji ? 'translateY(-1px)' : 'none',
              '&:hover': {
                bgcolor: reaction.userReacted 
                  ? (isMine ? 'rgba(255, 255, 255, 0.4)' : 'primary.main') 
                  : (isMine ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)'),
                transform: 'translateY(-1px) scale(1.05)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
              }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
              <Typography sx={{ 
                fontSize: '0.875rem', 
                lineHeight: 1,
                filter: hoveredReaction === reaction.emoji ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' : 'none'
              }}>
                {reaction.emoji}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 600,
                  color: reaction.userReacted 
                    ? (isMine ? 'white' : 'primary.contrastText') 
                    : (isMine ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary'),
                  minWidth: 'auto'
                }}
              >
                {reaction.count}
              </Typography>
            </Box>
          </IconButton>
        </Tooltip>
      ))}

      {/* Add reaction button */}
      {showAddButton && (
        <Box sx={{ position: 'relative' }}>
          <IconButton
            ref={reactionButtonRef}
            size="small"
            onClick={(e) => {
              setAnchorEl(e.currentTarget);
              setShowQuickPicker(true);
            }}
            sx={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              bgcolor: isMine ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
              // color: isMine ? 'rgba(255, 255, 255, 0.8)' : 'text.secondary',
              border: '1px solid',
              borderColor: isMine ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.12)',
              transition: 'all 0.15s ease',
              '&:hover': {
                bgcolor: isMine ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
                transform: 'scale(1.1)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }
            }}
          >
            <AddReactionIcon fontSize="small" />
          </IconButton>

          {/* Quick reactions popover */}
          <Popover
            open={showQuickPicker && Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setShowQuickPicker(false)}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            sx={{
              '& .MuiPopover-paper': {
                borderRadius: '20px',
                p: 1,
                bgcolor: 'background.paper',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)',
                background: 'rgba(255, 255, 255, 0.95)'
              }
            }}
          >
            <ClickAwayListener onClickAway={() => setShowQuickPicker(false)}>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {quickReactions.map((emoji, index) => {
                  const userReacted = reactions.some(r => 
                    r.emoji === emoji && r.user_id === currentUserId
                  );
                  
                  return (
                    <IconButton
                      key={index}
                      size="small"
                      onClick={() => handleQuickReaction(emoji)}
                      sx={{
                        fontSize: '1.2rem',
                        width: 36,
                        height: 36,
                        bgcolor: userReacted ? 'primary.light' : 'transparent',
                        borderRadius: '50%',
                        transition: 'all 0.15s ease',
                        '&:hover': {
                          bgcolor: userReacted ? 'primary.main' : 'rgba(0, 0, 0, 0.08)',
                          transform: 'scale(1.1)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                      }}
                    >
                      {emoji}
                    </IconButton>
                  );
                })}
                
                {/* Full emoji picker trigger */}
                <IconButton
                  size="small"
                  onClick={() => {
                    setShowQuickPicker(false);
                    setShowFullPicker(true);
                  }}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.1)',
                      transform: 'scale(1.1)'
                    }
                  }}
                >
                  <SentimentSatisfiedAltIcon fontSize="small" />
                </IconButton>
              </Box>
            </ClickAwayListener>
          </Popover>

          {/* Full emoji picker */}
          <Popover
            open={showFullPicker && Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setShowFullPicker(false)}
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'center',
            }}
            transformOrigin={{
              vertical: 'bottom',
              horizontal: 'center',
            }}
            sx={{
              '& .MuiPopover-paper': {
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                border: '1px solid rgba(0,0,0,0.1)',
                '& .EmojiPickerReact': {
                  '--epr-emoji-size': '1.5rem',
                  '--epr-category-label-height': '30px',
                  '--epr-bg-color': '#ffffff',
                  '--epr-text-color': '#333333'
                }
              }
            }}
          >
            <ClickAwayListener onClickAway={() => setShowFullPicker(false)}>
              <div>
                <EmojiPickerReact
                  onEmojiClick={handleEmojiSelect}
                  width={320}
                  height={400}
                  theme="light"
                  previewConfig={{ showPreview: false }}
                  searchPlaceholder="Search emojis..."
                  skinTonesDisabled
                  suggestedEmojisMode="recent"
                />
              </div>
            </ClickAwayListener>
          </Popover>
        </Box>
      )}
    </Box>
  );
};

export default MessageReactions;