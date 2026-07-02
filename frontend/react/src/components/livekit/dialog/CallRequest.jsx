import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Avatar,
    Box
} from "@mui/material";

function CallRequest({ callRequest, onCancel }) {
    if (!callRequest) return null;

    return (
        <Dialog open={Boolean(callRequest)} onClose={onCancel}>
            <DialogTitle>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    <Avatar
                        src={callRequest?.avatar}
                        sx={{
                            borderRadius: callRequest?.room_type === 'group' ? 2 : '50%'
                        }}
                    >
                        {callRequest?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>

                    <Typography variant="h6">
                        {callRequest.name ?? "Unknown"}
                    </Typography>
                    <Typography sx={{
                        fontSize: 16,
                        color: [
                            "User is in another call",
                            "offline",
                            "busy",
                        ].includes(
                            callRequest.status
                        )
                            ? "red"
                            : "black",
                    }}>
                        {callRequest.status ?? 'calling'}
                    </Typography>
                </Box>
            </DialogTitle>
            <DialogContent>

            </DialogContent>

            <DialogActions>
                <Button
                    onClick={onCancel}
                    color="error"
                    variant="outlined"
                >
                    Cancel
                </Button>
            </DialogActions>
        </Dialog>
    );
}

export default CallRequest;