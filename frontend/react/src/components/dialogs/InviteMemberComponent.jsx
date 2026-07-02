import {
  CheckCircle,
  Close,
  PersonAdd,
  Search
} from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Modal,
  Paper,
  TextField,
  Typography
} from "@mui/material";
import { useEffect, useState } from "react";
import { inviteToGroup, searchUsers } from "../../services/api";

function InviteMemberComponent({ open, onClose, onSuccess, group }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [recentlyInvited, setRecentlyInvited] = useState([]);

  useEffect(() => {
    if (open) {
      setUsers([]);
      setQuery("");
      setError("");
      setSuccess("");
      setRecentlyInvited([]);
    }
  }, [open]);

  const handleSearchUsers = async (e) => {
    const value = e.target.value;
    setQuery(value);
    setError("");

    if (value.trim().length < 2) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const res = await searchUsers(value);
      
      const filteredUsers = Array.isArray(res) ? res.filter(user => 
        !recentlyInvited.includes(user.id) &&
        !group?.members?.some(member => member.id === user.id)
      ) : [];
      
      setUsers(filteredUsers);
      
      if (filteredUsers.length === 0 && value.trim().length >= 2) {
        setError("No users found matching your search");
      }
    } catch (error) {
      console.error("Search error:", error);
      setError("Failed to search users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (user) => {
    try {
      setInviting(user.id);
      setError("");
      
      await inviteToGroup(group.id, user.id);
      
      setRecentlyInvited(prev => [...prev, user.id]);
      
      setUsers(prev => prev.filter(u => u.id !== user.id));
      
      setSuccess(`Invitation sent to ${user.name || user.email}!`);
      
      if (onSuccess) onSuccess(user);
      
      setTimeout(() => setSuccess(""), 2000);
      
    } catch (error) {
      console.error("Invite error:", error);
      setError(error.message || "Failed to send invitation");
    } finally {
      setInviting(null);
    }
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5',
      '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
      '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'
    ];
    const index = (name?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <Modal open={open} onClose={onClose} disableEscapeKeyDown={false}>
      <Paper
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: '90%', sm: 500 },
          maxHeight: '80vh',
          bgcolor: "background.paper",
          borderRadius: 2,
          boxShadow: 24,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Box
          sx={{
            p: 3,
            pb: 2,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <Typography variant="h6" component="h2" fontWeight="600">
            Invite to Group
          </Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>

        {group && (
          <Box sx={{ p: 3, pb: 2, bgcolor: 'grey.50' }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Inviting users to:
            </Typography>
            <Typography variant="body1" fontWeight="500">
              {group.name}
            </Typography>
            {group.members && (
              <Typography variant="caption" color="text.secondary">
                {group.members.length} member{group.members.length !== 1 ? 's' : ''} in group
              </Typography>
            )}
          </Box>
        )}

        <Box sx={{ p: 3, pb: 2 }}>
          <TextField
            label="Search users by name or email"
            variant="outlined"
            fullWidth
            value={query}
            onChange={handleSearchUsers}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            placeholder="Type at least 2 characters to search..."
            autoFocus
          />
        </Box>

        <Box sx={{ px: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
              {success}
            </Alert>
          )}
        </Box>

        <Box sx={{ flex: 1, overflow: 'auto', px: 3, pb: 3 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          ) : query.length < 2 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Search sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                Type at least 2 characters to search for users
              </Typography>
            </Box>
          ) : users.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No users found matching "{query}"
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Try searching with a different name or email
              </Typography>
            </Box>
          ) : (
            <>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Found {users.length} user{users.length !== 1 ? 's' : ''}
              </Typography>
              
              <List sx={{ py: 0 }}>
                {users.map((user) => (
                  <ListItem 
                    key={user.id} 
                    divider
                    secondaryAction={
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={inviting === user.id ? <CircularProgress size={16} /> : <PersonAdd />}
                        onClick={() => handleInviteMember(user)}
                        disabled={inviting === user.id}
                        sx={{ minWidth: 100 }}
                      >
                        {inviting === user.id ? 'Sending...' : 'Invite'}
                      </Button>
                    }
                    sx={{ py: 2 }}
                  >
                    <ListItemAvatar>
                      <Avatar 
                        sx={{ 
                          bgcolor: getAvatarColor(user.name || user.email),
                          width: 40,
                          height: 40
                        }}
                      >
                        {getInitials(user.name || user.email)}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="500">
                          {user.name || user.username}
                          {recentlyInvited.includes(user.id) && (
                            <Chip
                              icon={<CheckCircle />}
                              label="Invited"
                              size="small"
                              color="success"
                              variant="outlined"
                              sx={{ ml: 1, height: 20 }}
                            />
                          )}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="body2" color="text.secondary">
                          {user.email}
                          {user.name && user.username && ` • @${user.username}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </Box>

        {recentlyInvited.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Recently Invited ({recentlyInvited.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {users
                  .filter(user => recentlyInvited.includes(user.id))
                  .map(user => (
                    <Chip
                      key={user.id}
                      label={user.name || user.email}
                      size="small"
                      color="success"
                      variant="outlined"
                      onDelete={() => {
                        setRecentlyInvited(prev => prev.filter(id => id !== user.id));
                      }}
                    />
                  ))}
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Modal>
  );
}

export default InviteMemberComponent;