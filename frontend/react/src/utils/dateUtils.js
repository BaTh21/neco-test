export const formatCambodiaTime = (dateString) => {
  if (!dateString) return "Just now";

  try {
    let date = new Date(dateString);

    if (isNaN(date.getTime())) {
      date = new Date(dateString + "Z");
    }

    const now = new Date();
    const diffMs = now - date;

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }

    if (hours < 24) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    if (days < 30) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    if (months < 12) {
      return `${months} month${months > 1 ? "s" : ""} ago`;
    }

    return `${years} year${years > 1 ? "s" : ""} ago`;
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Unknown";
  }
};

export const formatCambodiaDate = (dateString) => {
  if (!dateString) return 'Unknown date';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      timeZone: 'Asia/Phnom_Penh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return new Date(dateString).toLocaleDateString('en-GB');
  }
};