import { useState, useEffect } from "react";
import { Box, Modal, Typography, TextField, Button, Stack } from "@mui/material";
import { updateCommentById } from "../../services/api";

function CommentUpdateDialog({ open, onClose, onSuccess, comment }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (comment) {
      setContent(comment.content);
    }
  }, [comment]);

  const handleUpdate = async () => {
    setLoading(true);
    setError("");
    try {
      await updateCommentById(comment.id, { content });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        <Typography variant="h6" mb={2}>
          Edit Comment
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Content"
            fullWidth
            multiline
            minRows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          {error && <Typography color="error">{error}</Typography>}
          <Button
            variant="contained"
            onClick={handleUpdate}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}

export default CommentUpdateDialog;
