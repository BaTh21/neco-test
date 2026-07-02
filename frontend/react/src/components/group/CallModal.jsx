import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  Button,
  Typography
} from "@mui/material";

const CallModal = ({ open, onClose, onlineUsers, onStartGroupCall }) => {

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Start Call</DialogTitle>

      <DialogContent>
        {onlineUsers.size === 0 ? (
          <Typography>No online users</Typography>
        ) : (
          <List>
            {Array.from(onlineUsers).map((userId) => (
              <ListItemButton
                key={userId}
                // onClick={() => handleCall(userId)}
              >
                <ListItemText primary={`Call User ${userId}`} />
              </ListItemButton>
            ))}
          </List>
        )}
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={onStartGroupCall}
        >
          Call All
        </Button>


        <Button
          variant="outlined"
          color="error"
          onClick={onClose}
          fullWidth
          sx={{ mt: 2 }}
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default CallModal;
