import {
  Palette as PaletteIcon,
  PushPin as PinIcon,
  PushPinOutlined as PinOutlinedIcon,
} from '@mui/icons-material';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  IconButton,
  TextField,
  Typography
} from '@mui/material';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const colorOptions = [
  '#ffffff', '#f28b82', '#fbbc04', '#fff475',
  '#ccff90', '#a7ffeb', '#cbf0f8', '#aecbfa',
  '#d7aefb', '#fdcfe8', '#e6c9a8', '#e8eaed'
];

const NoteEditor = ({ open, note, onSave, onClose }) => {
  const { t } = useTranslation();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    if (open) {
      if (note) {
        setTitle(note.title || '');
        setContent(note.content || '');
        setIsPinned(note.is_pinned || false);
        setColor(note.color || '#ffffff');
      } else {
        setTitle('');
        setContent('');
        setIsPinned(false);
        setColor('#ffffff');
      }
      setShowColorPicker(false);
    }
  }, [note, open]);

  const handleSave = () => {
    const noteData = {
      title: title ? title.trim() : '',
      content: content ? content.trim() : '',
      is_pinned: isPinned,
      color: color
    };
    onSave(noteData);
  };

  const handleClose = () => {
    setShowColorPicker(false);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: color,
          borderRadius: 2,
          minHeight: 200,
          background: color,
        }
      }}
    >
      <DialogContent sx={{ p: 2, pb: 1, background: color }}>
        
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          <TextField
            fullWidth
            placeholder={t("note_title_placeholder")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '1.25rem',
                fontWeight: 600,
                '&::placeholder': { opacity: 0.6 },
                background: 'transparent',
              }
            }}
            sx={{ mr: 1, background: 'transparent' }}
            onKeyPress={handleKeyPress}
            autoFocus
          />

          <IconButton
            size="small"
            onClick={() => setIsPinned(!isPinned)}
            color={isPinned ? 'primary' : 'default'}
            sx={{ mt: 0.5 }}
            title={isPinned ? t("unpin_note") : t("pin_note")}
          >
            {isPinned ? <PinIcon /> : <PinOutlinedIcon />}
          </IconButton>
        </Box>

        <TextField
          fullWidth
          multiline
          minRows={3}
          maxRows={15}
          placeholder={t("note_content_placeholder")}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          variant="standard"
          InputProps={{
            disableUnderline: true,
            sx: {
              '&::placeholder': { opacity: 0.6 },
              background: 'transparent',
            }
          }}
          sx={{ background: 'transparent' }}
          onKeyPress={handleKeyPress}
        />

        {showColorPicker && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: 'block' }}
            >
              {t("choose_color")}
            </Typography>

            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {colorOptions.map((colorOption) => (
                <Box
                  key={colorOption}
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    backgroundColor: colorOption,
                    border: '2px solid',
                    borderColor: color === colorOption ? 'primary.main' : 'transparent',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'scale(1.1)',
                      borderColor: 'primary.main'
                    },
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setColor(colorOption)}
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, pt: 1, background: color }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => setShowColorPicker(!showColorPicker)}
            color={showColorPicker ? 'primary' : 'default'}
            title={t("change_color")}
          >
            <PaletteIcon />
          </IconButton>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Button onClick={handleClose}>
          {t("cancel")}
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          sx={{ minWidth: 80 }}
        >
          {note ? t("update") : t("save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NoteEditor;
