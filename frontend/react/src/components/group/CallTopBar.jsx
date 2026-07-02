import { useEffect, useState } from "react";
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Slide,
} from "@mui/material";

import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import CallEndIcon from "@mui/icons-material/CallEnd";
import CropFreeIcon from '@mui/icons-material/CropFree';
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';

export default function CallTopBar({
    callStatus,
    isVoice,
    onToggleMic,
    onToggleCamera,
    onLeave,
    onAccept,
    localStream,
    onConfirm
}) {

    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = () => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const micEnabled = localStream?.getAudioTracks()[0]?.enabled ?? true;

    const camEnabled = localStream?.getVideoTracks()[0]?.enabled ?? true;

    return (
        <Slide direction="down" in={!!callStatus} mountOnEnter unmountOnExit>
            <AppBar position="fixed" color="default" sx={{ background: "#254D70", color: "#fff" }}>
                <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>

                    <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                            {isVoice ? "Voice Call" : "Video Call"}
                        </Typography>

                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            {callStatus === "In Call" ? formatTime() : callStatus}
                        </Typography>
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center" }}>

                        <IconButton onClick={onConfirm} sx={{ color: "white", ml: 1 }}>
                            <CropFreeIcon />
                        </IconButton>

                        {callStatus === "Calling..." && (
                            <IconButton color="inherit" onClick={onAccept}>
                                <LocalPhoneIcon />
                            </IconButton>
                        )}

                        {!isVoice && (
                            <IconButton
                                color="inherit"
                                onClick={() => {
                                    if (!localStream) return;

                                    const track = localStream.getVideoTracks()[0];
                                    if (!track) return;

                                    track.enabled = !track.enabled;

                                    onToggleCamera?.();
                                }}
                            >
                                {camEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                            </IconButton>
                        )}


                        <IconButton
                            color="inherit"
                            onClick={() => {
                                if (!localStream) return;

                                const track = localStream.getAudioTracks()[0];
                                if (track) {
                                    track.enabled = !track.enabled;
                                }

                                onToggleMic?.();
                            }}
                        >
                            {micEnabled ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        <IconButton onClick={onLeave} sx={{ color: "red", ml: 1 }}>
                            <CallEndIcon />
                        </IconButton>

                    </Box>
                </Toolbar>
            </AppBar>
        </Slide>
    );
}

