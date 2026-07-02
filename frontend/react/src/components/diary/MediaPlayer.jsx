import { PlayArrow as PlayArrowIcon } from '@mui/icons-material';
import { Box, IconButton } from '@mui/material';
import { useState } from 'react';

export const MediaPlayer = ({ url, type, thumbnail }) => {
  const [playing, setPlaying] = useState(false);

  // IMAGE
  if (type === 'image') {
    return (
      <Box
        sx={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={url}
          alt="media"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </Box>
    );
  }

  // VIDEO
  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'black',
      }}
    >
      {playing ? (
        <video
          src={url}
          controls
          autoPlay
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
          onClick={() => setPlaying(true)}
        >
          {/* Thumbnail */}
          {thumbnail ? (
            <img
              src={thumbnail}
              alt="video thumbnail"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '100%',
                bgcolor: '#000',
              }}
            />
          )}

          {/* Play Button */}
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 96,
              height: 96,
              borderRadius: '50%',
              bgcolor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.2s',
              '&:hover': {
                transform: 'translate(-50%, -50%) scale(1.1)',
                bgcolor: 'rgba(0,0,0,0.8)',
              },
            }}
          >
            <PlayArrowIcon sx={{ fontSize: 48, color: 'white' }} />
          </Box>
        </Box>
      )}
    </Box>
  );
};
