import {
    Comment as CommentIcon,
    Favorite as FavoriteIcon,
} from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import ClearIcon from "@mui/icons-material/Clear";
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ReplyIcon from '@mui/icons-material/Reply';
import SearchIcon from '@mui/icons-material/Search';
import {
    Avatar,
    Box,
    Button,
    CircularProgress,
    Collapse,
    Divider,
    IconButton,
    InputAdornment,
    List,
    ListItem,
    ListItemAvatar,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Paper,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
    commentOnDiary,
    deleteCommentById,
    deleteDiaryById,
    deleteShareById,
    getDiaryComments,
    getGroupById,
    getGroupDiaries,
    getGroupMembers,
    likeDiary,
    removeGroupMember
} from '../../services/api';
import { formatCambodiaDate } from '../../utils/dateUtils';
import CommentUpdateDialog from '../dialogs/CommentUpdateDialog';
import CreateDiaryForGroupDialog from '../dialogs/CreateDiaryForGroupDialog';
import DeleteDialog from '../dialogs/DeleteDialog';
import DiaryDialog from '../dialogs/DiaryDialog';
import ShareDiaryDialog from '../dialogs/ShareDiaryDailog';
import UserProfileDialog from '../dialogs/UserProfileDialog';

const GroupSideComponent = ({ groupId }) => {
    const [members, setMembers] = useState([]);
    const [diaries, setDiaries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [expendedGroupDiary, setExpendGroupDiary] = useState(null);
    const [diaryGroupComments, setDiaryGroupComments] = useState({});
    const [newComment, setNewComment] = useState({});
    const [postingComment, setPostingComment] = useState({});
    const { auth } = useAuth();
    const user = auth?.user;
    const [group, setGroup] = useState(null);
    const [open, setOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState(null);
    const [openUserProfile, setOpenUserProfile] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [openDiary, setOpenDiary] = useState(false);
    const [selectedDiary, setSelectedDiary] = useState(null);
    const [deletePopup, setDeletePopup] = useState(false);
    const [openCreateDiary, setOpenCreateDiary] = useState(false);
    const [search, setSearch] = useState("");
    const [searchMember, setSearchMember] = useState("");
    const [selectedComment, setSelectedComment] = useState(null);
    const [commentAnchorEl, setCommentAnchorEl] = useState(null);
    const [deleteReplyPopup, setDeleteReplyPopup] = useState(false);
    const [updateCommentPopup, setUpdateCommentPopup] = useState(false);
    const [openShareDiary, setOpenShareDiary] = useState(false);
    const [openDeletePopup, setOpenDeletePopup] = useState(false);
    const [anchorElForShare, setAnchorElForShare] = useState(null);
    const [selectedShareId, setSelectedSharedId] = useState(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDeleteDiary = () => {
        handleMenuClose();
        setDeletePopup(true);
    };

    const fetchGroupData = async (searchValue = "", memberSearchValue = "") => {
        setLoading(true);
        try {
            const [membersData, diariesData, groupData, commentData] = await Promise.all([
                getGroupMembers(groupId, memberSearchValue),
                getGroupDiaries(groupId, searchValue),
                getGroupById(groupId),
                getDiaryComments(groupId)
            ]);
            setMembers(membersData);
            setDiaries(diariesData);
            setGroup(groupData);
        } catch (err) {
            console.log(err);

            setDiaryGroupComments({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupData();
    }, [groupId]);

    const handleDelete = async (diaryId) => {
        try {
            await deleteDiaryById(diaryId);
            setSuccess("Diary has been deleted")
            fetchGroupData();
        } catch (error) {
            setSelectedDiary(null);
            setDeletePopup(false);
            setError("Failed to delete diary");
        }
    }

    const handleKeyPressForMember = (e) => {
        if (e.key === "Enter") {
            fetchGroupData();
        }
    };

    const handleClearMember = () => {
        setSearchMember("");
        fetchGroupData("", "");
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            fetchGroupData();
        }
    };

    const handleClear = () => {
        setSearch("");
        fetchGroupData("", "");
    };

    const handleToggleComments = async (diaryId) => {
        if (expendedGroupDiary === diaryId) {
            setExpendGroupDiary(null);
        } else {
            setExpendGroupDiary(diaryId);
            if (!diaryGroupComments[diaryId]) {
                try {
                    const data = await getDiaryComments(diaryId);
                    setDiaryGroupComments(prev => ({
                        ...prev,
                        [String(diaryId)]: data
                    }));

                } catch {
                    setDiaryGroupComments(prev => ({ ...prev, [diaryId]: [] }));
                }
            }
        }
    };

    const handleAddComment = async (diaryId) => {
        const content = newComment[diaryId]?.trim();
        if (!content) return;

        setPostingComment((prev) => ({ ...prev, [diaryId]: true }));

        try {
            const newCmt = await commentOnDiary(diaryId, content);
            setDiaryGroupComments((prev) => ({
                ...prev,
                [diaryId]: [...(prev[diaryId] || []), newCmt],
            }));
            setNewComment((prev) => ({ ...prev, [diaryId]: "" }));
            handleSuccess();
            setTimeout(() => {
                setSuccess('');
            }, 2000);
        } finally {
            handleSuccess();
            setPostingComment((prev) => ({ ...prev, [diaryId]: false }));
        }
    };

    const handleDeleteCommentId = async () => {
        try {
            await deleteCommentById(selectedComment.id);
            setSuccess("Comment has been deleted");
        } catch (error) {
            setError(`Error: ${error.message}`)
            console.log("error", error);
        }
    }

    const handleLikeGroupDiary = async (diaryId) => {
        setDiaries((prevDiaries) =>
            prevDiaries.map((d) => {
                if (d.id !== diaryId) return d;

                const isLiked = d.likes?.some((like) => like.user.id === user?.id);
                let updatedLikes;

                if (isLiked) {
                    updatedLikes = d.likes.filter((like) => like.user.id !== user?.id);
                } else {
                    updatedLikes = [
                        ...d.likes,
                        { id: Date.now(), user: { id: user?.id, username: user?.username } },
                    ];
                }

                return { ...d, likes: updatedLikes };
            })
        );

        try {
            await likeDiary(diaryId);
        } catch (error) {
            console.error("Failed to like diary:", error.message);
        }
    };

    const handleRemoveMember = async (groupId, memberId) => {
        try {
            await removeGroupMember(groupId, memberId);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    }

    const handleConfirmRemove = async () => {
        if (selectedMember) {
            try {
                await handleRemoveMember(group.id, selectedMember.id);
                setMembers(prev => prev.filter(m => m.id !== selectedMember.id));

                setSelectedMember(null);
                setOpen(false);
            } catch (error) {
                console.error(error);
                alert("Failed to remove member");
            }
        }
    };

    const handleDeleteShare = async () => {
        try {
            await deleteShareById(selectedShareId);
            setSuccess("Share has been removed");
            fetchGroupData();
        } catch (error) {
            setError(`Error ${error.message}`);
        }
    }

    const handleSuccess = () => {
        fetchGroupData();
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={4}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{ marginTop: 0.5, width: '30%' }}
        >
            <Tabs
                value={tab}
                onChange={(e, v) => setTab(v)}
                variant="fullWidth"
                sx={{
                    width: '100%',
                    position: 'relative',
                    '&::after': {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: 3,
                        bgcolor: 'divider',
                        borderRadius: 2,
                    },
                    '& .MuiTabs-indicator': {
                        height: 3,
                        borderRadius: 2,
                        bgcolor: 'primary.main',
                        zIndex: 1,
                    },
                }}
            >
                <Tab label={`Members (${members.length})`} />
                <Tab label={`Group Feed (${diaries.length})`} />
            </Tabs>


            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                    height: '80vh',
                    px: 1,
                    py: 3,
                    width: '100%'
                }}
            >
                {/* MEMBERS LIST */}
                {tab === 0 && (
                    <>
                        <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', paddingX: 2 }}>
                            <TextField
                                sx={{ width: "100%" }}
                                id="outlined-member-search"
                                label="Search member"
                                variant="outlined"
                                size="small"
                                value={searchMember}
                                onChange={(e) => setSearchMember(e.target.value)}
                                onKeyPress={handleKeyPressForMember}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {searchMember && (
                                                <IconButton onClick={handleClearMember}>
                                                    <ClearIcon />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                onClick={() => fetchGroupData(search, searchMember)}
                                            >
                                                <SearchIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />


                        </Box>

                        <List
                            sx={{
                                maxHeight: 'calc(80vh - 120px)',
                                overflowY: 'auto',
                                p: 1,
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 3 },
                            }}
                        >
                            {members.length === 0 ?
                                (
                                    <Typography
                                        color="text.secondary"
                                        align="center"
                                        sx={{ py: 6, fontStyle: "italic" }}
                                    >
                                        No member avaiable.
                                    </Typography>
                                ) : (

                                    members.map((member) => (
                                        <ListItem
                                            key={member.id}
                                            sx={{
                                                borderRadius: 2,
                                                mb: 1,
                                                bgcolor: 'grey.50',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                transition: '0.3s',
                                                '&:hover': { boxShadow: 3 },
                                            }}
                                            onClick={() => {
                                                setSelectedMember(member);
                                                setOpenUserProfile(true);
                                                setSelectedGroup(group);
                                            }}
                                        >
                                            <Box
                                                sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}

                                            >
                                                <ListItemAvatar>
                                                    <Avatar
                                                        src={member.avatar_url}
                                                        sx={{ width: 45, height: 45, fontSize: 16 }}
                                                    >
                                                        {member.username?.[0]?.toUpperCase() || 'U'}
                                                    </Avatar>
                                                </ListItemAvatar>
                                                <ListItemText
                                                    primary={
                                                        <Typography variant="subtitle2" fontWeight={500}>
                                                            {member.username}
                                                        </Typography>
                                                    }
                                                    secondary={
                                                        member.id === user?.id ? 'You' : member.email
                                                    }
                                                />
                                            </Box>

                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                {group?.creator_id === member?.id && (
                                                    <Typography sx={{ fontSize: 12, color: 'primary.main', fontWeight: 600 }}>
                                                        Admin
                                                    </Typography>
                                                )}
                                            </Box>
                                        </ListItem>
                                    ))
                                )}
                        </List>
                    </>
                )}

                {tab === 1 && (
                    <>
                        <Box
                            sx={{
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                px: 2,
                                gap: 1,
                            }}
                        >
                            <TextField
                                sx={{ flexGrow: 1 }}
                                id="outlined-search"
                                label="Search diary"
                                variant="outlined"
                                size="small"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyPress={handleKeyPress}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            {search && (
                                                <IconButton onClick={handleClear} edge="end">
                                                    <ClearIcon />
                                                </IconButton>
                                            )}
                                            <IconButton
                                                onClick={() => fetchGroupData(search, searchMember)}
                                                edge="end"
                                            >
                                                <SearchIcon />
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <IconButton
                                aria-label="add"
                                sx={{
                                    bgcolor: 'primary.main',
                                    '&:hover': { bgcolor: 'primary.dark' },
                                    borderRadius: 2,
                                }}
                                onClick={() => {
                                    setSelectedGroup(group);
                                    setOpenCreateDiary(true);
                                }}
                            >
                                <AddIcon sx={{ color: 'white' }} />
                            </IconButton>
                        </Box>
                        <Box
                            sx={{
                                overflowY: "auto",
                                maxHeight: "calc(100vh - 120px)",
                                px: 2,
                                py: 1,
                                "&::-webkit-scrollbar": { display: "none" },
                                scrollbarWidth: "none",
                            }}
                        >
                            {diaries.length === 0 ? (
                                <Typography
                                    color="text.secondary"
                                    align="center"
                                    sx={{ py: 6, fontStyle: "italic" }}
                                >
                                    No diaries posted in this group yet.
                                </Typography>
                            ) : (
                                diaries.map((d) => {
                                    const isExpanded = expendedGroupDiary === d.id;
                                    const diaryComments = diaryGroupComments[d.id] || [];
                                    const isLiked = d.likes?.some((like) => like.user.id === user?.id);
                                    const totalLikes = d?.likes?.length;

                                    const isMenuOpen = selectedDiary?.id === d.id && Boolean(anchorEl);

                                    return (
                                        <Paper
                                            key={d.id}
                                            sx={{
                                                mb: 2,
                                                boxShadow: 0,
                                                borderRadius: 3,
                                                bgcolor: 'grey.50',
                                                transition: "all 0.3s ease",
                                                "&:hover": {
                                                    boxShadow: 2,
                                                    transform: "translateY(-2px)",
                                                    bgcolor: 'primary.main',
                                                    color: 'white'
                                                },
                                            }}
                                        >
                                            {d.is_shared && d.shared_by && (
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        p: 1,
                                                    }}
                                                >
                                                    {/* Shared info */}
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="caption">Shared by</Typography>

                                                        <Avatar
                                                            src={d.shared_by.avatar_url}
                                                            alt={d.shared_by.username}
                                                            sx={{ width: 26, height: 26 }}
                                                        />

                                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                            {d.shared_by.username}
                                                        </Typography>

                                                        <Typography variant="caption">
                                                            • {formatCambodiaDate(d.shared_at)}
                                                        </Typography>
                                                    </Box>

                                                    {/* Show menu only if owner */}
                                                    {d.shared_by.id === user.id && (
                                                        <>
                                                            <IconButton onClick={(e) => setAnchorElForShare(e.currentTarget)}>
                                                                <MoreVertIcon />
                                                            </IconButton>

                                                            <Menu
                                                                anchorEl={anchorElForShare}
                                                                open={Boolean(anchorElForShare)}
                                                                onClose={() => setAnchorElForShare(null)}
                                                            >
                                                                <MenuItem
                                                                    onClick={() => {
                                                                        setAnchorElForShare(null);
                                                                        setSelectedSharedId(d.shared_id);
                                                                        setOpenDeletePopup(true);
                                                                    }}
                                                                >
                                                                    <ListItemIcon>
                                                                        <DeleteIcon color="black" fontSize="small" sx={{ mr: 1 }} />
                                                                    </ListItemIcon>
                                                                    <ListItemText primary="Delete" />
                                                                </MenuItem>
                                                            </Menu>
                                                        </>
                                                    )}
                                                </Box>
                                            )}

                                            <Paper
                                                key={d.id}
                                                elevation={isExpanded ? 6 : 2}
                                                sx={{
                                                    p: 2.5,
                                                    mb: 2,
                                                    boxShadow: 0,
                                                    borderRadius: 3,
                                                    bgcolor: 'grey.50',
                                                    transition: "all 0.3s ease",
                                                }}
                                            >

                                                {/* Header */}
                                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                                    <Typography variant="h6" fontWeight={600}>
                                                        {d.title}
                                                    </Typography>

                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatCambodiaDate(d.created_at)}
                                                        </Typography>

                                                        {/* Menu */}
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                setAnchorEl(e.currentTarget);
                                                                setSelectedDiary(d);
                                                            }}
                                                            sx={{ color: "text.secondary" }}
                                                        >
                                                            <MoreVertIcon />
                                                        </IconButton>

                                                        <Menu
                                                            anchorEl={anchorEl}
                                                            open={isMenuOpen}
                                                            onClose={() => {
                                                                setAnchorEl(null);
                                                                setSelectedDiary(null);
                                                            }}
                                                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                                                        >
                                                            {d.author?.id === user?.id ? (
                                                                [
                                                                    <MenuItem key="edit" onClick={() => { handleMenuClose(); setOpenDiary(true); setSelectedDiary(d); }}>
                                                                        <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                                                                    </MenuItem>,
                                                                    <MenuItem key="delete" onClick={() => { handleMenuClose(); handleDeleteDiary(); setSelectedDiary(d); }}>
                                                                        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                                                                    </MenuItem>,
                                                                    <MenuItem key="share" onClick={() => { handleMenuClose(); setOpenShareDiary(true); setSelectedDiary(d); }}>
                                                                        <ReplyIcon fontSize="small" sx={{ mr: 1 }} /> Share
                                                                    </MenuItem>,
                                                                ]
                                                            ) : (
                                                                <MenuItem key="share" onClick={() => { handleMenuClose(); setOpenShareDiary(true); setSelectedDiary(d); }}>
                                                                    <ReplyIcon fontSize="small" sx={{ mr: 1 }} /> Share
                                                                </MenuItem>
                                                            )}
                                                        </Menu>
                                                    </Stack>
                                                </Stack>

                                                {/* Author */}
                                                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                                    <Avatar
                                                        sx={{ width: 32, height: 32, bgcolor: "primary.light" }}
                                                        src={d.author?.avatar_url}
                                                        alt={d.author?.username || "U"}
                                                    >
                                                        {d.author?.username?.[0]?.toUpperCase() || "U"}
                                                    </Avatar>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {d.author?.username || "Unknown"}
                                                    </Typography>
                                                </Stack>

                                                {/* Content */}
                                                <Typography variant="body1" sx={{ mb: 2, whiteSpace: "pre-wrap", fontSize: 16 }}>
                                                    {d.content}
                                                </Typography>

                                                {/* Actions */}
                                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                                                    <Button
                                                        startIcon={<FavoriteIcon sx={{ color: isLiked ? "error.main" : "grey.600" }} />}
                                                        size="small"
                                                        onClick={() => handleLikeGroupDiary(d.id)}
                                                        sx={{ textTransform: "none", fontWeight: 500, color: isLiked ? "error.main" : "grey.600" }}
                                                    >
                                                        {totalLikes} {isLiked ? "Liked" : "Like"}
                                                    </Button>

                                                    <Button
                                                        startIcon={<CommentIcon />}
                                                        size="small"
                                                        sx={{ textTransform: "none", color: "grey.700", fontWeight: 500 }}
                                                        onClick={() => handleToggleComments(d.id)}
                                                    >
                                                        {d.comments?.length || 0} Comment
                                                    </Button>
                                                </Stack>

                                                {/* Comments */}
                                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                                    <Divider sx={{ my: 2 }} />

                                                    {/* Add new comment */}
                                                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                                        <TextField
                                                            size="small"
                                                            fullWidth
                                                            multiline
                                                            rows={3}
                                                            placeholder="Write a comment..."
                                                            value={newComment[d.id] || ""}
                                                            onChange={(e) =>
                                                                setNewComment((prev) => ({ ...prev, [d.id]: e.target.value }))
                                                            }
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <Button
                                                                            variant="contained"
                                                                            onClick={() => handleAddComment(d.id)}
                                                                            disabled={postingComment[d.id]}
                                                                            sx={{
                                                                                position: "absolute",
                                                                                bottom: 8,
                                                                                right: 8,
                                                                                height: 30,
                                                                                minWidth: 60,
                                                                                padding: "0 12px",
                                                                            }}
                                                                        >
                                                                            {postingComment[d.id] ? "Sending..." : "Send"}
                                                                        </Button>
                                                                    </InputAdornment>
                                                                ),
                                                            }}
                                                        />
                                                    </Stack>

                                                    {/* Comments list */}
                                                    {diaryComments.length === 0 ? (
                                                        <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
                                                            No comments yet.
                                                        </Typography>
                                                    ) : (
                                                        diaryComments.map((c) => {
                                                            const isCommentLiked = c.likes?.some((like) => like.user.id === user?.id);
                                                            const totalCommentLikes = c.likes?.length || 0;

                                                            return (
                                                                <Paper key={c.id} sx={{ mb: 1.5, p: 1.5, boxShadow: 0, backgroundColor: 'transparent' }}>
                                                                    <Stack direction="row" spacing={1} alignItems="flex-start">
                                                                        <Avatar
                                                                            sx={{ width: 28, height: 28 }}
                                                                            src={c.user?.avatar_url}
                                                                            alt={c.user?.username || "A"}
                                                                        >
                                                                            {c.user?.username?.[0]?.toUpperCase() || "A"}
                                                                        </Avatar>
                                                                        <Box sx={{ flex: 1 }}>
                                                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                                <Typography variant="subtitle2" sx={{ lineHeight: 1.2 }}>
                                                                                    {c.user?.username || "Anonymous"}
                                                                                </Typography>

                                                                                {/* Comment Menu */}
                                                                                {c.user?.id === user?.id && (
                                                                                    <>
                                                                                        <IconButton
                                                                                            size="small"
                                                                                            onClick={(e) => {
                                                                                                setCommentAnchorEl(e.currentTarget);
                                                                                                setSelectedComment(c);
                                                                                            }}
                                                                                            sx={{ color: "text.secondary" }}
                                                                                        >
                                                                                            <MoreVertIcon fontSize="small" />
                                                                                        </IconButton>

                                                                                        <Menu
                                                                                            anchorEl={commentAnchorEl}
                                                                                            open={Boolean(commentAnchorEl)}
                                                                                            onClose={() => {
                                                                                                setCommentAnchorEl(null);
                                                                                                setSelectedComment(null);
                                                                                            }}
                                                                                            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                                                                                            transformOrigin={{ vertical: "top", horizontal: "right" }}
                                                                                        >
                                                                                            <MenuItem
                                                                                                onClick={() => {
                                                                                                    setUpdateCommentPopup(true);
                                                                                                    setCommentAnchorEl(null);
                                                                                                }}
                                                                                            >
                                                                                                <EditIcon fontSize="small" sx={{ mr: 1 }} /> Edit
                                                                                            </MenuItem>

                                                                                            <MenuItem
                                                                                                onClick={() => {
                                                                                                    setDeleteReplyPopup(true);
                                                                                                    setCommentAnchorEl(null);
                                                                                                }}
                                                                                            >
                                                                                                <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> Delete
                                                                                            </MenuItem>
                                                                                        </Menu>

                                                                                    </>
                                                                                )}
                                                                            </Stack>

                                                                            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                                                                                {formatCambodiaDate(c.created_at)}
                                                                            </Typography>
                                                                            <Typography variant="body2" sx={{ mb: 1, whiteSpace: "pre-wrap" }}>
                                                                                {c.content}
                                                                            </Typography>

                                                                            {/* Comment actions */}
                                                                            <Stack direction="row" spacing={1}>
                                                                                <Button
                                                                                    size="small"
                                                                                    startIcon={<FavoriteIcon sx={{ fontSize: 18, color: isCommentLiked ? "error.main" : "grey.600" }} />}
                                                                                    sx={{ textTransform: "none", fontSize: 13, color: isCommentLiked ? "error.main" : "grey.600" }}
                                                                                    onClick={() => handleLikeComment(d.id, c.id)}
                                                                                >
                                                                                    {totalCommentLikes} {isCommentLiked ? "Liked" : "Like"}
                                                                                </Button>

                                                                                <Button
                                                                                    size="small"
                                                                                    startIcon={<ReplyIcon sx={{ fontSize: 18 }} />}
                                                                                    sx={{ textTransform: "none", fontSize: 13, color: "grey.700" }}
                                                                                    onClick={() => handleReplyComment(d.id, c.id)}
                                                                                >
                                                                                    Reply
                                                                                </Button>
                                                                            </Stack>
                                                                        </Box>
                                                                    </Stack>
                                                                </Paper>
                                                            );
                                                        })
                                                    )}

                                                </Collapse>
                                            </Paper>
                                        </Paper>
                                    );
                                })
                            )}

                        </Box>
                    </>
                )}


            </Box>

            <DeleteDialog
                open={open}
                onClose={() => setOpen(false)}
                title="Remove member"
                description={
                    selectedMember
                        ? `Are you sure you want to remove ${selectedMember.username} from ${group.name}?`
                        : ""
                }
                onConfirm={handleConfirmRemove}
            />

            <UserProfileDialog
                open={openUserProfile}
                onClose={() => setOpenUserProfile(false)}
                userData={selectedMember}
                group={selectedGroup}
                onSuccess={handleSuccess}
            />

            <DiaryDialog
                open={openDiary}
                onClose={() => setOpenDiary(false)}
                diary={selectedDiary}
                onSuccess={handleSuccess}
            />

            <DeleteDialog
                open={deletePopup}
                onClose={() => setDeletePopup(false)}
                title="Delete diary"
                description="Are you sure want to delete this diary"
                onConfirm={() => handleDelete(selectedDiary.id)}
                onSuccess={handleSuccess}
            />

            <CreateDiaryForGroupDialog
                open={openCreateDiary}
                onClose={() => setOpenCreateDiary(false)}
                group={selectedGroup}
                onSuccess={handleSuccess}
            />

            <DeleteDialog
                open={deleteReplyPopup}
                onClose={() => setDeleteReplyPopup(false)}
                onSuccess={handleSuccess}
                title="Delete comment"
                description="Are you sure want to delete comment?"
                onConfirm={handleDeleteCommentId}
            />

            <CommentUpdateDialog
                open={updateCommentPopup}
                onClose={() => setUpdateCommentPopup(false)}
                onSuccess={handleSuccess}
                comment={selectedComment}
            />

            <ShareDiaryDialog
                open={openShareDiary}
                onClose={() => setOpenShareDiary(false)}
                onSuccess={handleSuccess}
                diary={selectedDiary}
            />

            <DeleteDialog
                open={openDeletePopup}
                onClose={() => setOpenDeletePopup(false)}
                title="Delete share"
                description="Are you sure want to delete this share?"
                onConfirm={handleDeleteShare}
            />
        </Box>

    );
};

export default GroupSideComponent;
