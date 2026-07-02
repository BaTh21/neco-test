// Helper function to get video thumbnail - FIXED VERSION
export const getVideoThumbnail = (videoUrl, diary) => {
  if (!videoUrl || !diary || !diary.video_thumbnails) return null;

  const videoIndex = diary.videos?.indexOf(videoUrl);

  if (videoIndex !== -1 && videoIndex < diary.video_thumbnails.length) {
    const thumbnail = diary.video_thumbnails[videoIndex];

    // Check if thumbnail exists and is a valid string
    if (thumbnail && typeof thumbnail === 'string' && thumbnail.trim() !== '') {
      // Debug log
      return thumbnail;
    }
  }

  return null;
};