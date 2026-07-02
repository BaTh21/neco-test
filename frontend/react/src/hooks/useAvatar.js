import { useMemo } from 'react';

export const useAvatar = () => {
  const getAvatarUrl = useMemo(() => {
    return (url) => {
      // If no URL or invalid, return null to show initials
      if (!url || typeof url !== 'string' || url === 'undefined' || url === 'null' || url.trim() === '') {
        return null;
      }

      let cleanUrl = url.trim();
      
      // For Cloudinary URLs, we can add optimization parameters
      if (cleanUrl.includes('res.cloudinary.com')) {
        // Add optimization parameters to Cloudinary URL
        if (cleanUrl.includes('/upload/')) {
          // Insert optimization transformations - removed f_auto to prevent duplicate extensions
          return cleanUrl.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto/');
        }
        return cleanUrl;
      }

      // If it's already a full URL, use it directly
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        return cleanUrl;
      }

      console.warn('Invalid avatar URL format:', url);
      return null;
    };
  }, []);

  const getUserInitials = useMemo(() => {
    return (username) => {
      if (typeof username !== 'string' || !username.trim()) return 'U';
      
      const nameParts = username.trim().split(' ').filter(part => part.length > 0);
      if (nameParts.length === 1) {
        return nameParts[0].charAt(0).toUpperCase();
      } else {
        return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
      }
    };
  }, []);

  const getUserAvatar = useMemo(() => {
    return (user) => {
      if (!user) {
        return null;
      }
      
      // Try different possible avatar fields
      const avatarUrl = user.avatar_url || user.avatar || user.profile_picture || user.image;

      return getAvatarUrl(avatarUrl);
    };
  }, [getAvatarUrl]);

  // Helper to create a placeholder avatar
  const getPlaceholderAvatar = useMemo(() => {
    return (username, size = 100) => {
      const name = username || 'User';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff&size=${size}`;
    };
  }, []);

  return {
    getAvatarUrl,
    getUserInitials,
    getUserAvatar,
    getPlaceholderAvatar
  };
};