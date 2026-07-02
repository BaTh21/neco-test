import { useEffect, useState } from "react";
import { Typography, Box, IconButton, Modal, Avatar } from "@mui/material";
import LocalPhoneIcon from '@mui/icons-material/LocalPhone';
import CloseIcon from '@mui/icons-material/Close';

export const IncomingCallDialog = ({
  open,
  username,
  avatar,
  onAccept,
  onReject
}) => {
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    if (!open) return;

    setSeconds(30);

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReject();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onReject]);

  return (
    <Modal
      open={open}
      sx={{
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'white'
      }}
    >
      <Box
        sx={{
          height: '100vh',
          width: { xs: 300, md: 350 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 18,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <Avatar
            sx={{
              width: 50,
              height: 50
            }}
            src={avatar}
            alt={username}
          >
            {username?.charAt(0) || "U"}
          </Avatar>
          <Typography sx={{ fontSize: 26, color: 'white' }}>
            {username} is calling you
          </Typography>

          <Typography sx={{ color: 'white', fontSize: 18, mt: 1 }}>
            Call will end in {seconds}s
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <IconButton
            onClick={onAccept}
            sx={{
              fontSize: "1.2rem",
              padding: 1.5,
              borderRadius: 6,
              pointerEvents: "auto",
              backgroundColor: '#118644ff',
              color: 'white',
              '&:hover': {
                backgroundColor: '#195f37ff',
              }
            }}
          >
            <LocalPhoneIcon />
          </IconButton>

          <IconButton
            onClick={onReject}
            sx={{
              fontSize: "1.2rem",
              padding: 1.5,
              borderRadius: 6,
              pointerEvents: "auto",
              backgroundColor: 'secondary.main',
              color: 'white',
              '&:hover': {
                backgroundColor: '#68102fff',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
    </Modal>
  );
};

