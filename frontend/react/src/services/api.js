import axios from "axios";

const BASE_URL =
  import.meta.env.VITE_API_URL || "https://whisper-space-bot.onrender.com";
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  // Try all possible token locations
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("access_token") ||
    sessionStorage.getItem("accessToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// FIXED Response interceptor - with proper error handling
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401 errors and not retry requests
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken =
          localStorage.getItem("refresh_token") ||
          localStorage.getItem("refreshToken");

        if (!refreshToken) {
          throw new Error("No refresh token available");
        }

        // Use a new axios instance to avoid infinite loops
        const refreshResponse = await axios.post(
          `${BASE_URL}/api/v1/auth/refresh`,
          {
            refresh_token: refreshToken,
          }
        );

        const { access_token, refresh_token } = refreshResponse.data;

        // Store tokens consistently
        localStorage.setItem("access_token", access_token);
        localStorage.setItem("accessToken", access_token); // For compatibility

        if (refresh_token) {
          localStorage.setItem("refresh_token", refresh_token);
          localStorage.setItem("refreshToken", refresh_token); // For compatibility
        }

        // Update the original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);

        // Clear all tokens
        localStorage.removeItem("access_token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("refreshToken");
        sessionStorage.removeItem("access_token");
        sessionStorage.removeItem("accessToken");

        // Redirect to login if not already there
        if (!window.location.pathname.includes("/login")) {
          window.location.href = "/login";
        }

        return Promise.reject(
          new Error("Session expired. Please login again.")
        );
      }
    }

    return Promise.reject(error);
  }
);

export const login = async (data) => {
  try {
    const formData = new URLSearchParams();
    formData.append("username", data.email);
    formData.append("password", data.password);

    const response = await axios.post(
      `${BASE_URL}/api/v1/auth/login`,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    // 🔐 2FA REQUIRED
    if (response.data.requires_2fa) {
      const { temp_token, method } = response.data;

      // ✅ STORE ONCE, CORRECT KEY
      localStorage.setItem("temp_token", temp_token);
      localStorage.setItem("2fa_method", method);

      return {
        requires_2fa: true,
        temp_token,
        method,
      };
    }

    // ✅ NORMAL LOGIN
    const { access_token, refresh_token, token_type } = response.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);

    return {
      access_token,
      refresh_token,
      token_type,
    };
  } catch (error) {
    let errorMessage = "Login failed";

    if (error.response?.status === 401) {
      errorMessage = "Invalid email or password";
    } else if (error.response?.status === 403) {
      errorMessage = "Please verify your email first";
    } else if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    }

    throw new Error(errorMessage);
  }
};

// Auth endpoints
export const register = async (data) => {
  try {
    const response = await api.post(`/api/v1/auth/register`, data);
    return response.data;
  } catch (error) {
    const errorMessage = error.response?.data?.detail || "Registration failed";

    throw new Error(errorMessage);
  }
};

export const verifyCode = async (data) => {
  try {
    const response = await api.post(`/api/v1/auth/verify-code`, data);
    return response.data;
  } catch (error) {
    console.error("Verify code error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Verification failed"
    );
  }
};

// User endpoints
export const getMe = async () => {
  try {
    const response = await api.get(`/api/v1/users/me`);

    return response.data;
  } catch (error) {
    console.error('Get me error:', error?.response?.data || error.message);
    throw new Error(error?.response?.data?.message || 'Failed to fetch profile');
  }
};

