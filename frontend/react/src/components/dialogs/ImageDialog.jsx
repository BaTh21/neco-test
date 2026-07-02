import { Box, Modal, IconButton, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";

function PreviewDialog({
    open,
    onClose,
    url,
    type = "image", // image | video | file
    fileName,
}) {
    const renderContent = () => {
        switch (type) {
            case "video":
                return (
                    <Box
                        component="video"
                        src={url}
                        controls
                        autoPlay
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            borderRadius: 1,
                        }}
                    />
                );

            case "file":
                return (
                    <Box
                        sx={{
                            width: "100%",
                            height: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexDirection: "column",
                            bgcolor: "background.paper",
                            borderRadius: 1,
                        }}
                    >
                        <Button
                            variant="contained"
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open {fileName || "File"}
                        </Button>

                        <Button
                            sx={{ mt: 2 }}
                            variant="outlined"
                            component="a"
                            href={url}
                            download={fileName}
                        >
                            Download
                        </Button>
                    </Box>
                );

            case "image":
            default:
                return (
                    <Box
                        component="img"
                        src={url}
                        alt=""
                        sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                            borderRadius: 1,
                        }}
                    />
                );
        }
    };

    const handleDownloadMedia = async () => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = blobUrl;

            let downloadName =
                fileName ||
                url.split("/").pop()?.split("?")[0] ||
                `file-${Date.now()}`;

            a.download = downloadName;

            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error("Download failed:", err);
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
                    width: "90vw",
                    height: "90vh",
                    outline: "none",
                }}
            >
                <IconButton
                    onClick={handleDownloadMedia}
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 56,
                        color: "white",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        "&:hover": {
                            backgroundColor: "rgba(0,0,0,0.7)",
                        },
                        zIndex: 10,
                    }}
                >
                    <DownloadIcon />
                </IconButton>
                <IconButton
                    onClick={onClose}
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: "white",
                        backgroundColor: "rgba(0,0,0,0.5)",
                        "&:hover": {
                            backgroundColor: "rgba(0,0,0,0.7)",
                        },
                        zIndex: 10,
                    }}
                >
                    <CloseIcon />
                </IconButton>

                {renderContent()}
            </Box>
        </Modal>
    );
}

export default PreviewDialog;