import { Card, Box, Typography, Avatar } from "@mui/material";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import { useEffect, forwardRef, useRef } from "react";

const Video = forwardRef(({ stream, muted, isAudioOnly }, ref) => {

  useEffect(() => {
    const el = ref.current;
    if (!el || !stream) return;

    if (stream.getTracks().length === 0) return;

    if (el.srcObject !== stream) {
      el.srcObject = stream;
    }

    el.muted = !!muted;
    el.volume = muted ? 0 : 1;

    const playMedia = () => {
      el.play().catch(() => {
        setTimeout(() => el.play().catch(() => { }), 300);
      });
    };

    playMedia();
  }, [stream, muted, ref]);

  if (isAudioOnly) {
    return (
      <audio
        ref={ref}
        autoPlay
        playsInline
        controls={false}
        style={{
          position: "absolute",
          opacity: 0,
          pointerEvents: "none",
          width: 0,
          height: 0
        }}

      />
    );
  }

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );
});

const VideoCard = forwardRef(({ stream, userName, avatarUrl, isAudioOnly, muted, voiceUi }, ref) => {
  const videoRef = useRef(null);
  const videoTrack = stream?.getVideoTracks()[0];

  const videoEnabled = videoTrack ? videoTrack.enabled : false;

  const showVideo = videoEnabled && !isAudioOnly;

  return (
    <Card
      sx={{
        flex: 1,
        height: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#111",
        position: "relative",
        display: "flex",
        justifyContent: showVideo ? "center" : "center",
        alignItems: showVideo ? "center" : "center",
        border: 1,
        borderColor: "divider",
      }}
      ref={ref}
    >
      {isAudioOnly ? (
        <Video ref={videoRef} stream={stream} muted={muted} isAudioOnly={true} />
      ) : showVideo ? (
        <Video ref={videoRef} stream={stream} muted={muted} isAudioOnly={false} />
      ) : (
        <Box
          sx={{
            position: "absolute",
            width: "100%",
            height: "100%",
            bgcolor: "#222",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "white",
          }}
        >
          {!videoEnabled && (
            <>
              <VideocamOffIcon sx={{ fontSize: 50, mb: 1 }} />
              <Typography variant="body1">Camera Off</Typography>
            </>
          )}
          {userName && (
            <Box
              sx={{
                mt: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              {userName !== "You" && (
                <Avatar
                  src={avatarUrl || ""}
                  alt={userName || "profile img"}
                  sx={{ width: 50, height: 50, fontSize: 20 }}
                >
                  {userName.charAt(0) || "P"}
                </Avatar>
              )}
              <Typography>{userName}</Typography>
            </Box>
          )}
        </Box>
      )}

      {voiceUi && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: "rgba(0,0,0,0.6)",
            borderRadius: "50%",
            p: 0.5,
          }}
        >
          <MicOffIcon sx={{ color: "white", fontSize: 20 }} />
        </Box>
      )}

      {userName && showVideo && !isAudioOnly && (
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            left: 8,
            bgcolor: "rgba(0,0,0,0.5)",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            color: "white",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {userName !== "You" && (
            <Avatar
              src={avatarUrl || ""}
              alt={userName || "profile img"}
              sx={{ width: 25, height: 25, fontSize: 12 }}
            >
              {userName.charAt(0) || "P"}
            </Avatar>
          )}
          <Typography>{userName}</Typography>
        </Box>
      )}

      {isAudioOnly && (
        <Box
          sx={{
            position: "absolute",
            px: 1,
            py: 0.5,
            color: "white",
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 1,
          }}
        >
          {userName !== "You" && (
            <Avatar
              src={avatarUrl || ""}
              alt={userName || "profile img"}
              sx={{ width: 50, height: 50, fontSize: 20 }}
            >
              {userName.charAt(0) || "P"}
            </Avatar>
          )}
          <Typography
            sx={{
              fontSize: 24
            }}
          >{userName}</Typography>
        </Box>
      )}
    </Card>
  );
})  ;

export default VideoCard;