import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ReplyIcon from '@mui/icons-material/Reply';
import {
  Box,
  Button,
  IconButton, Menu, MenuItem,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import { useState } from 'react';

const MessageItem = ({ message, isMine, onEdit, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(message.content);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const handleSaveEdit = () => {
    onEdit(message.id, content);
    setEditing(false);
  };

  // REMOVED: Unsent message display logic

  return (
    <Box sx={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', mb: 1 }}>
      <Box sx={{
        bgcolor: isMine ? 'primary.main' : 'grey.200',
        color: isMine ? 'white' : 'text.primary',
        borderRadius: 2, 
        px: 2, 
        py: 1, 
        maxWidth: '75%', 
        wordBreak: 'break-word',
        position: 'relative'
      }}>
        {editing ? (
          <Stack spacing={1}>
            <TextField 
              value={content} 
              onChange={e => setContent(e.target.value)} 
              multiline 
              size="small" 
              fullWidth 
              autoFocus
            />
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button size="small" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="small" variant="contained" color="success" onClick={handleSaveEdit}>
                Update
              </Button>
            </Stack>
          </Stack>
        ) : (
          <>
            <Typography variant="body2">{message.content}</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                {new Date(message.created_at).toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Typography>
              {isMine && !message.is_temp && (
                <>
                  <IconButton 
                    size="small" 
                    onClick={handleMenu} 
                    sx={{ color: 'inherit', opacity: 0.7 }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                  <Menu anchorEl={anchorEl} open={open} onClose={closeMenu}>
                    <MenuItem onClick={() => { setEditing(true); closeMenu(); }}>
                      <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                    </MenuItem>
                    
                    <MenuItem 
                      onClick={() => { onDelete(message.id); closeMenu(); }} 
                      sx={{ color: 'error.main' }}
                    >
                      <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                    </MenuItem>
                  </Menu>
                </>
              )}
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default MessageItem;