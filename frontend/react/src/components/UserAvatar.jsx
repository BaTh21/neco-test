import { Avatar } from '@mui/material';
import { useState } from 'react';
import { useAvatar } from '../hooks/useAvatar';

const UserAvatar = ({ user, size = 32, ...props }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const { getAvatarUrl, getUserInitials } = useAvatar();
  
  const avatarUrl = getAvatarUrl(user?.avatar_url || user?.avatar);
  const initials = getUserInitials(user?.username);

  // Reset imageFailed state when avatarUrl changes
  useState(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const handleImageError = () => {
    console.log('Avatar image failed to load:', avatarUrl);
    setImageFailed(true);
  };

  return (
    <Avatar
      src={imageFailed ? null : avatarUrl}
      onError={handleImageError}
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        bgcolor: avatarUrl && !imageFailed ? 'transparent' : 'primary.main',
        fontWeight: 'bold',
        ...props.sx
      }}
      {...props}
    >
      {initials}
    </Avatar>
  );
};

export default UserAvatar;