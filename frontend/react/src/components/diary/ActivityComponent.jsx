import { Box, ListItem, List, ListItemAvatar, Avatar, ListItemText, Typography, Button } from "@mui/material";
import { getActivityInbox } from "../../services/api";
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; 
import InboxComponent from "../dialogs/InboxComponent";

function ActivityComponent() {
  const { t } = useTranslation();

  const [activities, setActivities] = useState([]);
  const [popup, setPopup] = useState(false);
  const LIMIT = 20;

  const fetchData = async () => {
    try {
      const acRes = await getActivityInbox(LIMIT);
      setActivities(acRes);
    } catch (error) {
      setActivities([]);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSuccess = () => {
    fetchData();
    setPopup(false);
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
        <Typography variant='h4'>{t('activity')}</Typography>
        <Button onClick={() => setPopup(true)}>{t('see_all')}</Button>
      </Box>

      <List
        sx={{
          height: '40vh',
          overflowY: 'auto',
          "&::-webkit-scrollbar": { display: "none" },
          scrollbarWidth: "none",
        }}
      >
        {activities.map((activity) => (
          <ListItem
            key={activity.id}
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
            <ListItemAvatar sx={{ position: 'relative' }}>
              <Avatar src={activity?.actor?.avatar_url} alt="profile img">
                {activity.actor?.username?.charAt(0) || "P"}
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {activity.actor?.username ?? "Deleted user"}
                </Box>
              }
              secondary={activity.extra_data}
              secondaryTypographyProps={{
                sx: { fontSize: '0.75rem' },
              }}
            />
          </ListItem>
        ))}

        {activities.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {t('no_activity_found')}
            </Typography>
          </Box>
        )}
      </List>

      <InboxComponent open={popup} onClose={() => setPopup(false)} onSuccess={handleSuccess} />
    </Box>
  );
}

export default ActivityComponent;