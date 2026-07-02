import { Close as CloseIcon, Image as ImageIcon, Reply as ReplyIcon } from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    IconButton,
    TextField,
    Typography
} from '@mui/material';
import { useState } from 'react';
import { formatCambodiaDate } from '../../utils/dateUtils';

const CommentItem = ({ 
  comment, 
  diaryId, 
  profile, 
  onAddReply, 
  level = 0,
  replyingTo,
  setReplyingTo,
  replyTexts,
  setReplyTexts,
  handleImageUpload,
  selectedCommentImages,
  setError,
  setSuccess 
}) => {
  const [localReplying, setLocalReplying] = useState(false);
  
  const handleReply = () => {
    setReplyingTo(comment.id);
    setLocalReplying(true);
  };
  
  const handleCancelReply = () => {
    setReplyingTo(null);
    setLocalReplying(false);
    setReplyTexts(prev => ({ ...prev, [comment.id]: '' }));
  };
  
  const handleSubmitReply = () => {
    if (onAddReply && replyTexts[comment.id]?.trim()) {
      onAddReply(diaryId, comment.id);
      setLocalReplying(false);
    }
  };
  
  // Limit nesting depth for visual clarity
  const maxDepth = 5;
  const isTooDeep = level >= maxDepth;
  
  return (
    <Box sx={{ 
      mb: 2, 
      ml: level > 0 ? 2 : 0,
      borderLeft: level > 0 ? '2px solid #e0e0e0' : 'none',
      pl: level > 0 ? 2 : 0,
      position: 'relative'
    }}>
      {/* Comment header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1 }}>
        <Avatar sx={{ 
          width: level > 0 ? 24 : 28, 
          height: level > 0 ? 24 : 28, 
          fontSize: level > 0 ? '0.7rem' : '0.8rem',
          flexShrink: 0
        }}>
          {comment.user?.username?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            flexWrap: 'wrap',
            mb: 0.5 
          }}>
            <Typography variant="body2" fontWeight="600" color="green" component="span">
              {comment.user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary" component="span">
              {formatCambodiaDate(comment.created_at)}
            </Typography>
            
            {/* Reply button (only show if not too deep) */}
            {profile && !isTooDeep && (
              <Button
                size="small"
                startIcon={<ReplyIcon fontSize="small" />}
                onClick={handleReply}
                sx={{ minWidth: 'auto', ml: 'auto' }}
              >
                Reply
              </Button>
            )}
          </Box>
          
          {/* Comment content */}
          <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </Typography>
          
          {/* Comment images */}
          {comment.images && comment.images.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
              {comment.images.map((img, idx) => (
                <Box key={idx} sx={{ position: 'relative' }}>
                  <img
                    src={img}
                    alt={`Comment image ${idx + 1}`}
                    style={{
                      width: 80,
                      height: 80,
                      objectFit: 'cover',
                      borderRadius: 4
                    }}
                  />
                </Box>
              ))}
            </Box>
          )}
          
          {/* Reply form */}
          {(replyingTo === comment.id || localReplying) && !isTooDeep && (
            <Box sx={{ mb: 2, mt: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder={`Reply to ${comment.user?.username}...`}
                value={replyTexts[comment.id] || ''}
                onChange={(e) => setReplyTexts(prev => ({
                  ...prev,
                  [comment.id]: e.target.value
                }))}
                sx={{ mb: 1 }}
                multiline
                rows={2}
              />
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  component="label"
                  size="small"
                  startIcon={<ImageIcon />}
                >
                  Add Image
                  <input
                    type="file"
                    hidden
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, null, `reply-${comment.id}`)}
                  />
                </Button>
                
                {/* Show selected images for reply */}
                {selectedCommentImages[`reply-${comment.id}`]?.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
                    {selectedCommentImages[`reply-${comment.id}`].map((img, idx) => (
                      <Box key={idx} sx={{ position: 'relative', width: 40, height: 40 }}>
                        <img
                          src={img}
                          alt={`Preview ${idx}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 2 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => {
                            const newImages = [...selectedCommentImages[`reply-${comment.id}`]];
                            newImages.splice(idx, 1);
                            setReplyTexts(prev => ({
                              ...prev,
                              [`reply-${comment.id}`]: newImages
                            }));
                          }}
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            bgcolor: 'rgba(0,0,0,0.5)',
                            color: 'white',
                            width: 16,
                            height: 16,
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Box>
                    ))}
                  </Box>
                )}
                
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSubmitReply}
                  disabled={!replyTexts[comment.id]?.trim()}
                >
                  Send
                </Button>
                <Button
                  variant="text"
                  size="small"
                  onClick={handleCancelReply}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}
          
          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && !isTooDeep && (
            <Box sx={{ mt: 2 }}>
              {comment.replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  diaryId={diaryId}
                  profile={profile}
                  onAddReply={onAddReply}
                  level={level + 1}
                  replyingTo={replyingTo}
                  setReplyingTo={setReplyingTo}
                  replyTexts={replyTexts}
                  setReplyTexts={setReplyTexts}
                  handleImageUpload={handleImageUpload}
                  selectedCommentImages={selectedCommentImages}
                />
              ))}
            </Box>
          )}
          
          {/* If too deep, show a message */}
          {isTooDeep && comment.replies && comment.replies.length > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              {comment.replies.length} more repl{comment.replies.length === 1 ? 'y' : 'ies'} (depth limited)
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default CommentItem;