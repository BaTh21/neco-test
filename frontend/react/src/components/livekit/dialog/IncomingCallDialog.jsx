import {
    Dialog,
    DialogContent,
    DialogActions,
    Typography,
    Avatar,
    IconButton,
    Chip,
} from "@mui/material";

import {
    Call as CallIcon,
    CallEnd as CallEndIcon,
} from "@mui/icons-material";

function IncomingCallDialog({
    incomingCall,
    onReject,
    onAccept,
}) {
    if (!incomingCall) return null;

    return (
        <Dialog
            open={Boolean(incomingCall)}
            PaperProps={{
                sx: {
                    width: 340,
                    borderRadius: 5,
                    p: 2,
                    textAlign: "center",
                },
            }}
        >
            <DialogContent>
                <Avatar
                    src={incomingCall.avatar_url || ""}
                    sx={{
                        width: 96,
                        height: 96,
                        mx: "auto",
                        mb: 2,
                        border: "4px solid white",
                        boxShadow: "0 10px 28px rgba(0,0,0,.18)",
                        animation: "ring 1.6s infinite",

                        "@keyframes ring": {
                            "0%": {
                                transform: "scale(1)",
                                boxShadow:
                                    "0 0 0 0 rgba(76,175,80,.45)",
                            },
                            "70%": {
                                transform: "scale(1.06)",
                                boxShadow:
                                    "0 0 0 20px rgba(76,175,80,0)",
                            },
                            "100%": {
                                transform: "scale(1)",
                                boxShadow:
                                    "0 0 0 0 rgba(76,175,80,0)",
                            },
                        },
                    }}
                >
                    {incomingCall.name?.charAt(0)?.toUpperCase()}
                </Avatar>

                <Typography
                    variant="h5"
                    fontWeight={700}
                >
                    {incomingCall.name || "Unknown"}
                </Typography>

                <Chip
                    label="Incoming Voice Call"
                    color="success"
                    sx={{
                        mt: 1.5,
                        fontWeight: 600,
                    }}
                />

                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2 }}
                >
                    Waiting for you to answer...
                </Typography>
            </DialogContent>

            <DialogActions
                sx={{
                    justifyContent: "space-evenly",
                    pb: 2,
                    mt: 1,
                }}
            >
                <IconButton
                    onClick={onReject}
                    sx={{
                        bgcolor: "error.main",
                        color: "#fff",
                        width: 64,
                        height: 64,
                        "&:hover": {
                            bgcolor: "error.dark",
                        },
                    }}
                >
                    <CallEndIcon />
                </IconButton>

                <IconButton
                    onClick={onAccept}
                    sx={{
                        bgcolor: "success.main",
                        color: "#fff",
                        width: 64,
                        height: 64,
                        "&:hover": {
                            bgcolor: "success.dark",
                        },
                    }}
                >
                    <CallIcon />
                </IconButton>
            </DialogActions>
        </Dialog>
    );
}

export default IncomingCallDialog;