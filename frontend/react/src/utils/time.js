// Cambodia = UTC+7 (ICT), no DST ever.

// Convert any date string into Cambodia time (HH:MM)
export const formatCambodiaTime = (dateString) => {
  if (!dateString) return "Just now";

  const date = new Date(dateString);
  if (isNaN(date)) return "Just now";

  // Convert UTC → Cambodia (UTC+7)
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  let khHours = utcHours + 7;

  if (khHours >= 24) khHours -= 24;

  return `${khHours.toString().padStart(2, "0")}:${utcMinutes.toString().padStart(2, "0")}`;
};

// More detailed Cambodia time object
export const getExactCambodiaTime = (dateString) => {
  if (!dateString) return { hours: 0, minutes: 0, timeString: "" };

  const date = new Date(dateString);
  if (isNaN(date)) return { hours: 0, minutes: 0, timeString: "" };

  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  let khHours = utcHours + 7;
  if (khHours >= 24) khHours -= 24;

  const timeString = `${khHours.toString().padStart(2, "0")}:${utcMinutes
    .toString()
    .padStart(2, "0")}`;

  return {
    hours: khHours,
    minutes: utcMinutes,
    timeString,
    isPM: khHours >= 12,
    formatted12hr: `${khHours % 12 || 12}:${utcMinutes
      .toString()
      .padStart(2, "0")} ${khHours >= 12 ? "PM" : "AM"}`
  };
};

// For comments
export const formatCommentTime = (dateString) => {
  const t = getExactCambodiaTime(dateString);
  return t.timeString || "Just now";
};
