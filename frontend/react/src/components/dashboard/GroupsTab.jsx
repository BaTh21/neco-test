import {
  Box,
  Button,
  Card,
  Typography,
  useMediaQuery,
  useTheme,
  Avatar,
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import { formatCambodiaDate } from '../../utils/dateUtils';
import GroupChatPage from '../../pages/GroupChatPage';
import { useEffect, useState } from 'react';
import AddBoxIcon from '@mui/icons-material/AddBox';
import CreateGroupDialog from '../CreateGroupDialog';
import { getFriends } from '../../services/api';
import SearchIcon from '@mui/icons-material/Search';
import { useTranslation } from 'react-i18next';

const GroupsTab = ({ groups }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [openCreateGroup, setOpenCreateGroup] = useState(false);
  const [friends, setFriends] = useState([]);
  const [showGroupList, setShowGroupList] = useState(true);

  const fetchFriends = async () => {
    const res = await getFriends();
    setFriends(res);
  }

  useEffect(() => {
    fetchFriends();
  }, []);

  useEffect(() => {
    return () => {
      setSelectedGroupId(null);
    };
  }, []);

  const getLatestCover = (group) => {
    if (!group.images || group.images.length === 0) return null;

    return group.images.reduce((latest, current) =>
      new Date(current.created_at) > new Date(latest.created_at) ? current : latest
    ).url;
  };

  const handleSuccess = () => {
    fetchFriends();
    setOpenCreateGroup(false);
  }

  const toggleGroupList = () => setShowGroupList((prev) => !prev);

  return (
    <Box
      sx={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', mt: {xs: 1, md: 0} }}
    >
      {showGroupList && (
        <Box
          sx={{
            width: { xs: '100%', md: '25%' },
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: { sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: { xs: 2, sm: 0 }, mb: 3 }}>
            <Typography variant="h5" fontWeight="600" sx={{ textAlign: { xs: 'center', sm: 'left' } }}>
              {t('groups')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddBoxIcon />}
              sx={{
                borderRadius: '8px',
                minWidth: { xs: 10, sm: 'auto' }
              }}
              size={isMobile ? 'small' : 'medium'}
              onClick={() => setOpenCreateGroup(true)}
            >
              {t('create')}
            </Button>
          </Box>

          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', mb: {xs: 2, md: 4} }}>
            <TextField
              sx={{ width: "100%" }}
              id="outlined-member-search"
              label={t('search_group')}
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton>
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          {groups.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              {t('no_groups_yet')}
            </Typography>
          ) : (
            groups.map((group) => (
              <Card
                key={group.id}
                onClick={() => {
                  setSelectedGroupId(group.id);
                  if (isMobile) setShowGroupList(false);
                }}
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
                <Box sx={{
                  display: 'flex',
                  flexDirection: { sm: 'row' },
                  justifyContent: 'space-between',
                  gap: { xs: 1, sm: 2 },
                  alignItems: 'center'
                }}>
                  <Avatar src={getLatestCover(group)}>
                    {!group.images || group.images.length === 0 ? group.name[0] : null}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight="600" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>
                      {group.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: 10, sm: 12 } }}>
                      {t('created')} {formatCambodiaDate(group.created_at)}
                    </Typography>
                  </Box>
                </Box>
              </Card>
            ))
          )}
        </Box>
      )}
      {(!isMobile || !showGroupList) && (
        <Box sx={{ width: '100%' }}>
          {!selectedGroupId ? (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
              <Typography align="center" color="text.secondary" sx={{ fontSize: 18, mb: 10 }}>
                {t('select_group_to_view_chat')}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ pl: {xs: 0, md: 3} }}>
              <GroupChatPage key={selectedGroupId} groupId={selectedGroupId} toggleGroupList={toggleGroupList} />
            </Box>
          )}
        </Box>
      )}

      <CreateGroupDialog
        open={openCreateGroup}
        onClose={() => setOpenCreateGroup(false)}
        onSuccess={handleSuccess}
        friends={friends}
      />
    </Box>
  );
};

export default GroupsTab;
