import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Modal,
} from "@mui/material";

import MicOffIcon from "@mui/icons-material/MicOff";
import KeyboardVoiceIcon from "@mui/icons-material/KeyboardVoice";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CloseIcon from "@mui/icons-material/Close";
import VideoCard from './VideoCard';
import ZoomInMapIcon from '@mui/icons-material/ZoomInMap';

const getRowsByCount = (count) => {
  if (count === 0) return [];
  if (count === 1) return [[0]];
  if (count === 2) return [[0], [1]];
  if (count === 3) return [[0, 1], [2]];
  if (count === 4) return [[0, 1], [2, 3]];

  const rows = [];
  for (let i = 0; i < count; i += 2) {
    rows.push([i, i + 1].filter(idx => idx < count));
  }
  return rows;
};

const CallDialog = ({
  open,
  remoteStreams,
  usernames = {},
  avatars = {},
  onLocal,
  onCancel,
  status,
  peersRef,
  totalAccepted,
  isAudioOnly = false,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const [seconds, setSeconds] = useState(30);

  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!open || status === "In Call") {
      return;
    }

    setSeconds(30);

    const timer = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onCancel();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onCancel]);

  const [pipPos, setPipPos] = useState({
    x: window.innerWidth - 220,
    y: 20
  });
  const pipRef = useRef(null);
  const videoRefs = useRef({});

  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const entries = Object.entries(remoteStreams || {});
  const rows = getRowsByCount(totalAccepted);

  const toggleMute = () => {
    if (!onLocal) return;

    const audioTrack = onLocal.getAudioTracks()[0];
    if (!audioTrack) {
      console.log("No audio track found");
      return;
    }

    const newEnabled = !audioTrack.enabled;
    audioTrack.enabled = newEnabled;
    setIsMuted(!newEnabled);

    console.log("🎤 Audio enabled:", audioTrack.enabled);

    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === "audio");
      if (sender) sender.replaceTrack(audioTrack);
    });
  };

  const toggleVideo = () => {
    if (!onLocal) return;

    const track = onLocal.getVideoTracks()[0];
    if (!track) {
      console.log("No video track found");
      return;
    }

    track.enabled = !track.enabled;
    setVideoEnabled(track.enabled);

    console.log("📹 Video enabled:", track.enabled);

    Object.values(peersRef.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender) sender.replaceTrack(track);
    });
  };

  const startDrag = (e) => {
    dragging.current = true;
    const rect = pipRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragOffset.current = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const duringDrag = (e) => {
    if (!dragging.current) return;

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const newX = clientX - dragOffset.current.x;
    const newY = clientY - dragOffset.current.y;

    const maxX = window.innerWidth - 200;
    const maxY = window.innerHeight - 140;

    setPipPos({
      x: Math.max(10, Math.min(newX, maxX)),
      y: Math.max(10, Math.min(newY, maxY)),
    });
  };

  const stopDrag = () => {
    dragging.current = false;
  };

  useEffect(() => {
    window.addEventListener("mousemove", duringDrag);
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchmove", duringDrag);
    window.addEventListener("touchend", stopDrag);

    return () => {
      window.removeEventListener("mousemove", duringDrag);
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchmove", duringDrag);
      window.removeEventListener("touchend", stopDrag);
    };
  }, []);

  return (
    <Modal
      open={open}
      onClose={onCancel}
    >
      <Box
        sx={{
          width: "100%",
          height: collapsed ? "80px" : "100%",
          position: "relative",
          bgcolor: "black",
          transition: "height 0.3s ease",
          overflow: "hidden",
          backgroundColor: collapsed ? 'green' : 'grey'
        }}
      >

        {!collapsed && (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              padding: "6px",
              boxSizing: "border-box",
              position: "absolute",
              top: 0,
              left: 0,
              overflow: "hidden",
            }}
          >
            {rows.map((row, rIndex) => (
              <Box key={rIndex} sx={{ flex: 1, display: "flex", justifyContent: "center", gap: "6px" }}>
                {row.map((idx) => {
                  const entry = entries[idx];
                  if (!entry) return null;

                  const [userId, stream] = entry;

                  if (!videoRefs.current[userId]) {
                    videoRefs.current[userId] = React.createRef();
                  }

                  return (
                    <VideoCard
                      key={stream.id}
                      ref={videoRefs.current[userId]}
                      stream={stream}
                      userName={usernames[userId] || `User ${idx + 1}`}
                      avatarUrl={avatars[userId] || ""}
                      isAudioOnly={isAudioOnly}
                      muted={false}
                    />
                  );
                })}
              </Box>
            ))}
          </Box>
        )}

        {onLocal && !isAudioOnly && !collapsed && (
          <Box
            ref={pipRef}
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            sx={{
              position: "fixed",
              left: pipPos.x,
              top: pipPos.y,
              width: 200,
              height: 140,
              borderRadius: 2,
              overflow: "hidden",
              zIndex: 20,
              border: "2px solid white",
              background: "black",
              cursor: "grab",
              touchAction: "none",
              boxShadow: "0 0 10px rgba(0,0,0,0.5)",
            }}
          >
            <VideoCard stream={onLocal} userName="You" isAudioOnly={isAudioOnly} muted={isMuted} voiceUi={isMuted} />
          </Box>
        )}

        {!collapsed && (
          <Box
            sx={{
              position: "fixed",
              bottom: 32,
              width: "100%",
              display: "flex",
              justifyContent: "center",
              gap: 4,
              zIndex: 30
            }}
          >
            <IconButton
              onClick={toggleMute}
              sx={{
                backgroundColor: isMuted ? "secondary.main" : "primary.main",
                color: "white",
                "&:hover": {
                  backgroundColor: isMuted ? "#68102fff" : "#1a2f42ff"
                }
              }}
            >
              {isMuted ? <MicOffIcon /> : <KeyboardVoiceIcon />}
            </IconButton>

            {!isAudioOnly && (
              <IconButton
                onClick={toggleVideo}
                sx={{
                  backgroundColor: videoEnabled ? "primary.main" : "secondary.main",
                  color: "white",
                  "&:hover": {
                    backgroundColor: videoEnabled ? "#1a2f42ff" : "#68102fff"
                  }
                }}
              >
                {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
              </IconButton>
            )}

            <IconButton
              onClick={onCancel}
              sx={{
                backgroundColor: "error.main",
                color: "white",
                "&:hover": { backgroundColor: "#b71c1c" }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        )}

        {!totalAccepted && !collapsed && (
          <Box
            sx={{
              position: "absolute",
              textAlign: "center",
              color: "white",
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '100%',
              height: '100%'
            }}
          >
            <Typography
              sx={{
                fontSize: 24
              }}
            >Waiting for other to join...</Typography>
          </Box>
        )}

        {status && (
          <Box
            sx={{
              position: "fixed",
              top: 20,
              width: "100%",
              textAlign: "center",
              color: "white",
              zIndex: 40
            }}
          >

            <IconButton
              onClick={() => setCollapsed(!collapsed)}
              sx={{
                position: 'fixed',
                top: 10,
                right: 10,
                zIndex: 1300,
                color: 'white',
                '&:hover': { transform: 'scale(1.1)' }
              }}
            >
              <ZoomInMapIcon />
            </IconButton>

            <Typography sx={{ fontSize: 22 }}>
              {status}
            </Typography>

            {open && status !== "In Call" && (
              <Typography sx={{ fontSize: 16 }}>
                Call will end in {seconds}s
              </Typography>
            )}
          </Box>
        )}

      </Box>
    </Modal>
  );
};

export default CallDialog;
