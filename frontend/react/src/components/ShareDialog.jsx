import { Close, Group, Lock } from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Drawer,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Radio,
  RadioGroup,
  Switch,
  Typography
} from '@mui/material';
import { useEffect, useState } from 'react';
import { getFriends } from '../services/api';

const ShareDrawer = ({ open, note, onClose, onShare }) => {
  const [shareType, setShareType] = useState('private');
  const [friendIds, setFriendIds] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const loadFriends = async () => {
      setLoading(true);
      try {
        const friendsData = await getFriends();
        setFriends(friendsData);
      } catch (err) {
        console.error('Error loading friends:', err);
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };

    loadFriends();

    if (note) {
      setShareType(note.share_type || 'private');
      setFriendIds(note.shared_with || []);
      setCanEdit(note.can_edit || false);
    } else {
      setShareType('private');
      setFriendIds([]);
      setCanEdit(false);
    }
  }, [open, note]);

  const handleFriendToggle = (id) => {
    setFriendIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleApply = () => {
    onShare({
      share_type: shareType,
      friend_ids: shareType === 'shared' ? friendIds : [],
      can_edit: canEdit
    });
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 380, p: 3, display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Share Note</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>

        {/* Sharing Options */}
        <FormControl sx={{ mt: 3 }}>
          <FormLabel>Sharing Options</FormLabel>
          <RadioGroup value={shareType} onChange={(e) => setShareType(e.target.value)}>
            <FormControlLabel
              value="private"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center">
                  <Lock sx={{ mr: 1 }} />
                  <Typography>Private</Typography>
                </Box>
              }
            />
            <FormControlLabel
              value="shared"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center">
                  <Group sx={{ mr: 1 }} />
                  <Typography>Shared with Friends</Typography>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>

        {/* Friends List */}
        {shareType === 'shared' && (
          <Box sx={{ mt: 3, flex: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Select Friends
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" py={3}>
                <CircularProgress />
              </Box>
            ) : friends.length === 0 ? (
              <Typography color="text.secondary" align="center">
                No friends found
              </Typography>
            ) : (
              <>
                <List sx={{ maxHeight: 220, overflow: 'auto', border: '1px solid', borderColor: 'divider' }}>
                  {friends.map((friend) => (
                    <ListItem
                      key={friend.id}
                      button
                      selected={friendIds.includes(friend.id)}
                      onClick={() => handleFriendToggle(friend.id)}
                    >
                      <ListItemIcon>
                        <Group />
                      </ListItemIcon>
                      <ListItemText
                        primary={friend.username || friend.name || friend.email}
                        secondary={friend.email}
                      />
                    </ListItem>
                  ))}
                </List>

                {friendIds.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      Sharing with {friendIds.length} friend{friendIds.length !== 1 && 's'}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {friendIds.map((id) => {
                        const f = friends.find((x) => x.id === id);
                        return (
                          f && (
                            <Chip
                              key={id}
                              label={f.username || f.name || f.email}
                              size="small"
                              onDelete={() => handleFriendToggle(id)}
                            />
                          )
                        );
                      })}
                    </Box>
                  </Box>
                )}
              </>
            )}
          </Box>
        )}

        {/* Edit Permission */}
        {(shareType === 'shared') && (
          <FormControlLabel
            sx={{ mt: 2 }}
            control={
              <Switch
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
              />
            }
            label="Allow editing"
          />
        )}

        {/* Actions */}
        <Box sx={{ mt: 'auto', pt: 2 }}>
          <Button
            variant="contained"
            fullWidth
            onClick={handleApply}
            disabled={shareType === 'shared' && friendIds.length === 0}
          >
            Apply Sharing
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default ShareDrawer;
