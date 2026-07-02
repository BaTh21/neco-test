// hooks/useImage.js
import { useState } from 'react';

export const useImage = () => {
  const [failedImages, setFailedImages] = useState(new Set());

  const getImageUrl = (url) => {
    if (!url) return null;
    if (failedImages.has(url)) return null

    // If it's already a full URL (including Cloudinary URLs), return as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // For Cloudinary public_ids or partial URLs
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    
    if (cloudName) {
      // Handle different Cloudinary URL formats
      if (url.startsWith('image/upload')) {
        // Partial Cloudinary URL like "image/upload/v1234567/folder/image.jpg"
        return `https://res.cloudinary.com/${cloudName}/${url}`;
      } else {
        // Cloudinary public_id - assume it's in the upload folder
        const folder = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER || 'whisper_space/avatars';
        const fullPath = folder ? `${folder}/${url}` : url;
        return `https://res.cloudinary.com/${cloudName}/image/upload/${fullPath}`;
      }
    }
    
    // For local development or other image sources
    const baseUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    try {
      const fullUrl = new URL(cleanUrl, baseUrl).toString();
      return fullUrl;
    } catch (error) {
      console.warn('❌ Invalid image URL:', url, error);
      return null;
    }
  };

  const handleImageError = (url, event) => {
    console.log('❌ Image failed to load:', url, event);
    setFailedImages(prev => new Set([...prev, url]));
  };

  // Optimize Cloudinary URLs with transformations
  const getOptimizedImageUrl = (url, options = {}) => {
    if (!url) return null;
    
    const {
      width = 100,
      height = 100,
      quality = 'auto',
      crop = 'fill',
      format = 'auto',
      gravity = 'face'
    } = options;

    const baseUrl = getImageUrl(url);
    if (!baseUrl) return null;

    console.log('🎨 Optimizing image URL:', baseUrl); // Debug log

    // If it's a Cloudinary URL, add optimization parameters
    if (baseUrl.includes('cloudinary.com') && baseUrl.includes('/upload/')) {
      // Add transformations before the filename
      const transformParams = `w_${width},h_${height},c_${crop},q_${quality},f_${format},g_${gravity}`;
      return baseUrl.replace('/upload/', `/upload/${transformParams}/`);
    }
    
    // For non-Cloudinary URLs, return original
    return baseUrl;
  };

  return { 
    getImageUrl, 
    getOptimizedImageUrl,
    handleImageError, 
    failedImages 
  };
};