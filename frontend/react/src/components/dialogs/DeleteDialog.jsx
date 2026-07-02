import Box from '@mui/material/Box';
import Modal from '@mui/material/Modal';
import Button from '@mui/material/Button';

export default function DeleteDialog({ open, onClose, onSuccess, title, tag = "Delete", description, onConfirm }) {

    const handleConfirm = async () => {
        if (!onConfirm) return;

        try {
            await onConfirm();
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    };
    return (
        <div>
            <Modal
                open={open}
                onClose={onClose}
                aria-labelledby="parent-modal-title"
                aria-describedby="parent-modal-description"
            >
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
                    <h2 id="parent-modal-title">{title}</h2>
                    <p id="parent-modal-description">
                        {description}
                    </p>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                        <Button variant="outlined" onClick={onClose}>Cancel</Button>
                        <Button variant="contained" color="error" onClick={handleConfirm} disabled={!onConfirm}>{tag}</Button>
                    </Box>
                </Box>
            </Modal>
        </div >
    );
}