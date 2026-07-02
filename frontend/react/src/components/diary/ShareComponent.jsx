import { useState } from "react";
import {
  Box,
  Modal,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  FormControl,
  MenuItem,
  Select,
  InputLabel,
  Chip,
  Checkbox
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import { useTranslation } from "react-i18next";
import { useFormik } from 'formik';
import { createDiary } from "../../services/api";

function ShareComponent({
  open,
  onClose,
  friends,
  groups = [],
  copyLink,
  showMessage,
  profile,
  diaryId,
  onDataUpdate
}) {
  const { t } = useTranslation();

  const [selectedFriends, setSelectedFriends] = useState([]);
  const [linkCopied, setLinkCopied] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [showContent, setShowContent] = useState(false);
  const [uploading, setUploading] = useState(false);

  const toggleShowContent = () => {
    setShowContent(prev => !prev);
  }

  const formik = useFormik({
    initialValues: {
      share_type: "public",
      group_ids: []
    }
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setSelectedFriends([]);
    setShowContent(false);
    setLinkCopied(false);

    formik.resetForm({
      values: {
        share_type: "public",
        group_ids: []
      }
    });
  };

  const toggleFriendSelection = (friend) => {
    setSelectedFriends((prev) =>
      prev.some((f) => f.id === friend.id)
        ? prev.filter((f) => f.id !== friend.id)
        : [...prev, friend]
    );
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(copyLink);
    setLinkCopied(true);
    showMessage(t("link_copied"));
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      setUploading(true);

      await createDiary({
        parent_id: diaryId,
        title,
        content,
        share_type: formik.values.share_type,
        group_ids:
          formik.values.share_type === "group"
            ? formik.values.group_ids
            : [],
        images: [],
        videos: []
      });

      showMessage(t("shared_successfully"));
      onClose();
      resetForm(); 
      onDataUpdate();
    } catch (err) {
      showMessage(err.message);
    } finally {
      setUploading(false);
    }
  };

  const safeTitle = typeof title === "string" ? title : "";
  const safeContent = typeof content === "string" ? content : "";

  const canPublish =
    safeTitle.trim().length > 0 ||
    safeContent.trim().length > 0;

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "90%", md: 450 },
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
          display: "flex",
          flexDirection: "column",
          gap: 1
        }}
      >
        <IconButton sx={{ position: "absolute", top: 6, right: 6 }} onClick={onClose}>
          <CloseSharpIcon />
        </IconButton>

        <Typography variant="h6">{t("share_this_diary")}</Typography>

        {/* Post box */}
        <Box sx={{ border: 1, borderRadius: 2, borderColor: "divider", p: 1 }}>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Avatar src={profile?.avatar_url}>
              {profile?.username?.charAt(0)?.toUpperCase()}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <TextField
                placeholder={t('whats_on_your_mind')}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                fullWidth
                variant="standard"
                InputProps={{ disableUnderline: true, fontSize: '1.1rem' }}
                onFocus={()=> {setShowContent(true)}}
              />

              {showContent && (
                <TextField
                  placeholder={t("enter_content")}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  multiline
                  rows={3}
                  maxRows={10}
                  fullWidth
                  variant="standard"
                  InputProps={{ disableUnderline: true }}
                />
              )}
            </Box>
          </Box>

          {/* Group selector */}
          {formik.values.share_type === "group" && groups.length > 0 && (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel>{t("select_groups")}</InputLabel>
              <Select
                multiple
                name="group_ids"
                value={formik.values.group_ids}
                onChange={formik.handleChange}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {groups
                      .filter((g) => selected.includes(g.id))
                      .map((g) => (
                        <Chip key={g.id} label={g.name} size="small" />
                      ))}
                  </Box>
                )}
              >
                {groups.map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    <Checkbox checked={formik.values.group_ids.includes(g.id)} />
                    <ListItemText primary={g.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {showContent && (
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1, gap: 1 }}>
              <FormControl size="small">
                <Select
                  name="share_type"
                  value={formik.values.share_type}
                  onChange={(e) => {
                    formik.handleChange(e);
                    if (e.target.value !== "group") {
                      formik.setFieldValue("group_ids", []);
                    }
                  }}
                >
                  <MenuItem value="public">{t("public")}</MenuItem>
                  <MenuItem value="friends">{t("friends")}</MenuItem>
                  <MenuItem value="group">{t("group")}</MenuItem>
                  <MenuItem value="personal">{t("personal")}</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="contained"
                onClick={handleShare}
                disabled={uploading || !canPublish}
              >
                {uploading ? t("publishing") : t("publish")}
              </Button>
            </Box>
          )}
        </Box>
        <Typography mt={2}>
          Share with link
        </Typography>

        {/* Copy link */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField value={copyLink} InputProps={{ readOnly: true }} fullWidth />
          <IconButton onClick={handleCopy}>
            <ContentCopyIcon />
          </IconButton>
        </Box>

        {linkCopied && (
          <Typography variant="body2" color="success.main">
            {t("link_copied")}
          </Typography>
        )}
      </Box>
    </Modal>
  );
}

export default ShareComponent;
