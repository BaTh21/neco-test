import {
    Box, List, IconButton, Button, ListItem, ListItemAvatar, Avatar, ListItemText, Typography, TextField, InputAdornment, useMediaQuery,
    useTheme,
    Tooltip,
} from "@mui/material";
import { getChatList } from "../../services/api"
import { useState, useEffect, useRef } from "react"
import SearchIcon from '@mui/icons-material/Search';
import MessagesTab from "./MessagesTab";
import GroupChatPage from "../../pages/GroupChatPage";
import CreateGroupDialog from "../CreateGroupDialog";
import AddBoxIcon from '@mui/icons-material/AddBox';
import { useTranslation } from 'react-i18next';
import Logo from '/pengu-pudgy.webp';
import GroupsIcon from '@mui/icons-material/Groups';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { formatCambodiaTime } from "../../utils/dateUtils";

const getLastMessagePreview = (chat) => {
    switch (chat.last_message_type) {
        case 'image':
            return '📷 Photo';

        case 'video':
            return '🎥 Video';

        case 'voice':
            return '🎤 Voice message';

        case 'file':
            return '📄 File';

        case 'system':
            return '🔔 System message';

        default:
            return chat.last_message || 'Tap to start new message';
    }
};

function ChatTab({ friends, profile, error, setError, setSuccess, setCallRequest, send, chats, setChats, setUnreadMessages }) {

    const [showFriend, setShowFriend] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [showGroupList, setShowGroupList] = useState(true);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [openCreateGroup, setOpenCreateGroup] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [chatFilter, setChatFilter] = useState("all");

    const { t } = useTranslation();

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const [chatWidth, setChatWidth] = useState(300);
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef(null);
    const currentChatId = selectedFriend?.id || selectedGroupId;
    const currentChatType = selectedFriend ? "private" : selectedGroupId ? "group" : null;

    const handleMouseDown = (e) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            if (!sidebarRef.current) return;
            const containerLeft = sidebarRef.current.getBoundingClientRect().left;
            const newWidth = e.clientX - containerLeft;

            if (newWidth > 300 && newWidth < 800) {
                setChatWidth(newWidth);
            }
        };

        const handleMouseUp = () => setIsResizing(false);

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const fetchData = async () => {
        const res = await getChatList();
        setChats(res);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const toggleGroupList = () => {
        if (isMobile) {
            setShowGroupList(true);
            setShowFriend(false);
            setSelectedGroupId(null);
        }
    };

    const handleSuccess = () => {
        setOpenCreateGroup(false);
        fetchData();
    };

    const filteredChats = chats.filter((chat) => {
        const matchesSearch = chat.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        const matchesFilter =
            chatFilter === "all" ||
            (chatFilter === "friends" && chat.type === "private") ||
            (chatFilter === "groups" && chat.type === "group");

        return matchesSearch && matchesFilter;
    });

    useEffect(() => {
        if (!currentChatId || !currentChatType) return;

        const selectedChat = chats.find(
            chat =>
                chat.id === currentChatId &&
                chat.type === currentChatType
        );

        const unreadCount = selectedChat?.unread_count ?? 0;

        if (unreadCount <= 0) return;

        // 1. reset chat locally
        setChats(prev =>
            prev.map(chat =>
                chat.id === currentChatId &&
                    chat.type === currentChatType
                    ? { ...chat, unread_count: 0 }
                    : chat
            )
        );

        // 2. decrement global safely (based on current known value)
        setUnreadMessages(prev => {
            const next = prev - unreadCount;
            return next > 0 ? next : 0;
        });

    }, [currentChatId, currentChatType, chats]);

    return (
        <Box sx={{ display: 'flex', width: '100%', height: '100vh', position: 'relative' }}>
            {(showGroupList || !isMobile) && (
                <Box
                    ref={sidebarRef}
                    sx={{
                        position: 'relative',
                        width: { xs: '100%', md: chatWidth },
                        transition: isResizing ? 'none' : 'width 0.1s',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            All Chats ({chats.length})
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<AddBoxIcon />}
                            sx={{ borderRadius: '8px', minWidth: { xs: 10, sm: 'auto' } }}
                            size={isMobile ? 'small' : 'medium'}
                            onClick={() => setOpenCreateGroup(true)}
                        >
                            {t('create')}
                        </Button>
                    </Box>

                    <Box sx={{ py: 2 }}>
                        <TextField
                            fullWidth
                            size="small"
                            label="Search chat"
                            variant="outlined"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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

                    <Box sx={{ pb: 0 }}>
                        <ToggleButtonGroup
                            value={chatFilter}
                            exclusive
                            fullWidth
                            size="small"
                            onChange={(e, newFilter) => {
                                if (newFilter !== null) {
                                    setChatFilter(newFilter);
                                }
                            }}
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiToggleButtonGroup-grouped': {
                                    border: 0,
                                    borderRadius: 0,
                                    textTransform: 'none',
                                    color: 'text.secondary',
                                    py: 1,
                                    '&.Mui-selected': {
                                        color: 'primary.main',
                                        backgroundColor: 'transparent',
                                        borderBottom: 2,
                                        borderColor: 'primary.main',
                                        fontWeight: 600,
                                    },
                                    '&:hover': {
                                        backgroundColor: 'transparent',
                                    },
                                },
                            }}
                        >
                            <ToggleButton value="all">
                                All
                            </ToggleButton>

                            <ToggleButton value="friends">
                                Friends
                            </ToggleButton>

                            <ToggleButton value="groups">
                                Groups
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Box>
                    <Box
                        sx={{
                            flex: 1,
                            overflowY: 'auto',
                            '&::-webkit-scrollbar': { display: 'none' },
                            scrollbarWidth: 'none',
                        }}
                    >
                        <List>
                            {filteredChats.map((chat) => (
                                <ListItem
                                    key={`${chat.type}-${chat.id}`}
                                    onClick={() => {
                                        if (isMobile) setShowGroupList(false);
                                        if (chat.type === 'private') {
                                            setShowFriend(true);
                                            setSelectedFriend({
                                                id: chat.id,
                                                name: chat.name,
                                                avatar: chat.avatar,
                                            });
                                            setSelectedGroupId(null);
                                        } else if (chat.type === 'group') {
                                            setShowFriend(false);
                                            setSelectedGroupId(chat.id);
                                            setSelectedFriend(null);
                                        }
                                    }}
                                    sx={{
                                        // mb: 1,
                                        p: 1,
                                        // borderRadius: '12px',
                                        cursor: 'pointer',
                                        backgroundColor:
                                            (chat.type === 'private' && selectedFriend?.id === chat.id) ||
                                                (chat.type === 'group' && selectedGroupId === chat.id)
                                                ? 'primary.main'
                                                : 'transparent',
                                        color:
                                            (chat.type === 'private' && selectedFriend?.id === chat.id) ||
                                                (chat.type === 'group' && selectedGroupId === chat.id)
                                                ? 'primary.contrastText'
                                                : 'inherit',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: { xs: 'none', sm: 'translateY(-2px)' },
                                            boxShadow: { xs: 'none', sm: '0 4px 12px rgba(0,0,0,0.1)' },
                                        },
                                    }}
                                >
                                    <ListItemText
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            right: 0,
                                            fontSize: 10,
                                            color:
                                                (chat.type === 'private' && selectedFriend?.id === chat.id) ||
                                                    (chat.type === 'group' && selectedGroupId === chat.id)
                                                    ? 'white'
                                                    : 'black',
                                            borderRadius: 1,
                                            width: 100,
                                            textAlign: 'center',
                                            transform: 'translateY(-2px)'
                                        }}
                                    >
                                        {formatCambodiaTime(chat.updated_at)}
                                    </ListItemText>
                                    <ListItemAvatar>
                                        <Avatar
                                            src={chat.avatar}
                                        >
                                            {chat.name.charAt(0).toUpperCase()}</Avatar>
                                    </ListItemAvatar>
                                    {(chat.unread_count ?? 0) > 0 && (
                                        <Tooltip title={`${chat.unread_count} unread messages`}>
                                            <Avatar
                                                sx={{
                                                    position: 'absolute',
                                                    width: 18,
                                                    height: 18,
                                                    fontSize: 10,
                                                    right: 10,
                                                    bottom: 10,
                                                    zIndex: 700,
                                                    bgcolor: (chat.type === 'private' && selectedFriend?.id === chat.id) ||
                                                        (chat.type === 'group' && selectedGroupId === chat.id)
                                                        ? 'primary.contrastText'
                                                        : 'grey.500',
                                                    color: (chat.type === 'private' && selectedFriend?.id === chat.id) ||
                                                        (chat.type === 'group' && selectedGroupId === chat.id)
                                                        ? 'grey.500'
                                                        : 'primary.contrastText',
                                                    border: 1,
                                                    borderColor: 'divider'
                                                }}
                                            >
                                                {chat.unread_count}
                                            </Avatar>
                                        </Tooltip>
                                    )}
                                    < ListItemText
                                        primary={
                                            < Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 14 }}>
                                                {chat.type === 'group' && <GroupsIcon sx={{ fontSize: 18, mb: 0.5 }} />} {chat.name}
                                            </Box>
                                        }
                                        secondary={getLastMessagePreview(chat)}
                                        secondaryTypographyProps={{
                                            sx: {
                                                fontSize: 10,
                                                maxWidth: 150,
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                color:
                                                    (chat.type === 'private' && selectedFriend?.id === chat.id) ||
                                                        (chat.type === 'group' && selectedGroupId === chat.id)
                                                        ? 'primary.contrastText'
                                                        : 'inherit',
                                            }
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box >

                    {!isMobile && (
                        <Box
                            sx={{
                                width: 8,
                                cursor: 'col-resize',
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 1000,
                                backgroundColor: 'transparent',
                                '&:hover': { backgroundColor: 'divider' },
                            }}
                            onMouseDown={handleMouseDown}
                            onTouchStart={handleMouseDown}
                        />
                    )
                    }
                </Box >
            )}

            <Box sx={{ flex: 1, position: 'relative', ml: { xs: 0, md: 2 } }}>
                {showFriend && (
                    <MessagesTab
                        friends={friends}
                        profile={profile}
                        isError={error}
                        setError={setError}
                        setSuccess={setSuccess}
                        showFriend={showFriend}
                        selectedFriend={selectedFriend}
                        toggleGroupList={toggleGroupList}
                        chats={chats}
                        currentChatId={selectedFriend?.id}
                        currentChatType="private"
                        setCallRequest={setCallRequest}
                        send={send}
                    />
                )}
                {selectedGroupId &&
                    <GroupChatPage
                        groupId={selectedGroupId}
                        toggleGroupList={toggleGroupList}
                        chats={chats}
                        setError={setError}
                        currentChatId={selectedGroupId}
                        currentChatType="group"
                        setCallRequest={setCallRequest}
                        send={send}
                    />}
                {!showFriend && !selectedGroupId && !isMobile && (
                    <Box
                        sx={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            border: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <img src={Logo} alt="logo" width={150} />
                        <Typography sx={{ fontSize: 20, color: 'primary.main', mt: 1 }}>
                            Tap a chat to start new message
                        </Typography>
                    </Box>
                )}
            </Box>

            <CreateGroupDialog open={openCreateGroup} onClose={() => setOpenCreateGroup(false)} onSuccess={handleSuccess} friends={friends} />
        </Box >
    );
}

export default ChatTab;
