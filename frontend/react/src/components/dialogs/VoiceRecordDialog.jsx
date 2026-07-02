import { useState } from "react";
import { IconButton, Box, CircularProgress } from "@mui/material";
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';

const VoiceRecorder = ({ onConfirm }) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const audioFile = new File(
          [event.data],
          `voice-${Date.now()}.webm`,
          { type: "audio/webm" }
        );
        onConfirm?.(audioFile);
      }
    };

    recorder.start();
    setMediaRecorder(recorder);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };


  return (
    <Box display="flex" alignItems="center" gap={1}>
      <IconButton
        sx={{
          bgcolor: recording ? 'red' : 'primary.main',
          color: 'white',
          '&:hover': { bgcolor: recording ? '#ff4d4d' : '#1E90FF' },
          border: 'none',
          borderRadius: 2
        }}
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
      >
        <KeyboardVoiceIcon />
      </IconButton>

      {recording && (
        <Box display="flex" alignItems="center" gap={1}>
          <CircularProgress size={20} color="error" />
          <span>Recording...</span>
        </Box>
      )}
    </Box>
  );
};

export default VoiceRecorder;
