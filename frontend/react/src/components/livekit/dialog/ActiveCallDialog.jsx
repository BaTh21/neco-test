import {
    Dialog,
    Box,
    Typography
} from "@mui/material";
import CallRoom from "./CallRoom";

function ActiveCallDialog({ activeCall, participants, onEndCall, onDisconnected, userStatus }) {
    return (
        <Dialog fullScreen open={!!activeCall}>
            <Box
                sx={{
                    position: "fixed",
                    top: 10,
                    left: 10,
                    zIndex: 9999,
                    color: "white"
                }}
            >
                <Typography fontSize={14}>
                    Participants: {participants.length}
                </Typography>

                {participants.map(p => (
                    <Typography key={p.user_id} fontSize={13}>
                        {p.username}
                    </Typography>
                ))}
            </Box>
            <Typography sx={{
                fontSize: 16,
                position: 'fixed',
                bottom: 10,
                left: 10,
                zIndex: 2000,
                background: '#ffffff38'
            }}>
                {userStatus ?? ''}
            </Typography>
            <Box sx={{ flex: 1, display: "flex", height: "100%" }}>
                {activeCall && (
                    <CallRoom
                        token={activeCall.token}
                        url={activeCall.url}
                        participants={participants}
                        onEndCall={onEndCall}
                        onDisconnected={onDisconnected}
                    />
                )}
            </Box>

        </Dialog>
    )
}

export default ActiveCallDialog
