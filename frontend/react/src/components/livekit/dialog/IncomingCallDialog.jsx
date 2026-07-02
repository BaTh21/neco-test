import {
    Dialog,
    DialogTitle,
    DialogActions,
    Button,
    Typography,
    Box, Avatar
} from "@mui/material";

function IncomingCallDialog({ incomingCall, onReject, onAccept }) {
    return (
        <Dialog open={!!incomingCall}>
            <DialogTitle>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <Avatar src={incomingCall?.avatar_url ?? ''}>
                        {incomingCall?.name?.[0]}
                    </Avatar>
                    <Typography>
                        {incomingCall?.name ?? 'Unknown'}
                    </Typography>
                    <Typography sx={{
                        fontSize: 16
                    }}>
                        Incoming Call
                    </Typography>
                </Box>
            </DialogTitle>

            <DialogActions>
                <Button onClick={onReject} color="error" variant="outlined">
                    Reject
                </Button>

                <Button onClick={() => onAccept()} color="success" variant="contained">
                    Accept
                </Button>
            </DialogActions>
        </Dialog>
    )
}

export default IncomingCallDialog
