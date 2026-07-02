import { useState } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import Stack from "@mui/material/Stack";
import Fab from "@mui/material/Fab";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";

function CallButton({ onEndCall }) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);

  const toggleMic = async () => {
    const enabled = !micEnabled;

    await localParticipant.setMicrophoneEnabled(enabled);
    setMicEnabled(enabled);
  };
  const toggleCamera = async () => {
    const enabled = !cameraEnabled;

    await localParticipant.setCameraEnabled(enabled);
    setCameraEnabled(enabled);
  };

  // End call
  const handleEndCall = async () => {
    await room.disconnect();
    onEndCall?.();
  };

  return (
    <Stack
      direction="row"
      spacing={3}
      justifyContent="center"
      sx={{
        position: "absolute",
        bottom: 32,
        width: "100%",
      }}
    >
      {/* Mic toggle */}
      <Fab color={micEnabled ? "primary" : "default"} onClick={toggleMic}>
        {micEnabled ? <MicIcon /> : <MicOffIcon />}
      </Fab>

      {/* Camera toggle */}
      <Fab
        color={cameraEnabled ? "primary" : "default"}
        onClick={toggleCamera}
      >
        {cameraEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
      </Fab>

      {/* End call */}
      <Fab color="error" onClick={handleEndCall}>
        <CallEndIcon />
      </Fab>
    </Stack>
  );
}

export default CallButton;