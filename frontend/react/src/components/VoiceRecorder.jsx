// Create components/VoiceRecorder.jsx
import {
    Cancel as CancelIcon,
    Mic as MicIcon,
    FiberManualRecord as RecordIcon,
    Stop as StopIcon
} from '@mui/icons-material';
import {
    Box,
    Card,
    CircularProgress,
    IconButton,
    Slider,
    Typography
} from '@mui/material';

const VoiceRecorder = ({
  isRecording,
  recordingTime,
  recordingVolume,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
  isUploading = false
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isUploading) {
    return (
      <Card sx={{ p: 3, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
        <CircularProgress size={40} sx={{ color: 'white', mb: 2 }} />
        <Typography variant="body2" fontWeight="500">
          Sending voice message...
        </Typography>
      </Card>
    );
  }

  if (isRecording) {
    return (
      <Card sx={{ p: 3, bgcolor: 'error.light', color: 'white' }}>
        {/* Recording Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RecordIcon sx={{ color: 'error.main', animation: 'blink 1s infinite' }} />
            <Typography variant="body1" fontWeight="600">
              Recording...
            </Typography>
          </Box>
          <Typography variant="body2" fontWeight="500">
            {formatTime(recordingTime)}
          </Typography>
        </Box>

        {/* Volume Visualization */}
        <Box sx={{ mb: 3 }}>
          <Slider
            value={recordingVolume * 100}
            sx={{
              color: 'error.main',
              '& .MuiSlider-track': {
                background: `linear-gradient(90deg, error.main 0%, error.main ${recordingVolume * 100}%, rgba(255,255,255,0.3) ${recordingVolume * 100}%)`,
              },
              '& .MuiSlider-thumb': {
                display: 'none',
              },
            }}
          />
        </Box>

        {/* Recording Controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
          <IconButton
            onClick={onStopRecording}
            sx={{
              bgcolor: 'success.main',
              color: 'white',
              '&:hover': { bgcolor: 'success.dark' },
              width: 56,
              height: 56,
            }}
          >
            <StopIcon />
          </IconButton>
          
          <IconButton
            onClick={onCancelRecording}
            sx={{
              bgcolor: 'grey.500',
              color: 'white',
              '&:hover': { bgcolor: 'grey.600' },
              width: 56,
              height: 56,
            }}
          >
            <CancelIcon />
          </IconButton>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, opacity: 0.8 }}>
          Click stop to send, cancel to discard
        </Typography>
      </Card>
    );
  }

  return (
    <IconButton
      onClick={onStartRecording}
      sx={{
        bgcolor: 'primary.main',
        color: 'white',
        '&:hover': { bgcolor: 'primary.dark' },
        width: 48,
        height: 48,
      }}
    >
      <MicIcon />
    </IconButton>
  );
};


export default VoiceRecorder;