export const updateMe = async (data) => {
  try {
    const response = await api.put(`/api/v1/users/me`, data);
    return response.data;
  } catch (error) {
    console.error("Update me error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to update profile"
    );
  }
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);

  const response = await api.post("/api/v1/avatars/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const searchUsers = async (query) => {
  if (!query || typeof query !== "string") {
    return [];
  }

  const trimmedQuery = query.trim();

  if (trimmedQuery.length < 2) {
    return [];
  }

  try {
    const response = await api.get("/api/v1/users/search", {
      params: {
        q: trimmedQuery,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Search users error:", {
      status: error.response?.status,
      data: error.response?.data,
      query: trimmedQuery,
    });

    if (error.response?.status === 404) {
      console.warn("Search endpoint not found, returning empty results");
      return [];
    }

    if (error.response?.status === 422 || error.response?.status === 400) {
      console.warn("Search validation failed, returning empty results");
      return [];
    }

    if (error.response?.status === 500) {
      console.warn("Server error during search, returning empty results");
      return [];
    }

    return [];
  }
};

// Friend endpoints
export const sendFriendRequest = async (userId) => {
  if (!userId || typeof userId !== "number") {
    return {
      success: false,
      message: "Invalid user ID",
      code: "INVALID_ID",
    };
  }

  try {
    const response = await api.post(`/api/v1/friends/request/${userId}`);

    return {
      success: true,
      data: response.data,
      message: "Friend request sent successfully!",
      code: "SUCCESS",
    };
  } catch (error) {
    if (error.response?.status === 409) {
      return {
        success: false, // ✅ FIX
        message: error.response?.data?.detail || "Friend request already sent",
        code: "CONFLICT",
        status: 409,
      };
    }

    return {
      success: false,
      message:
        error.response?.data?.detail ||
        error.response?.data?.message ||
        "Failed to send friend request",
      code: "REQUEST_FAILED",
      status: error.response?.status,
    };
  }
};

export const getAllSatusFriends = async () => {
  const res = await api.get("/api/v1/friends/all-status");
  return res.data;
};

export const getActivityInbox = async (limit = 20, offset = 0) => {
  const res = await api.get(
    `/api/v1/activities/?limit=${limit}&offset=${offset}`
  );
  return res.data;
};

export const getUnreadMessage = async () => {
  const res = await api.get(
    `/api/v1/chats/unread-count`
  );
  return res.data;
};

export const deleteActivities = async (data) => {
  try {
    const res = await api.delete(`/api/v1/activities/`, { data });
    return res.data;
  } catch (error) {
    console.error("Delete activities error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to delete activities"
    );
  }
};

export const readActivity = async (activityId) => {
  try {
    const res = await api.patch(`/api/v1/activities/${activityId}/read`);
    return res.data;
  } catch (error) {
    console.error("Read activities error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to read activities"
    );
  }
};

export const getSuggestFriends = async () => {
  const res = await api.get("/api/v1/users/suggestions");
  return res.data;
};

export const checkFriendStatus = async (userId) => {
  try {
    const response = await api.get(`/api/v1/friends/status/${userId}`);
    return {
      exists: true,
      status: response.data.status,
      data: response.data,
    };
  } catch (error) {
    return {
      exists: false,
      status: "none",
      error: error.response?.data,
    };
  }
};

export const smartFriendRequest = async (userId) => {
  const statusCheck = await checkFriendStatus(userId);

  if (statusCheck.exists) {
    switch (statusCheck.status) {
      case "pending":
        return {
          success: false,
          message: "Friend request already pending!",
          code: "ALREADY_PENDING",
          data: statusCheck.data,
        };

      case "accepted":
        return {
          success: false,
          message: "You are already friends!",
          code: "ALREADY_FRIENDS",
          data: statusCheck.data,
        };

      case "none":
        break;

      default:
        break;
    }
  }

  return await sendFriendRequest(userId);
};

export const getFriends = async () => {
  try {
    const response = await api.get("/api/v1/friends/");
    return response.data;
  } catch (error) {
    console.error("Get friends error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 404 || error.response?.status === 500) {
      console.warn("Friends endpoint not available, returning empty array");
      return [];
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.response?.data?.msg ||
      "Failed to fetch friends"
    );
  }
};

export const getPendingRequests = async () => {
  try {
    const response = await api.get(`/api/v1/friends/requests`);
    return response.data;
  } catch (error) {
    console.error("Get pending requests error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to fetch pending requests"
    );
  }
};

export const getPendingFriends = async () => {
  const res = await api.get("/api/v1/friends/pending");
  return res.data;
};

export const acceptFriendRequest = async (requesterId) => {
  const response = await api.post(`/api/v1/friends/accept/${requesterId}`, {});
  return response.data;
};

export const deletePendingRequest = async (pendingId) => {
  try {
    await api.delete(`/api/v1/friends/pending/${pendingId}`);
    return true;
  } catch (error) {
    return error.response?.data?.detail;
  }
};

export const createDiary = async (data) => {
  try {
    const diaryData = {
      title: data.title || null,
      content: data.content || null,
      share_type: data.share_type,
      group_ids: data.group_ids || [],
      parent_id: data.parent_id || null,
      images: [],
      videos: [],
    };

    if (!data.parent_id) {
      if (data.images?.length > 0) {
        diaryData.images = await Promise.all(
          data.images.map(async (image) => {
            if (image instanceof File) {
              validateMediaFile(image, "image", 10, 10);
              return await fileToBase64(image);
            }
            return image;
          })
        );
      }

      if (data.videos?.length > 0) {
        diaryData.videos = await Promise.all(
          data.videos.map(async (video) => {
            if (video instanceof File) {
              validateMediaFile(video, "video", 50, 3);
              return await fileToBase64(video);
            }
            return video;
          })
        );
      }
    }

    const response = await api.post("/api/v1/diaries/", diaryData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to create diary");
  }
};

export const createDiaryForGroup = async (groupId, data) => {
  try {
    const res = await api.post(`/api/v1/diaries/groups/${groupId}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error?.response?.data?.detail || "Failed to created diary");
  }
};

export const getDiaryById = async (diaryId) => {
  try {
    const response = await api.get(`/api/v1/diaries/${diaryId}`);
    return response.data;
  } catch (error) {
    console.error("Get diary by ID error:", error.response?.data);

    // If 404, return null instead of throwing
    if (error.response?.status === 404) {
      console.log(`Diary ${diaryId} not found or not accessible`);
      return null;
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to fetch diary"
    );
  }
};

const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const validateMediaFile = (file, type, maxSizeMB, maxCount) => {
  if (type === "image") {
    if (!file.type.startsWith("image/")) {
      throw new Error(`File ${file.name} is not an image`);
    }
  } else if (type === "video") {
    if (!file.type.startsWith("video/")) {
      // Check file extension as fallback
      const validVideoExtensions = [".mp4", ".mov", ".avi", ".webm", ".mkv"];
      const fileExtension = "." + file.name.split(".").pop().toLowerCase();
      if (!validVideoExtensions.includes(fileExtension)) {
        throw new Error(
          `File ${file.name
          } is not a supported video format. Supported: ${validVideoExtensions.join(
            ", "
          )}`
        );
      }
    }
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    throw new Error(`File ${file.name} exceeds maximum size of ${maxSizeMB}MB`);
  }

  return true;
};

export const updateDiaryById = async (diaryId, data) => {
  try {
    // Prepare update data
    const updateData = {};

    // Add text fields if provided
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.share_type !== undefined) updateData.share_type = data.share_type;
    if (data.group_ids !== undefined) updateData.group_ids = data.group_ids;

    // Handle images
    if (data.images !== undefined) {
      if (Array.isArray(data.images)) {
        // Filter out any null/undefined values
        const validImages = data.images.filter((img) => img != null);

        if (validImages.length === 0) {
          updateData.images = [];
        } else {
          // Process images - could be base64 strings or File objects
          const processedImages = await Promise.all(
            validImages.map(async (img) => {
              if (img instanceof File) {
                validateMediaFile(img, "image", 10, 10);
                return await fileToBase64(img);
              } else if (typeof img === "string") {
                // If it's already a URL, keep it as is
                if (img.startsWith("http")) {
                  return img;
                }
                // If it's base64, ensure it has proper prefix
                else if (img.startsWith("data:image/")) {
                  return img;
                }
                // If it's plain base64, add data URL prefix
                else {
                  try {
                    // Try to decode to validate it's base64
                    atob(img);
                    return `data:image/jpeg;base64,${img}`;
                  } catch {
                    throw new Error(
                      `Invalid image format: ${img.substring(0, 50)}...`
                    );
                  }
                }
              }
              throw new Error(`Invalid image type: ${typeof img}`);
            })
          );

          updateData.images = processedImages;
        }
      }
    }

    // Handle videos
    if (data.videos !== undefined) {
      if (Array.isArray(data.videos)) {
        const validVideos = data.videos.filter((vid) => vid != null);

        if (validVideos.length === 0) {
          updateData.videos = [];
        } else {
          const processedVideos = await Promise.all(
            validVideos.map(async (vid) => {
              if (vid instanceof File) {
                validateMediaFile(vid, "video", 50, 3);
                return await fileToBase64(vid);
              } else if (typeof vid === "string") {
                if (vid.startsWith("http")) {
                  return vid;
                } else if (vid.startsWith("data:video/")) {
                  return vid;
                } else {
                  try {
                    atob(vid);
                    return `data:video/mp4;base64,${vid}`;
                  } catch {
                    throw new Error(
                      `Invalid video format: ${vid.substring(0, 50)}...`
                    );
                  }
                }
              }
              throw new Error(`Invalid video type: ${typeof vid}`);
            })
          );

          updateData.videos = processedVideos;
        }
      }
    }

    const response = await api.patch(`/api/v1/diaries/${diaryId}`, updateData, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    return response.data;
  } catch (error) {
    // Extract detailed error message
    let errorMessage = "Failed to update diary";
    const errorData = error.response?.data;

    if (errorData) {
      if (typeof errorData === "string") {
        errorMessage = errorData;
      } else if (errorData.detail) {
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          // Handle Pydantic validation errors
          errorMessage = errorData.detail
            .map((err) => `${err.loc?.join(".") || "unknown"}: ${err.msg}`)
            .join(", ");
        } else if (typeof errorData.detail === "object") {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      } else if (errorData.msg) {
        errorMessage = errorData.msg;
      }
    }

    throw new Error(errorMessage);
  }
};

export const deleteDiaryById = async (diaryId) => {
  try {
    await api.delete(`/api/v1/diaries/${diaryId}`);
    return true;
  } catch (error) {
    throw new Error(error?.response?.data?.detail || "Failed to delete diary");
  }
};

export const shareDiaryById = async (diaryId, data) => {
  try {
    const res = await api.post(`/api/v1/diaries/${diaryId}/share`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error) {
    const message =
      error.response?.data?.detail || error.message || "Failed to share diary";
    throw new Error(message);
  }
};

export const deleteShareById = async (shareId) => {
  try {
    await api.delete(`/api/v1/diaries/share/${shareId}`);
    return true;
  } catch (error) {
    const errorMessage =
      error.response?.data?.detail || "Failed to remove share";
    throw new Error(errorMessage);
  }
};

export const getFeed = async (limit = 25, offset = 0) => {
  try {
    const response = await api.get(`/api/v1/diaries/feed`, {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    console.error("Get feed error:", error.response?.data);
    throw new Error(error.response?.data?.detail || error.response?.data?.msg);
  }
};

export const getMyFeed = async (limit = 25, offset = 0) => {
  try {
    const response = await api.get(`/api/v1/diaries/my-feed`, {
      params: { limit, offset },
    });
    return response.data;
  } catch (error) {
    console.error("Get feed error:", error.response?.data);
    throw new Error(error.response?.data?.detail || error.response?.data?.msg);
  }
};

export const getMyDiaryStats = async () => {
  const res = await api.get(`/api/v1/diaries/my-feed/count`);
  return res.data;
};

export const getFavoriteDiary = async () => {
  const res = await api.get(`/api/v1/diaries/favorites`);
  return res.data;
};

export const getFavoriteDiaryList = async () => {
  const res = await api.get(`/api/v1/diaries/favorite-list`);
  return res.data;
};

export const handleSaveDiary = async (diaryId) => {
  try {
    const res = await api.post(`/api/v1/diaries/${diaryId}/favorites`);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail);
  }
};

export const handleRemoveDiary = async (diaryId) => {
  try {
    await api.delete(`/api/v1/diaries/${diaryId}/favorites`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.detail);
  }
};

export const likeDiary = async (diaryId) => {
  try {
    const response = await api.post(`/api/v1/diaries/${diaryId}/like`);
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("Like endpoint not found, simulating success");
      return {
        success: true,
        message: "Like recorded locally (endpoint not implemented)",
      };
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to like diary"
    );
  }
};

export const toggleCommentLike = async (commentId) => {
  const res = await api.post(`/api/v1/diaries/comments/${commentId}/like`);
  return res.data;
};

export const getCommentLike = async (commentId) => {
  const res = await api.get(`/api/v1/diaries/comments/${commentId}/like`);
  return res.data;
};

export const commentOnDiary = async (
  diaryId,
  content,
  parentId = null,
  images = null
) => {
  try {
    const payload = {
      content,
    };

    if (parentId !== null) {
      payload.parent_id = parentId;
    }

    if (images !== null && images.length > 0) {
      payload.images = images;
    }

    const response = await api.post(
      `/api/v1/diaries/${diaryId}/comment`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Comment on diary error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to add comment"
    );
  }
};

export const updateComment = async (commentId, content, images = null) => {
  try {
    const payload = {
      content,
    };

    if (images !== null && images.length > 0) {
      payload.images = images;
    }

    const response = await api.put(
      `/api/v1/diaries/comments/${commentId}`,
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Update comment error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to update comment"
    );
  }
};
export const getDiaryDetails = async (diaryId) => {
  try {
    const response = await api.get(`/api/v1/diaries/${diaryId}`);
    return response.data;
  } catch (error) {
    console.error("Get diary details error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to get diary details"
    );
  }
};

export const getDiaryForEdit = async (diaryId) => {
  try {
    const response = await api.get(`/api/v1/diaries/${diaryId}/edit`);
    return response.data;
  } catch (error) {
    console.error("Get diary for edit error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to fetch diary for editing"
    );
  }
};

export const getDiaryComments = async (diaryId, limit = 10, offset = 0) => {
  const response = await api.get(`/api/v1/diaries/${diaryId}/comments`, {
    params: { limit, offset },
  });
  return response.data;
};

export const getCommentReplies = async (commentId, limit = 2, offset = 0) => {
  try {
    const response = await api.get(
      `/api/v1/diaries/comments/${commentId}/replies`,
      {
        params: { limit, offset },
      }
    );

    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data?.replies || [];
  } catch (error) {
    console.error("Failed to fetch replies:", error);
    return [];
  }
};

export const updateCommentById = async (commentId, data) => {
  try {
    const res = await api.put(`/api/v1/diaries/comments/${commentId}`, data, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(
      error?.data?.response?.detail || "Failed to update to comment"
    );
  }
};

export const deleteCommentById = async (commentId) => {
  try {
    await api.delete(`/api/v1/diaries/comments/${commentId}`);
    return true;
  } catch (error) {
    throw new Error(
      error?.data?.response?.detail || "Failed to delete comment"
    );
  }
};

export const getDiaryLikes = async (diaryId) => {
  try {
    const response = await api.get(`/api/v1/diaries/${diaryId}/likes`);
    return response.data;
  } catch (error) {
    console.error("Get diary likes error:", error.response?.data);
    if (error.response?.status === 404) {
      return [];
    }
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to fetch likes"
    );
  }
};

// Group endpoints
export const createGroup = async (data) => {
  try {
    console.log("Creating group with data:", data);
    const response = await api.post(`/api/v1/groups/`, data);
    console.log("Group creation response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Create group error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to create group"
    );
  }
};

export const getUserGroups = async () => {
  try {
    const response = await api.get(`/api/v1/groups/my`);
    return response.data;
  } catch (error) {
    console.error(
      "Get user groups error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      error.message ||
      "Failed to fetch groups"
    );
  }
};

export const getGroupById = async (groupId) => {
  try {
    const response = await api.get(`/api/v1/groups/${groupId}`);
    return response.data;
  } catch (error) {
    console.error(
      "Get user groups error:",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      error.message ||
      "Failed to fetch groups"
    );
  }
};

export const updateGroupById = async (groupId, data) => {
  try {
    const response = await api.patch(`/api/v1/groups/${groupId}`, data);
    return response.data;
  } catch (error) {
    console.error(
      "Failed to update group",
      error.response?.data || error.message
    );
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      error.message ||
      "Failed to update groups"
    );
  }
};

export const deleteGroupById = async (groupId) => {
  try {
    await api.delete(`/api/v1/groups/${groupId}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to delete group");
  }
};

export const uploadCover = async (groupId, file) => {
  const formData = new FormData();
  formData.append("cover", file);

  const response = await api.post(`/api/v1/groups/${groupId}/cover`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

export const getGroupCover = async (groupId) => {
  try {
    const res = await api.get(`/api/v1/groups/${groupId}/cover`);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || "Failed to get group cover"
    );
  }
};

export const deleteCoverById = async (coverId) => {
  try {
    const res = await api.delete(`/api/v1/groups/cover/${coverId}`);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to delete cover");
  }
};

export const joinGroup = async (groupId) => {
  try {
    const response = await api.post(`/api/v1/groups/${groupId}/join`);
    return response.data;
  } catch (error) {
    console.error("Join group error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to join group"
    );
  }
};

export const getGroupMessageSeen = async (messageId) => {
  try {
    const res = await api.get(`/api/v1/messages/${messageId}/seen`);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || "Failed tp get seen messages"
    );
  }
};

// Group Invites - SINGLE FUNCTION (removed duplicates)
export const getPendingGroupInvites = async () => {
  try {
    const res = await api.get(`/api/v1/groups/invites/pending`);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || "Failed to fetch group invites"
    );
  }
};

export const acceptGroupInvite = async (inviteId) => {
  try {
    const res = await api.post(`/api/v1/groups/invites/${inviteId}/accept`);
    return res.data;
  } catch (err) {
    throw new Error(err.response?.data?.detail || "Failed to join");
  }
};

export const deleteInvite = async (inviteId) => {
  try {
    await api.delete(`/api/v1/groups/invites/${inviteId}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.detail);
  }
};

export const inviteToGroup = async (groupId, userId) => {
  try {
    const res = await api.post(`/api/v1/groups/${groupId}/invites/${userId}`);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail || "Failed to invite user to the group"
    );
  }
};

export const createGroupWithInvites = async (data, inviteeIds = []) => {
  try {
    const response = await api.post(`/api/v1/groups/`, {
      ...data,
      invitee_ids: inviteeIds,
    });
    return response.data;
  } catch (error) {
    console.error("Create group with invites error:", error.response?.data);

    if (error.response?.status === 422 || error.response?.status === 400) {
      console.log(
        "Invite feature not supported, creating group without invites"
      );
      const response = await api.post(`/api/v1/groups/`, data);
      return response.data;
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to create group"
    );
  }
};

export const getGroupInviteLink = async (groupId) => {
  try {
    const res = await api.get(`/api/v1/groups/${groupId}/invite-link`);
    return res.data.invite_link;
  } catch (err) {
    throw new Error(err.response?.data?.detail || "Failed to get link");
  }
};

// Chat endpoints
export const sendPrivateMessage = async (friendId, data) => {
  try {
    const response = await api.post(`/api/v1/chats/private/${friendId}`, data);

    if (response.data && !response.data.created_at) {
      response.data.created_at = new Date().toISOString();
    }

    return response.data;
  } catch (error) {
    console.error("Send private message error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to send message"
    );
  }
};

export const forwardMessage = async (friendId, messageData) => {
  try {
    console.log("📤 Forwarding message to:", friendId, "Data:", messageData);

    // Use the exact same payload without modification
    // Let the backend handle the validation
    const response = await api.post(
      `/api/v1/chats/private/${friendId}`,
      messageData
    );

    console.log("✅ Forward successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Forward message error:", {
      status: error.response?.status,
      data: error.response?.data,
      detail: error.response?.data?.detail,
    });

    throw error;
  }
};

export const getPrivateChat = async (friendId, limit = 30, offset = 0, excludeText = false) => {
  try {
    const response = await api.get(`/api/v1/chats/private/${friendId}`, { params: { limit, offset, exclude_text: excludeText } });
    return response.data;
  } catch (error) {
    console.warn("Failed to load private messages");
    return [];
  }
};

export const getGroupMessage = async (groupId, limit = 10, offset = 0, excludeText = false) => {
  try {
    const res = await api.get(
      `/api/v1/groups/${groupId}/message`,
      { params: { limit, offset, exclude_text: excludeText, } }
    );
    return res.data;
  } catch (error) {
    console.warn("Failed to load group messages");
    return [];
  }
};

export const updateMessageById = async (messageId, content) => {
  try {
    const res = await api.put(`/api/v1/messages/${messageId}`, content, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to update message");
  }
};

export const deleteMessageById = async (messageId) => {
  try {
    await api.delete(`/api/v1/messages/${messageId}`);
    return true;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to delete message");
  }
};

export const uploadFileMessage = async (groupId, file, tempId, parentMessageId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("temp_id", tempId);

  if (parentMessageId) {
    formData.append("parent_message_id", parentMessageId);
  }

  const response = await api.post(
    `/api/v1/messages/groups/${groupId}`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const uploadVoiceMessage = async (groupId, file, tempId, parentMessageId = null) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("temp_id", tempId);

  if (parentMessageId) {
    formData.append("parent_message_id", parentMessageId);
  }

  const response = await api.post(
    `/api/v1/messages/groups/${groupId}/voice`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );
  return response.data;
};

export const makeReaction = async (
  groupId,
  messageId,
  reaction
) => {
  const { data } = await api.post("/api/v1/messages/reaction", {
    group_id: groupId,
    message_id: messageId,
    reaction,
  });

  return data;
};

export const pinMessage = async (groupId, messageId) => {
  try {
    const res = await api.patch("/api/v1/messages/pin", {
      group_id: groupId,
      message_id: messageId
    });
    return res.data;
  } catch (error) {
    console.error("Get members error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to pin message"
    );
  }
}

export const unpinMessage = async (groupId, messageId) => {
  try {
    const res = await api.patch("/api/v1/messages/unpin", {
      group_id: groupId,
      message_id: messageId
    });
    return res.data;
  } catch (error) {
    console.error("Get members error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to unpin message"
    );
  }
}

export const getGroupMembers = async (groupId, search = "") => {
  try {
    const params = search ? { search } : {};
    const response = await api.get(`/api/v1/groups/${groupId}/members/`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get members error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to load members"
    );
  }
};

export const removeGroupMember = async (groupId, memberId) => {
  try {
    await api.delete(`/api/v1/groups/remove/${groupId}/members/${memberId}`);
  } catch (error) {
    console.error("Remove members error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to remove members"
    );
  }
};

export const leaveGroupById = async (groupId) => {
  try {
    await api.delete(`/api/v1/groups/leave/${groupId}`);
  } catch (error) {
    console.error("Leave error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to leave group"
    );
  }
};

export const getGroupDiaries = async (groupId, search = "") => {
  try {
    const params = search ? { search } : {};
    const response = await api.get(`/api/v1/groups/${groupId}/diaries/`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Get group diaries error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail || "Failed to load group feed"
    );
  }
};

export const editMessage = async (msgId, content) => {
  console.log("Editing message:", { msgId, content });

  const res = await api.patch(`/api/v1/chats/private/${msgId}`, {
    content: content.trim(),
  });

  return res.data;
};

// Group message operations
export const editGroupMessage = async (messageId, content) => {
  try {
    const response = await api.put(`/api/v1/chats/group/${messageId}`, {
      content,
    });
    return response.data;
  } catch (err) {
    throw new Error(
      err.response?.data?.detail || "Failed to edit group message"
    );
  }
};

export const editGroupFileMessage = async (messageId, file, tempId) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("temp_id", tempId);

  const res = await api.put(`/api/v1/messages/${messageId}/file`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteGroupMessage = async (messageId) => {
  try {
    await api.delete(`/api/v1/chats/group/${messageId}`);
    return true;
  } catch (err) {
    throw new Error(
      err.response?.data?.detail || "Failed to delete group message"
    );
  }
};

export const deleteMessage = async (msgId) => {
  try {
    await api.delete(`/api/v1/chats/private/${msgId}`);
  } catch (err) {
    const detail = err.response?.data?.detail || "Failed to delete message";
    throw new Error(detail);
  }
};

export const sendMessage = async (
  friendId,
  { content, message_type = "text", reply_to_id = null }
) => {
  const res = await api.post(`/api/v1/chats/private/${friendId}`, {
    content,
    message_type,
    reply_to_id,
  });
  return res.data;
};

export const unfriend = async (friendId) => {
  try {
    const response = await api.post(`/api/v1/friends/unfriend/${friendId}`);
    return response.data;
  } catch (error) {
    console.error("Unfriend error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 404) {
      throw new Error("Friendship not found");
    } else if (error.response?.status === 400) {
      throw new Error(
        error.response?.data?.detail || "Not friends with this user"
      );
    } else if (error.response?.status === 500) {
      throw new Error("Server error while unfriending");
    }

    throw new Error(error.response?.data?.detail || "Failed to unfriend");
  }
};

export const blockUser = async (userId) => {
  try {
    const response = await api.post(`/api/v1/friends/block/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Block user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 400) {
      throw new Error(error.response?.data?.detail || "Cannot block this user");
    } else if (error.response?.status === 500) {
      throw new Error("Server error while blocking user");
    }

    throw new Error(error.response?.data?.detail || "Failed to block user");
  }
};

// In api.js, add this function
export const checkBlockedStatus = async (userId) => {
  try {
    const response = await api.get(`/api/v1/friends/check-blocked/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Check blocked status error:", error.response?.data);
    // If endpoint doesn't exist yet, return default response
    if (error.response?.status === 404) {
      return {
        current_user_has_blocked: false,
        target_user_has_blocked: false,
        is_blocked: false,
      };
    }
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to check blocked status"
    );
  }
};

export const unblockUser = async (userId) => {
  try {
    const response = await api.post(`/api/v1/friends/unblock/${userId}`);
    return response.data;
  } catch (error) {
    console.error("Unblock user error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 404) {
      throw new Error("User is not blocked");
    } else if (error.response?.status === 400) {
      throw new Error(error.response?.data?.detail || "User is not blocked");
    } else if (error.response?.status === 500) {
      throw new Error("Server error while unblocking user");
    }

    throw new Error(error.response?.data?.detail || "Failed to unblock user");
  }
};

export const getBlockedUsers = async () => {
  try {
    const response = await api.get(`/api/v1/friends/blocked`);
    return response.data;
  } catch (error) {
    console.error("Get blocked users error:", error);
    throw new Error(
      error.response?.data?.detail || "Failed to fetch blocked users"
    );
  }
};

export const markMessagesAsRead = async (messageIds) => {
  try {
    console.log("📤 Marking messages as read:", messageIds);

    const response = await api.post("/api/v1/chats/messages/read", {
      message_ids: messageIds,
    });

    console.log("✅ Mark as read successful:", response.data);
    return response.data;
  } catch (error) {
    console.error("Mark messages as read error:", {
      status: error.response?.status,
      data: error.response?.data,
      messageIds: messageIds,
    });

    // If endpoint doesn't exist, return success anyway for UX
    if (error.response?.status === 404 || error.response?.status === 422) {
      console.log("Mark as read endpoint issue, returning success");
      return {
        success: true,
        message_ids: messageIds,
        marked_count: messageIds.length,
        timestamp: new Date().toISOString(),
      };
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to mark messages as read"
    );
  }
};

export const markMessagesAsReadAPI = async (messageIds) => {
  return markMessagesAsRead(messageIds);
};

export const getMessageSeenStatus = async (messageId) => {
  try {
    const response = await api.get(`/api/v1/chats/messages/${messageId}/seen`);
    return response.data;
  } catch (error) {
    console.error("Get message seen status error:", error.response?.data);

    // If endpoint doesn't exist, return empty array
    if (error.response?.status === 404) {
      console.log(
        "Get message seen status endpoint not found, returning empty array"
      );
      return [];
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to get message seen status"
    );
  }
};

export const respondToGroupInvite = async (inviteId, action) => {
  console.log(`Simulating ${action} for group invite:`, inviteId);
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    invite_id: inviteId,
    action: action,
  };
};

// Notes API
export const getNotes = async (archived = false) => {
  const response = await api.get(`/api/v1/notes?archived=${String(archived)}`);
  return response.data;
};

export const getNote = async (noteId) => {
  const response = await api.get(`/api/v1/notes/${noteId}`);
  return response.data;
};

export const createNote = async (noteData) => {
  const response = await api.post("/api/v1/notes", noteData);
  return response.data;
};

export const updateNote = async (noteId, noteData) => {
  const response = await api.put(`/api/v1/notes/${noteId}`, noteData);
  return response.data;
};

export const deleteNote = async (noteId) => {
  const response = await api.delete(`/api/v1/notes/${noteId}`);
  return response.data;
};

export const togglePinNote = async (noteId) => {
  const response = await api.post(`/api/v1/notes/${noteId}/pin`);
  return response.data;
};

export const toggleArchiveNote = async (noteId) => {
  const response = await api.post(`/api/v1/notes/${noteId}/archive`);
  return response.data;
};

// Sharing API
export const shareNote = async (noteId, shareData) => {
  const response = await api.post(`/api/v1/notes/${noteId}/share`, shareData);
  return response.data;
};

export const stopSharingNote = async (noteId) => {
  const response = await api.post(`/api/v1/notes/${noteId}/stop-sharing`);
  return response.data;
};

export const leaveSharedNote = async (noteId) => {
  const response = await api.post(`/api/v1/notes/${noteId}/leave`);
  return response.data;
};

export const getSharedNotes = async () => {
  try {
    const response = await api.get("/api/v1/notes/shared/with-me");
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.log("Shared notes endpoint not implemented yet");
      return [];
    }
    throw error;
  }
};

export const getPublicNote = async (shareToken) => {
  const response = await api.get(`/api/v1/notes/public/${shareToken}`);
  return response.data;
};

export const uploadImage = async (friendId, file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await api.post(
      `/api/v1/chats/private/${friendId}/image`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Upload image error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Upload failed"
    );
  }
};

export const sendMediaMessage = async (friendId, file, messageType = "image", replyToId = null, tempId = null) => {
  try {
    const formData = new FormData();

    formData.append("file", file);
    formData.append("message_type", messageType);

    if (replyToId) {
      formData.append("reply_to_id", replyToId);
    }

    if (tempId) {
      formData.append("temp_id", tempId);
    }

    const response = await api.post(
      `/api/v1/chats/private/${friendId}/upload`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Send media message error:", error.response?.data);

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to send media message"
    );
  }
};

export const replaceFileMessage = async (messageId, file) => {
  try {
    const formData = new FormData();

    formData.append("file", file);

    const response = await api.put(
      `/api/v1/chats/private/${messageId}/replace-file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Replace media message error:", error.response?.data);

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to media"
    );
  }

}

export const deleteImageMessage = async (messageId) => {
  try {
    const response = await api.delete(
      `/api/v1/chats/private/image/${messageId}`
    );
    return response.data;
  } catch (error) {
    console.error("Delete image message error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to delete image message"
    );
  }
};

export const togglePinPrivateMessage = async (messageId) => {
  try {
    const res = await api.post(`/api/v1/chats/private/${messageId}/pin`);
    return res.data;
  } catch (error) {
    console.error("pin message error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to pin message"
    );
  }
}

export const getPinPrivateMessage = async (friendId) => {
  try {
    const res = await api.get(`/api/v1/chats/private/${friendId}/pin`);
    return res.data;
  } catch (error) {
    console.error("Failed to get pin message error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to get pin message"
    );
  }
}

export const deleteAvatar = async () => {
  try {
    const response = await api.delete("/api/v1/avatars/delete");
    return response.data;
  } catch (error) {
    console.error("Delete avatar error:", {
      status: error.response?.status,
      data: error.response?.data,
      url: "/api/v1/avatars/delete",
    });

    // Provide more helpful error message
    if (error.response?.status === 404) {
      throw new Error(
        "Avatar delete endpoint not found. Please check the API endpoint."
      );
    }

    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.message ||
      "Failed to delete avatar"
    );
  }
};

export const getChatList = async () => {
  const res = await api.get("/api/v1/chats/");
  return res.data;
};

export const getMessageInfo = async (messageId) => {
  try {
    const response = await api.get(`/api/v1/chats/private/${messageId}/info`);
    return response.data;
  } catch (error) {
    console.error("Get message info error:", error.response?.data);
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to get message info"
    );
  }
};

