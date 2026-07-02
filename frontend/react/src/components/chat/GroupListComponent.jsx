import { useState } from "react";
import { Box, Avatar, Typography, Card, Button } from "@mui/material";

function GroupListComponent({ message, onForward, onClose, chats, currentChatId, currentChatType }) {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const filteredChats = chats.filter(chat =>
    !(chat.id === currentChatId && chat.type === currentChatType)
  );

  const groupChats = filteredChats.filter(c => c.type === "group");
  const privateChats = filteredChats.filter(c => c.type === "private");

  const handleToggleGroup = (chatId) => {
    setSelectedGroups(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleToggleUser = (chatId) => {
    setSelectedUsers(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleConfirmForward = () => {
    if (selectedGroups.length > 0 || selectedUsers.length > 0) {
      onForward(message, { groups: selectedGroups, users: selectedUsers });
    }
    if (onClose) onClose();
  };

  const renderChatCard = (chat, isSelected, onToggle) => (
    <Card
      key={`${chat.type}-${chat.id}`}
      onClick={() => onToggle(chat.id)}
      sx={{
        p: 1,
        mb: 1,
        borderRadius: '12px',
        boxShadow: isSelected ? 2 : 0,
        border: isSelected ? '2px solid #1976d2' : 'none',
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: { xs: 'none', sm: 'translateY(-2px)' },
          boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' },
        }
      }}
    >
      <Box sx={{
        display: 'flex',
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: { xs: 1, sm: 2 }
      }}>
        <Avatar src={chat.avatar} alt={chat.name}>
          {chat.name.charAt(0).toUpperCase()}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight="600" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
            {chat.name}
          </Typography>
        </Box>
      </Box>
    </Card>
  );

  return (
    <Box sx={{ p: 2 }}>
      {filteredChats.length === 0 ? (
        <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
          No chats yet. Create one to get started!
        </Typography>
      ) : (
        <>
          {privateChats.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Private Chats</Typography>
              {privateChats.map(chat => renderChatCard(chat, selectedUsers.includes(chat.id), handleToggleUser))}
            </>
          )}

          {groupChats.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Groups</Typography>
              {groupChats.map(chat => renderChatCard(chat, selectedGroups.includes(chat.id), handleToggleGroup))}
            </>
          )}

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 2 }}
            disabled={selectedGroups.length === 0 && selectedUsers.length === 0}
            onClick={handleConfirmForward}
          >
            Forward to {selectedGroups.length + selectedUsers.length} chat(s)
          </Button>
        </>
      )}
    </Box>
  );
}

export default GroupListComponent;
