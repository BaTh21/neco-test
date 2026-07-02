import SendIcon from '@mui/icons-material/Send';
import { Box, IconButton, TextField } from '@mui/material';
import { useState } from 'react';

export default function MessageInput({ onSend, placeholder = "Type a message..." }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text.trim());
      setText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', p: 1, bgcolor: 'background.paper' }}>
      <TextField
        fullWidth
        multiline
        maxRows={4}
        variant="outlined"
        size="small"
        placeholder={placeholder}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        sx={{ mr: 1 }}
      />
      <IconButton color="primary" onClick={handleSend} disabled={!text.trim()}>
        <SendIcon />
      </IconButton>
    </Box>
  );
}