export const sendVoiceMessage = async (friendId, formData) => {
  const response = await api.post(
    `/api/v1/chats/private/${friendId}/voice`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    }
  );
  return response.data;
};

export const getUserOnlineStatus = async (userId) => {
  const response = await api.get(`/api/v1/chat/users/${userId}/status`);
  return response.data;
};

// Get online status of all friends
export const getFriendsOnlineStatus = async () => {
  const response = await api.get(`/api/v1/chat/friends/online-status`);
  return response.data;
};

// Get batch online status for multiple users
export const getBatchOnlineStatus = async (userIds) => {
  const response = await api.post(`/api/v1/chat/users/online-status/batch`, {
    user_ids: userIds,
  });
  return response.data;
};

// Add reaction to message
export const toggleReaction = async (messageId, emoji) => {
  try {
    const response = await api.post(
      `/api/v1/chats/private/reaction`,
      {
        message_id: messageId,
        emoji: emoji
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error adding reaction:", error);
    throw error;
  }
};

// Get message reactions
export const getMessageReactions = async (messageId, params = {}) => {
  try {
    const response = await api.get(`/api/v1/messages/${messageId}/reactions`, {
      params,
    });
    return response.data;
  } catch (error) {
    console.error("Error getting reactions:", error);
    throw error;
  }
};

// Get reaction summary
export const getReactionSummary = async (messageId) => {
  try {
    const response = await api.get(
      `/api/v1/messages/${messageId}/reactions/summary`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting reaction summary:", error);
    throw error;
  }
};

// Batch get reactions
export const getBatchReactions = async (messageIds) => {
  try {
    const response = await api.post("/api/v1/messages/reactions/batch", {
      message_ids: messageIds,
    });
    return response.data;
  } catch (error) {
    console.error("Error getting batch reactions:", error);
    throw error;
  }
};

export const getPendingFriendRequests = async () => {
  const response = await api.get("/api/v1/friends/pending");
  return response.data;
};

export const declineFriendRequest = async (requesterId) => {
  const response = await api.delete(`/api/v1/friends/decline/${requesterId}`);
  return response.data;
};

export const checkTokenValidity = () => {
  try {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("accessToken");

    if (!token) return { valid: false, reason: "No token found" };

    const payload = JSON.parse(atob(token.split(".")[1]));
    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();

    const valid = expiryTime > currentTime;
    const expiresIn = expiryTime - currentTime;

    return {
      valid,
      expiresIn,
      expiryTime: new Date(expiryTime),
      willExpireSoon: expiresIn < 5 * 60 * 1000, // 5 minutes
    };
  } catch (error) {
    return { valid: false, reason: "Invalid token format" };
  }
};

export const refreshTokenIfNeeded = async () => {
  const tokenCheck = checkTokenValidity();

  // If token is valid and not expiring soon, no need to refresh
  if (tokenCheck.valid && !tokenCheck.willExpireSoon) {
    return { success: true, message: "Token is valid" };
  }

  console.log("🔄 Token needs refresh:", tokenCheck.reason || "Expiring soon");

  const refreshToken =
    localStorage.getItem("refresh_token") ||
    localStorage.getItem("refreshToken");

  if (!refreshToken) {
    console.error("❌ No refresh token available");
    return { success: false, error: "No refresh token" };
  }

  try {
    // Use a fresh axios instance to avoid interceptor loops
    const refreshApi = axios.create({
      baseURL: BASE_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const response = await refreshApi.post("/api/v1/auth/refresh", {
      refresh_token: refreshToken,
    });

    const { access_token, refresh_token } = response.data;

    // Store new tokens
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("accessToken", access_token);

    if (refresh_token) {
      localStorage.setItem("refresh_token", refresh_token);
      localStorage.setItem("refreshToken", refresh_token);
    }

    console.log("✅ Token refreshed successfully");
    return {
      success: true,
      access_token,
      refresh_token,
    };
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    return {
      success: false,
      error: error.response?.data?.detail || "Refresh failed",
    };
  }
};

export const ensureValidToken = async () => {
  const tokenCheck = checkTokenValidity();

  if (!tokenCheck.valid) {
    console.log("❌ Token invalid:", tokenCheck.reason);

    // Try to refresh token if we have a refresh token
    const refreshToken =
      localStorage.getItem("refresh_token") ||
      localStorage.getItem("refreshToken");

    if (refreshToken) {
      try {
        const response = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token } = response.data;

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("accessToken", access_token);

        if (refresh_token) {
          localStorage.setItem("refresh_token", refresh_token);
          localStorage.setItem("refreshToken", refresh_token);
        }

        console.log("✅ Token refreshed successfully");
        return true;
      } catch (error) {
        console.error("❌ Token refresh failed:", error);
        return false;
      }
    }

    return false;
  }

  return true;
};
export const forgotPassword = (data) =>
  api.post("/api/v1/auth/forgot-password", data);
export const resetPassword = (data) =>
  api.post("/api/v1/auth/reset-password", data);

export const resetPasswordWithOldPassword = async (data) => {
  try {
    const res = await api.post("/api/v1/auth/change-password", data);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to change password"
    );
  }
};

export const requestChangeEmail = async (data) => {
  try {
    const res = await api.post("/api/v1/auth/change-email/request", data);
    return res.data;
  } catch (error) {
    throw new Error(
      error?.response?.data?.detail ||
      error?.response?.data?.msg ||
      "Request failed"
    );
  }
};

export const changeEmailVerify = async (data) => {
  try {
    const res = await api.post("/api/v1/auth/change-email/verify", data);
    return res.data;
  } catch (error) {
    throw new Error(
      error?.response?.data?.detail ||
      error?.response?.data?.msg ||
      "Verification failed"
    );
  }
};

export const getMyLogs = async (action = null, limit = 50) => {
  try {
    let url = `/api/v1/devices/logs?limit=${limit}`;
    if (action) {
      url += `&action=${action}`;
    }

    const response = await api.get(url);

    // Check if response.data exists and is an array
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // If response.data exists but is not an array, check if it has the expected structure
    if (response.data && typeof response.data === "object") {
      // If it has a 'message' property (like 'React app not built'), return empty array
      if (response.data.message) {
        console.warn("API returned message:", response.data.message);
        return [];
      }

      // If it's an object but not an array, try to extract data
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    }

    // Return empty array if no valid data found
    return [];
  } catch (error) {
    console.error("Get my logs error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Return empty array for 404 errors or network issues
    if (error.response?.status === 404 || error.code === "ERR_NETWORK") {
      console.warn("Logs endpoint not available, returning empty array");
      return [];
    }

    // Throw error for other cases
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to fetch logs"
    );
  }
};

export const getMyDevices = async () => {
  try {
    const response = await api.get("/api/v1/devices/my-devices");

    // Check if response.data exists and is an array
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }

    // If response.data exists but is not an array, check if it has the expected structure
    if (response.data && typeof response.data === "object") {
      // If it has a 'message' property (like 'React app not built'), return empty array
      if (response.data.message) {
        console.warn("API returned message:", response.data.message);
        return [];
      }

      // If it's an object but not an array, try to extract data
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
    }

    // Return empty array if no valid data found
    return [];
  } catch (error) {
    console.error("Get my devices error:", {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    // Return empty array for 404 errors or network issues
    if (error.response?.status === 404 || error.code === "ERR_NETWORK") {
      console.warn("Devices endpoint not available, returning empty array");
      return [];
    }

    // Throw error for other cases
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to fetch devices"
    );
  }
};

export const setUp2Factor = async () => {
  try {
    const res = await api.post("/api/v1/auth/2fa/setup");
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || "Failed to setup 2FA");
  }
};

export const enable2Factor = async (data) => {
  try {
    const res = await api.post("/api/v1/auth/2fa/enable", data);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.response?.data?.msg);
  }
};

export const verify2Factor = async ({ code }) => {
  const tempToken = localStorage.getItem("temp_token");

  if (!tempToken) {
    throw new Error("Session expired. Please login again.");
  }

  try {
    const res = await axios.post(
      `${BASE_URL}/api/v1/auth/2fa/verify`,
      { code },
      {
        headers: {
          Authorization: `Bearer ${tempToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("2FA verification failed", err.response?.data || err);
    throw new Error(
      err.response?.data?.detail || "Failed to verify two-factor authentication"
    );
  }
};

export const disable2Factor = async (data) => {
  try {
    const res = await api.post("/api/v1/auth/2fa/disable", data);
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.detail || error.response?.data?.msg);
  }
};

export const deactivateAccount = async (data) => {
  try {
    const res = await api.post("/api/v1/auth/deactivate-account", data);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to deactivate account"
    );
  }
};

export const enableEmailVerify = async () => {
  try {
    const res = await api.post("/api/v1/auth/2sa/email/enable");
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to email verify"
    );
  }
};

export const disableEmailVerify = async () => {
  try {
    const res = await api.post("/api/v1/auth/2sa/email/disable");
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to email verify"
    );
  }
};

export const verifyEmailTwoFac = async ({ code }) => {
  const tempToken = localStorage.getItem("temp_token");

  if (!tempToken) {
    throw new Error("Session expired. Please login again.");
  }

  console.log("TEMP TOKEN SENT:", tempToken);

  try {
    const res = await axios.post(
      `${BASE_URL}/api/v1/auth/2sa/email/verify`,
      { code },
      {
        headers: {
          Authorization: `Bearer ${tempToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data;
  } catch (err) {
    console.error("Email 2SA verification failed", err.response?.data || err);
    throw new Error(
      err.response?.data?.detail ||
      "Failed to verify email two-factor authentication"
    );
  }
};

export const storePlayerId = async (playerId) => {
  try {
    const res = api.post(`/api/v1/users/save-player-id/${playerId}`);
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to enable notification"
    );
  }
};

export const removePlayerId = async () => {
  try {
    const res = await api.delete("/api/v1/users/remove-player-id");
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      "Failed to disable notifications"
    );
  }
};

export const getLivekitToken = async (room) => {
  try {
    const res = await api.post(`/api/v1/livekit/token`, { room });
    return res.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.detail ||
      error.response?.data?.msg ||
      "Failed to get LiveKit token"
    );
  }
};

export default api;
