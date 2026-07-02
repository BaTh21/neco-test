import {
    Typography, Box, List, ListItemAvatar, Avatar, ListItem, ListItemText, IconButton,
    Tooltip
} from "@mui/material"
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { sendFriendRequest } from "../../services/api";
import { useState } from "react";

function SuggestFriendComponent({ suggestFriends }) {
    const [friends, setFriends] = useState(suggestFriends);
    const [error, setError] = useState("");

    const handleSendFriendRequest = async (userId) => {
        const result = await sendFriendRequest(userId);
        if (result.success) {
            setError(result.message);
            setFriends(prev => prev.filter(f => f.id !== userId));
        } else {
            setError(result.message);
        }
    };

    return (
        <Box>
            {friends < 0 && (
                <>
                    <Typography variant="h5" gutterBottom fontWeight="600" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                        Suggested Friends
                    </Typography>
                    {error && (
                        <Typography variant="body2" color="error">
                            {error}
                        </Typography>
                    )}
                    <Box
                        onWheel={(e) => {
                            if (e.deltaY !== 0) {
                                e.currentTarget.scrollLeft += e.deltaY;
                                e.preventDefault();
                            }
                        }}
                        sx={{
                            display: 'flex',
                            overflowX: 'auto',
                            scrollBehavior: 'smooth',
                            whiteSpace: 'nowrap',
                            '&::-webkit-scrollbar': { display: 'none' },
                        }}
                    >
                        <List
                            sx={{
                                display: 'inline-flex',
                                width: { xs: 200, md: 500, lg: '100%' },
                                whiteSpace: 'nowrap',
                                gap: 1
                            }}
                        >
                            {friends.slice(0, 10).map((friend) => (
                                <ListItem
                                    key={friend.id}
                                    sx={{
                                        mb: 1,
                                        borderRadius: '12px',
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        backgroundColor: 'white',
                                        transition: 'all 0.2s ease',
                                        flexDirection: { xs: 'column', sm: 'row' },
                                        alignItems: { xs: 'stretch', sm: 'center' },
                                        gap: { xs: 2, sm: 0 },
                                        '&:hover': {
                                            transform: { xs: 'none', sm: 'translateY(-2px)' },
                                            boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' },
                                        },
                                        width: { xs: 180, md: 230 },
                                        display: 'flex',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Box sx={{
                                        // display: 'flex',
                                        alignItems: 'center',
                                        width: { xs: '100%', sm: 'auto' },
                                        flex: 1,
                                        minWidth: 0,
                                    }}>
                                        <ListItemAvatar sx={{ minWidth: { xs: 40, sm: 48 } }}>
                                            <Avatar
                                                src={friend.avatar_url}
                                                sx={{
                                                    width: { xs: 150, md: 200 },
                                                    height: { xs: 125, md: 175 },
                                                    border: 1,
                                                    borderColor: 'divider',
                                                    // bgcolor: 'primary.light',
                                                    borderRadius: 3,
                                                    fontSize: 44
                                                }}
                                                imgProps={{
                                                    onError: (e) => {
                                                        e.target.style.display = 'none';
                                                    }
                                                }}
                                            >
                                                {friend.username.charAt(0).toUpperCase()}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography
                                                    variant="body1"
                                                    fontWeight="500"
                                                    sx={{
                                                        fontSize: { xs: '0.9rem', sm: '1rem' },
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        fontSize: 18,
                                                        width: { xs: 150, md: 190 },
                                                        mt: 1
                                                    }}
                                                >
                                                    {friend.username}
                                                </Typography>
                                            }
                                            secondary={
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                        width: { xs: 150, md: 190 },
                                                    }}
                                                >
                                                    {friend.email}
                                                </Typography>
                                            }
                                            sx={{ my: 0, mr: { xs: 0, sm: 2 }, flex: 1, minWidth: 0 }}
                                        />
                                    </Box>

                                    <Tooltip title={`add ${friend.username} as friend`}>
                                        <IconButton
                                            variant="outlined"
                                            size="small"
                                            onClick={() => handleSendFriendRequest(friend.id)}
                                            sx={{
                                                borderRadius: '8px',
                                                px: { xs: 1, sm: 2 },
                                                flex: { xs: 1, sm: 'none' },
                                                position: 'absolute',
                                                top: 10,
                                                right: { xs: 24, md: 20 },
                                                width: 0,
                                                color: 'primary.main',
                                                transform: 'translate 0.2s',
                                                '&:hover': {
                                                    transform: 'scale(1.2)',
                                                    backgroundColor: 'transparent'
                                                }
                                            }}
                                        >
                                            <PersonAddIcon />
                                        </IconButton>
                                    </Tooltip>

                                </ListItem>
                            ))}
                            {friends.length === 0 && (
                                <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    No suggested found
                                </Typography>
                            )}
                        </List>
                    </Box>
                </>
            )}
        </Box>
    )
}

export default SuggestFriendComponent
