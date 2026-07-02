import { useEffect, useState } from "react";
import { getGroupMessageSeen } from "../../services/api";
import { Box, Modal, Avatar, Typography, List, ListItem, ListItemAvatar, ListItemText } from "@mui/material";

function SeenMessageListDialog({ open, onClose, messageId }) {
  const [seenMessages, setSeenMessages] = useState([]);

  useEffect(() => {
    if (open && messageId) {
      fetchSeenMessages();
    }
  }, [open, messageId]);

  const fetchSeenMessages = async () => {
    try {
      const res = await getGroupMessageSeen(messageId);
      setSeenMessages(res || []);
    } catch (error) {
      console.error("Failed to fetch seen messages:", error);
      setSeenMessages([]);
    }
  };

  const validSeenMessages = seenMessages.filter(s => s.user);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 380,
          maxHeight: "70vh",
          overflowY: "auto",
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        <Typography variant="h6" mb={2}>
          Seen by
        </Typography>

        {validSeenMessages.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No one has seen this message yet
          </Typography>
        ) : (
          <List>
            {validSeenMessages.map((seen) => (
              <ListItem
                key={seen.id}
                sx={{
                  backgroundColor: "grey.200",
                  borderRadius: 3,
                  mt: 1,
                }}
              >
                <ListItemAvatar>
                  <Avatar src={seen.user.avatar_url || ""}>
                    {seen.user.username?.[0]?.toUpperCase() || "?"}
                  </Avatar>
                </ListItemAvatar>

                <ListItemText
                  primary={seen.user.username}
                  secondary={
                    seen.seen_at
                      ? `Seen at ${new Date(seen.seen_at).toLocaleTimeString()}`
                      : "Seen"
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Modal>
  );
}

export default SeenMessageListDialog;