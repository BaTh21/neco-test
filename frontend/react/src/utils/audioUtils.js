// Utility to convert existing WEBM URLs to MP3
export const convertWebmToMp3Url = (webmUrl) => {
  if (webmUrl.includes('cloudinary.com') && webmUrl.includes('.webm')) {
    // Add multiple transformations to ensure MP3 conversion
    return webmUrl
      .replace('/upload/', '/upload/f_mp3,fl_attachment/') // Convert to MP3 and force download as attachment
      .replace('.webm', '.mp3'); // Change file extension
  }
  return webmUrl;
};

// Additional utility to check if URL is MP3
export const isMp3Url = (url) => {
  return url.includes('.mp3') || url.includes('f_mp3');
};

// Utility to process all messages and convert WEBM to MP3
export const processMessagesForMp3 = (messages) => {
  return messages.map(message => {
    if (message.message_type === 'voice' && message.content.includes('.webm')) {
      return {
        ...message,
        content: convertWebmToMp3Url(message.content)
      };
    }
    return message;
  });
};

// Utility to ensure voice message URL is MP3
export const ensureMp3VoiceUrl = (message) => {
  if (message.message_type === 'voice' && message.content.includes('.webm')) {
    return convertWebmToMp3Url(message.content);
  }
  return message.content;
};

// Cloudinary upload helper for voice messages
export const getCloudinaryVoiceUploadParams = () => {
  return {
    format: 'mp3',
    resource_type: 'video',
    quality: '80',
    audio_codec: 'mp3'
  };
};