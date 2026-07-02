import {
    Box,
    Modal,
    Divider,
    IconButton,
    Typography,
    Avatar,
    Stack,
    Button,
    Tab,
    Tabs
} from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import BlockIcon from '@mui/icons-material/Block';
import { useState, useEffect, useRef } from 'react';
import { getPrivateChat } from '../../services/api';
import PreviewDialog from './ImageDialog';
import { VoiceMessagePlayer } from '../group/VoiceMessagePlayer';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ImageIcon from '@mui/icons-material/Image';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

function FriendProfileDialog({ open, onClose, profile, onCall, currentChatId }) {

    const [selectedTab, setSelectedTab] = useState("all");
    const [messages, setMessages] = useState([]);

    const filteredMessages =
        selectedTab === "all"
            ? messages
            : messages.filter((m) => m.message_type === selectedTab);

    const [selectedMessage, setSelectedMessage] = useState(null);

    const [limit] = useState(10);
    const [offset, setOffset] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [imageError, setImageError] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);

    const videoRef = useRef(null);

    const TABS = ["all", "image", "voice", "video", "file"];

    const handleChange = (event, newValue) => {
        setSelectedTab(newValue);
    };

    useEffect(() => {
        if (open && profile?.id) {
            setMessages([]);
            setOffset(0);
            setHasMore(true);

            fetchMessages(0, false);
        }
    }, [open, profile?.id]);

    if (!profile) return null;

    const fetchMessages = async (
        currentOffset = 0,
        append = false
    ) => {
        if (loadingMore) return;

        try {
            setLoadingMore(true);

            const data = await getPrivateChat(
                profile.id,
                limit,
                currentOffset,
                true
            );

            if (data.length < limit) {
                setHasMore(false);
            }

            setMessages((prev) =>
                append ? [...prev, ...data] : data
            );
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingMore(false);
        }
    };

    const handleScroll = (event) => {
        const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;

        const reachedBottom =
            scrollHeight - scrollTop <= clientHeight + 50;

        if (
            reachedBottom &&
            !loadingMore &&
            hasMore
        ) {
            const nextOffset = offset + limit;

            setOffset(nextOffset);
            fetchMessages(nextOffset, true);
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const retryImageLoad = () => {
        setImageError(false);
    };

    const renderImageContent = (message) => (
        <Box sx={{ mb: 1, position: 'relative' }}>
            {imageError && (
                <Box
                    sx={{
                        width: '100%',
                        height: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: 'grey.100',
                        borderRadius: '8px',
                        border: '1px solid primary.main',
                        flexDirection: 'column',
                        gap: 1,
                    }}
                >
                    <ImageIcon sx={{ color: 'grey.400', fontSize: 40 }} />
                    <Typography variant="body2" color="text.secondary" align="center">
                        Failed to load image
                    </Typography>
                    <Button size="small" variant="outlined" onClick={retryImageLoad}>
                        Retry
                    </Button>
                </Box>
            )}

            {!imageError && (
                <>
                    <img
                        src={message.content}
                        alt="Chat image"
                        onError={handleImageError}
                        style={{
                            maxWidth: '100%',
                            maxHeight: 200,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            objectFit: 'cover',
                        }}
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMessage(message);
                        }}
                    />
                </>
            )}
        </Box>
    );

    const renderVoiceContent = (message) => {

        return (
            <VoiceMessagePlayer
                url={message.content}
            />

        );
    };

    const renderVideoContent = (message) => {

        const handlePlay = () => {
            if (videoRef.current) {
                videoRef.current.play();
                setIsPlaying(true);
            }
        };

        return (
            <Box
                sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    width: '100%',
                    maxWidth: 200,
                    bgcolor: 'black',
                }}
            >
                <video
                    ref={videoRef}
                    controls={isPlaying}
                    style={{ width: '100%', display: 'block' }}
                    onEnded={() => setIsPlaying(false)}
                >
                    <source src={message.content} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>

                {!isPlaying && (
                    <IconButton
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlay();
                        }}
                        sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            bgcolor: 'rgba(0,0,0,0.6)',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                            borderRadius: '50%',
                            width: 60,
                            height: 60,
                            color: 'white',
                        }}
                    >
                        <PlayArrowIcon sx={{ fontSize: 40 }} />
                    </IconButton>
                )}
            </Box>
        );
    };

    const renderFileContent = (message, isMine) => {
        const fileName = message.content
            ? message.content.split('/').pop()
            : 'Download File';

        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    p: 1,
                    bgcolor: isMine ? 'primary.main' : 'grey.300',
                    color: isMine ? 'white' : 'black',
                    borderRadius: 2,
                    cursor: 'pointer',
                    maxWidth: { xs: 200, sm: 400 },
                }}
            >

                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: 'white',
                        padding: 1,
                        borderRadius: '50%',
                        width: 40,
                        height: 40,
                        mr: 0.5
                    }}
                >
                    <InsertDriveFileIcon sx={{ mr: 1, color: isMine ? 'primary.main' : 'grey' }} />
                </Box>
                <Typography variant="body2" noWrap onClick={() => window.open(message.content, '_blank')}
                    sx={{
                        textDecoration: 'none',
                        '&:hover': {
                            textDecoration: 'underline',
                            borderBottomColor: 'red'
                        },
                    }}
                >
                    {fileName}
                </Typography>
            </Box>
        );
    };

    return (
        <>
            <Modal
                open={open}
                onClose={onClose}
            >
                <Box
                    onScroll={handleScroll}
                    sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: { xs: '90%', md: 380 },
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        boxShadow: 24,
                        p: 3,
                        height: "80vh",
                        overflowY: "auto",
                    }}
                >
                    <Box
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            alignItems: 'center'
                        }}
                    >
                        <Avatar
                            src={profile?.avatar ?? ''}
                            alt={profile?.name || "User Avatar"}
                            sx={{
                                width: 100,
                                height: 100,
                                transition: "transform 0.5s ease, opacity 0.5s ease",
                            }}
                        >
                            {profile?.name?.charAt(0)?.toUpperCase() || "?"}
                        </Avatar>
                        <Typography
                            variant="h6"
                            align="center"
                            sx={{ fontWeight: 600 }}
                        >
                            {profile.name}
                        </Typography>
                    </Box>
                    <Divider sx={{ my: 1.5 }} />

                    <Stack
                        direction="row"
                        justifyContent="space-evenly"
                        sx={{ py: 2 }}
                    >
                        <Box textAlign="center">
                            <IconButton
                                color="primary"
                                sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                                onClick={() => onCall({ callType: "voice" })}
                            >
                                <CallIcon />
                            </IconButton>
                            <Typography variant="caption" display="block">
                                Voice Call
                            </Typography>
                        </Box>

                        <Box textAlign="center">
                            <IconButton
                                color="primary"
                                sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                                onClick={() => onCall({ callType: "video" })}
                            >
                                <VideocamIcon />
                            </IconButton>
                            <Typography variant="caption" display="block">
                                Video Call
                            </Typography>
                        </Box>
                        <Box textAlign="center">
                            <IconButton
                                color="primary"
                                sx={{ bgcolor: 'grey.200', '&:hover': { bgcolor: 'grey.100' }, mb: 0.5, borderRadius: 2 }}
                            >
                                <BlockIcon />
                            </IconButton>
                            <Typography variant="caption" display="block">
                                Block
                            </Typography>
                        </Box>
                    </Stack>
                    <Divider sx={{ my: 1.5 }} />
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <Tabs
                            value={selectedTab}
                            onChange={handleChange}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            {TABS.map((tab) => (
                                <Tab
                                    key={tab}
                                    value={tab}
                                    label={tab.toUpperCase()}
                                />
                            ))}
                        </Tabs>
                    </Box>
                    <br />
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1
                        }}
                    >
                        {filteredMessages.length > 0 &&
                            filteredMessages.map((message, index) => {

                                const isOwn = message.sender_id === currentChatId;
                                return (
                                    <div key={index}>
                                        {message.message_type === "image" && message.content && (
                                            renderImageContent(message)
                                        )}
                                        {message.message_type === "voice" && message.content && (
                                            renderVoiceContent(message)
                                        )}
                                        {message.message_type === "video" && message.content && (
                                            renderVideoContent(message)
                                        )}
                                        {message.message_type === "file" && message.content && (
                                            renderFileContent(message, isOwn)
                                        )}
                                    </div>
                                );
                            })}
                        {loadingMore && <p>Loading...</p>}
                    </Box>
                </Box>
            </Modal >
            {selectedMessage && (
                <PreviewDialog
                    open={!!selectedMessage}
                    onClose={() => setSelectedMessage(null)}
                    url={selectedMessage.content}
                    type={selectedMessage.message_type}
                />
            )}
        </>
    )
}

export default FriendProfileDialog
