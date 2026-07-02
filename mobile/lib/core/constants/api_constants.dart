import 'package:flutter/foundation.dart';
import '../services/config_service.dart';

class ApiConstants {
  static String get baseUrl {
    if (ConfigService().isInitialized) {
      return ConfigService().baseUrl;
    }
    
    if (kIsWeb) {
      return 'http://localhost:8000';
    }
    
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8000';
    }
    
    return 'http://10.234.57.94:8000';
  }
  
  static String get wsBaseUrl {
    if (ConfigService().isInitialized) {
      return ConfigService().wsBaseUrl;
    }
    
    if (kIsWeb) {
      return 'ws://localhost:8000';
    }
    
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'ws://10.0.2.2:8000';
    }
    
    return 'ws://10.234.57.94:8000';
  }

  static const String livekitUrl =
    'wss://nico360-5d4fe31a.livekit.cloud';
  
  // Auth Endpoints
  static const String login = '/api/v1/auth/login';
  static const String register = '/api/v1/auth/register';
  static const String verifyCode = '/api/v1/auth/verify-code';
  static const String resendVerification = '/api/v1/auth/resend-verification';
  static const String forgotPassword = '/api/v1/auth/forgot-password';
  static const String resetPassword = '/api/v1/auth/reset-password';
  static const String refreshToken = '/api/v1/auth/refresh';
  static const String logout = '/api/v1/auth/logout';
  static const String changePassword = '/api/v1/auth/change-password';
  
  // Diary Endpoints
  static const String diaries = '/api/v1/diaries';
  static const String diariesFeed = '/api/v1/diaries/feed';
  static const String myDiaries = '/api/v1/diaries/my-feed';
  static const String diaryComments = '/api/v1/diaries';
  static const String updateComment = '/api/v1/diaries/comments';
  static const String deleteComment = '/api/v1/diaries/comments';
  static const String likeDiary = '/api/v1/diaries';
  static const String favorites = '/api/v1/diaries';
  static const String favoriteList = '/api/v1/diaries/favorite-list';
  static const String searchDiaries = '/api/v1/diaries/search';
  
  // User Endpoints
  static const String getUserProfile = '/api/v1/users/me';
  static const String updateUserProfile = '/api/v1/users/me';
  static const String userSearch = '/api/v1/users/search';
  static const String getUserById = '/api/v1/users';
  static const String followUser = '/api/v1/users';
  static const String unfollowUser = '/api/v1/users';
  static const String followers = '/api/v1/users/me/followers';
  static const String following = '/api/v1/users/me/following';
  
  // Group Endpoints
  static const String groups = '/api/v1/groups';
  static const String userGroups = '/api/v1/groups/my';
  static const String groupDetails = '/api/v1/groups';
  static const String createGroup = '/api/v1/groups';
  static const String updateGroup = '/api/v1/groups';
  static const String deleteGroup = '/api/v1/groups';
  static const String joinGroup = '/api/v1/groups';
  static const String leaveGroup = '/api/v1/groups';
  static const String groupMembers = '/api/v1/groups';
  
  // Upload Endpoints
  static const String uploadMedia = '/api/v1/upload/media';
  static const String uploadAvatar = '/api/v1/avatars/upload';
  static const String uploadMultipleMedia = '/api/v1/upload/multiple';
  static const String deleteMedia = '/api/v1/upload/media';
  
  // Notification Endpoints
  static const String notifications = '/api/v1/notifications';
  static const String markNotificationRead = '/api/v1/notifications';
  static const String markAllRead = '/api/v1/notifications/read-all';
  static const String notificationSettings = '/api/v1/notifications/settings';
  
  // WebSocket Endpoints
  static const String feedWebSocket = '/api/v1/diaries/ws/feed';
  static const String notificationsWebSocket = '/api/v1/notifications/ws';
  static const String chatWebSocket = '/api/v1/chat/ws';
  
  // Health Check
  static const String health = '/health';
  static const String apiHealth = '/api/v1/health';
  
  // Headers
  static const Map<String, String> defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  static const Map<String, String> multipartHeaders = {
    'Accept': 'application/json',
  };
  
  static Map<String, String> get formLoginHeaders {
    return {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    };
  }
  
  static Map<String, String> authHeaders(String token) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': 'Bearer $token',
    };
  }
  
  // Timeouts
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;
  
  // Helper Methods
  static String getFullUrl(String endpoint) {
    return '$baseUrl$endpoint';
  }
  
  static String getFullWsUrl(String endpoint) {
    return '$wsBaseUrl$endpoint';
  }
  
  static String buildUrl(String endpoint, Map<String, dynamic>? queryParams) {
    if (queryParams == null || queryParams.isEmpty) {
      return '$baseUrl$endpoint';
    }
    
    final uri = Uri.parse('$baseUrl$endpoint');
    return uri.replace(queryParameters: queryParams.map(
      (key, value) => MapEntry(key, value.toString())
    )).toString();
  }
  
  static String getPaginatedUrl(String endpoint, int page, int limit) {
    return buildUrl(endpoint, {
      'page': page,
      'limit': limit,
    });
  }
  
  static bool isConfigValid() {
    return baseUrl.isNotEmpty && 
           baseUrl.startsWith('http') && 
           wsBaseUrl.isNotEmpty;
  }
  
  static String getCurrentConnectionInfo() {
    if (ConfigService().isInitialized) {
      return ConfigService().getCurrentMode();
    }
    return 'Using fallback configuration';
  }
}

// Extension for easier endpoint building
extension ApiEndpointExtension on String {
  String get fullUrl => ApiConstants.getFullUrl(this);
  String get fullWsUrl => ApiConstants.getFullWsUrl(this);
  
  String withParams(Map<String, dynamic> params) => 
      ApiConstants.buildUrl(this, params);
  
  String paginated(int page, int limit) => 
      ApiConstants.getPaginatedUrl(this, page, limit);
}