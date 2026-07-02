import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import { Box, IconButton } from '@mui/material';
import { useRef, useState } from 'react';
import EmojiPicker from './EmojiPicker';

const EmojiButton = ({ 
  onSelect, 
  disabled = false,
  size = 'medium',
  placement = 'top-start',
  width = 350,
  height = 400,
  buttonProps = {}
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const buttonRef = useRef(null);

  const handleEmojiSelect = (emoji) => {
    onSelect(emoji);
  };

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      <IconButton
        ref={buttonRef}
        onClick={() => setShowPicker(!showPicker)}
        disabled={disabled}
        size={size}
        {...buttonProps}
        sx={{
          color: showPicker ? 'primary.main' : 'inherit',
          ...buttonProps.sx
        }}
      >
        {showPicker ? <EmojiEmotionsIcon /> : <InsertEmoticonIcon />}
      </IconButton>

      {showPicker && (
        <EmojiPicker
          onSelect={handleEmojiSelect}
          onClose={() => setShowPicker(false)}
          anchorEl={buttonRef.current}
          placement={placement}
          width={width}
          height={height}
        />
      )}
    </Box>
  );
};

export default EmojiButton;