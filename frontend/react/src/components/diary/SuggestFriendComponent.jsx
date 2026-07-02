import { Box, ListItem, List, ListItemAvatar, Avatar, ListItemText, Typography, Button, IconButton } from "@mui/material";
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { getSuggestFriends, sendFriendRequest } from '../../services/api';
import { useEffect, useState } from "react";
import { useTranslation } from 'react-i18next'; 
import { useNavigate } from 'react-router-dom';

function SuggestFriendComponent() {
  const { t } = useTranslation(); 
  const [friends, setFriends] = useState([]);
  const router = useNavigate();
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const res = await getSuggestFriends();
      setFriends(res);
    } catch (error) {
      setFriends([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendFriendRequest = async (userId) => {
    try {
      const result = await sendFriendRequest(userId);

      if (result.success) {
        setError(t('friend_request_sent'));
        fetchData(); // Refresh list
      } else {
        setError(result.message || t('friend_request_failed'));
      }
    } catch (err) {
      setError(t('friend_request_failed'));
    }
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant='h4'>{t('suggested_for_you')}</Typography>
        <Button onClick={() => router("/friends")}>{t('see_more')}</Button>
      </Box>
      {error && (
        <Typography variant="body2" color="error">{error}</Typography>
      )}

      <List
        sx={{
          height: '30vh',
          overflowY: 'auto',
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {friends.slice(0, 25).map((friend) => (
          <ListItem
            key={friend.id}
            sx={{
              p: 1,
              mb: 1,
              borderRadius: '12px',
              boxShadow: 0,
              backgroundColor: 'white',
              transition: 'all 0.2s ease',
              '&:hover': {
                transform: { xs: 'none', sm: 'translateY(-2px)' },
                boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' },
              }
            }}
          >
            <ListItemAvatar>
              <Avatar src={friend?.avatar_url} alt={friend.username}>
                {friend.username?.charAt(0) || "P"}
              </Avatar>
            </ListItemAvatar>

            <ListItemText
              primary={friend.username}
              secondary={t('suggest_for_you')}
              secondaryTypographyProps={{
                sx: { fontSize: '0.75rem' },
              }}
            />

            <IconButton
              onClick={() => handleSendFriendRequest(friend.id)}
              edge="end"
              aria-label={t('friend_request_sent')}
            >
              <PersonAddIcon />
            </IconButton>
          </ListItem>
        ))}

        {friends.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {t('no_user_to_suggest')}
            </Typography>
          </Box>
        )}
      </List>
    </Box>
  );
}

export default SuggestFriendComponent;