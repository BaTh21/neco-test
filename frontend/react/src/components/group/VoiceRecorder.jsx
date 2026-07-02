import { useState, useRef, useEffect } from "react";
import {
    IconButton,
    Box,
    Typography
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import { VoiceMessagePlayer } from "./VoiceMessagePlayer";

export default function VoiceRecorder({ onConfirm, onRecordingChange }) {
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [seconds, setSeconds] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    useEffect(() => {
        return () => clearInterval(timerRef.current);
    }, []);

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorderRef.current = new MediaRecorder(stream);
        chunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = e => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: "audio/webm" });
            setAudioBlob(blob);
        };

        mediaRecorderRef.current.start();
        setRecording(true);
        setSeconds(0);

        onRecordingChange?.(true);

        timerRef.current = setInterval(() => {
            setSeconds(s => s + 1);
        }, 1000);
    };

    const stopRecording = () => {
        mediaRecorderRef.current?.stop();
        clearInterval(timerRef.current);
        setRecording(false);

    };

    const cancelRecording = () => {
        if (recording) {
            mediaRecorderRef.current?.stop();
            clearInterval(timerRef.current);
        }

        chunksRef.current = [];
        setRecording(false);
        setSeconds(0);
        setAudioBlob(null);

        onRecordingChange?.(false);
    };

    const sendRecording = () => {
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, {
                type: "audio/webm",
            });

            onConfirm(blob);
            cancelRecording();
        };

        mediaRecorderRef.current.stop();

        clearInterval(timerRef.current);
        setRecording(false);
    };

    return (
        <Box display="flex" alignItems="center" gap={1} width="100%">
            {!recording ? (
                <IconButton color="primary" size='small' onClick={startRecording}>
                    <MicIcon />
                </IconButton>
            ) : (
                <>
                    <Typography
                        variant="body2"
                        sx={{
                            flexGrow: 1,
                            color: "error.main",
                            fontWeight: 500,
                        }}
                    >
                        🎤 Recording... {seconds}s
                    </Typography>

                    <IconButton
                        color="error"
                        size="small"
                        onClick={cancelRecording}
                    >
                        <CloseIcon />
                    </IconButton>

                    <IconButton
                        color="primary"
                        size="small"
                        onClick={sendRecording}
                    >
                        <SendIcon />
                    </IconButton>
                </>
            )}
        </Box>
    );
}
