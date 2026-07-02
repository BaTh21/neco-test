// lib/features/feed/data/datasources/feed_api_service.dart
import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:whisper_space_flutter/core/constants/api_constants.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:share_plus/share_plus.dart';

class FeedApiService {
  final StorageService storageService;
  final String baseUrl;
  
  FeedApiService({
    required this.storageService,
    String? baseUrl,
  }) : baseUrl = baseUrl ?? ApiConstants.baseUrl;

  void _log(String message) {
  }

  // ============ GET FEED ============
  Future<List<DiaryModel>> getFeed({
    int limit = 20,
    int offset = 0,
  }) async {
    _log('getFeed() - limit: $limit, offset: $offset');
    
    try {
      final token = storageService.getToken();
      if (token == null) {
        _log('No auth token');
        return [];
      }

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/diaries/feed?limit=$limit&offset=$offset'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      _log(' Feed response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final diaries = data.map<DiaryModel>((json) {
          return DiaryModel.fromJson(json);
        }).toList();
        
        _log('Got ${diaries.length} diaries from API');
        return diaries;
      } else {
        _log('API Error ${response.statusCode}: ${response.body}');
        return [];
      }
    } catch (e) {
      _log(' Network error: $e');
      return [];
    }
  }

  // ============ GET MY FEED ============
  Future<List<DiaryModel>> getMyFeed({
    int limit = 20,
    int offset = 0,
  }) async {
    try {
      final token = storageService.getToken();
      if (token == null) return [];
      
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/diaries/my-feed?limit=$limit&offset=$offset'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map<DiaryModel>((json) => DiaryModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      _log('Error getting my feed: $e');
      return [];
    }
  }

  // ============ GET MY DIARIES COUNT ============
  Future<int> getMyDiariesCount() async {
    try {
      final token = storageService.getToken();
      if (token == null) return 0;
      
      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/diaries/my-feed/count'),
        headers: {'Authorization': 'Bearer $token'},
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return data['total'] ?? 0;
      }
      return 0;
    } catch (e) {
      _log('Error getting diary count: $e');
      return 0;
    }
  }

  // ============ GET USER GROUPS ============
  Future<List<Group>> getUserGroups() async {
    _log('getUserGroups()');
    
    try {
      final token = storageService.getToken();
      if (token == null) {
        _log(' No auth token');
        return [];
      }

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/groups/my'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 10));

      _log(' Groups response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final groups = data.map<Group>((json) {
          return Group.fromJson(json);
        }).toList();
        
        _log('Got ${groups.length} groups from API');
        return groups;
      } else {
        _log(' API Error ${response.statusCode}: ${response.body}');
        return [];
      }
    } catch (e) {
      _log('Network error: $e');
      return [];
    }
  }

  // ============ CREATE DIARY ============
  Future<DiaryModel> createDiary({
    required String title,
    required String content,
    String shareType = 'private',
    List<int>? groupIds,
    List<String>? imageUrls,
    List<String>? videoUrls,
  }) async {
    _log('createDiary() - "$title", shareType: $shareType');
    
    try {
      final token = storageService.getToken();
      if (token == null) {
        throw Exception('Not authenticated. Please login again.');
      }

      String backendShareType = shareType.toLowerCase();
      if (backendShareType == 'private') {
        backendShareType = 'personal';
      }

      final request = {
        'title': title.trim(),
        'content': content.trim(),
        'share_type': backendShareType,
        'group_ids': groupIds ?? [],
        'images': imageUrls ?? [],
        'videos': videoUrls ?? [],
      };

      _log('📤 Creating diary with data: ${jsonEncode(request)}');
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/diaries/'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(request),
      ).timeout(const Duration(seconds: 30));

      _log(' Response: ${response.statusCode}');
      
      if (response.statusCode == 201) {
        final data = jsonDecode(response.body);
        final diary = DiaryModel.fromJson(data);
        
        _log(' Diary created with ID: ${diary.id}');
        
        return diary;
      } else {
        _log(' API Error: ${response.body}');
        throw Exception('Failed to create diary: ${response.statusCode}');
      }
    } catch (e) {
      _log('Error creating diary: $e');
      rethrow;
    }
  }

  // ============ UPDATE DIARY ============
  Future<DiaryModel> updateDiary({
    required int diaryId,
    String? title,
    String? content,
    String? shareType,
    List<int>? groupIds,
    List<String>? imageUrls,
    List<String>? videoUrls,
  }) async {
    _log('updateDiary() - diaryId: $diaryId, shareType: $shareType');
    
    try {
      final token = storageService.getToken();
      if (token == null) {
        throw Exception('Not authenticated.');
      }

      final Map<String, dynamic> request = {};
      
      if (title != null) request['title'] = title.trim();
      if (content != null) request['content'] = content.trim();
      if (shareType != null) {
        String backendShareType = shareType.toLowerCase();
        if (backendShareType == 'private') {
          backendShareType = 'personal';
        }
        request['share_type'] = backendShareType;
      }
      if (groupIds != null) request['group_ids'] = groupIds;
      if (imageUrls != null) request['images'] = imageUrls;
      if (videoUrls != null) request['videos'] = videoUrls;

      _log(' Updating diary with data: ${jsonEncode(request)}');
      
      final response = await http.patch(
        Uri.parse('$baseUrl/api/v1/diaries/$diaryId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode(request),
      ).timeout(const Duration(seconds: 30));

      _log(' Response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return DiaryModel.fromJson(data);
      } else {
        _log('API Error: ${response.body}');
        throw Exception('Failed to update diary: ${response.statusCode}');
      }
    } catch (e) {
      _log('Error updating diary: $e');
      rethrow;
    }
  }

  // ============ DELETE DIARY ============
Future<void> deleteDiary(int diaryId) async {
  try {
    final token = await storageService.getToken();
    if (token == null) {
      throw Exception('Not authenticated. Please login again.');
    }
    
    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/diaries/$diaryId'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 30));
    if (response.statusCode == 204) {
      return;
    }
    if (response.statusCode == 401) {
      throw Exception('Session expired. Please login again.');
    } else if (response.statusCode == 403) {
      throw Exception('You do not have permission to delete this diary');
    } else if (response.statusCode == 404) {
      throw Exception('Diary not found');
    } else if (response.statusCode >= 400) {
      throw Exception('Failed to delete diary: ${response.statusCode}');
    }
    return;
  } catch (e) {
    rethrow;
  }
}

  // ============ UPLOAD MEDIA ============
  Future<String> uploadMedia(File file, {bool isVideo = false}) async {
    try {
      final token = storageService.getToken();
      if (token == null) {
        throw Exception('No authentication token');
      }
      
      _log(' Uploading ${isVideo ? 'video' : 'image'}...');
      _log('File path: ${file.path}');
      
      final bytes = await file.readAsBytes();
      final base64Data = base64Encode(bytes);
      final extension = file.path.split('.').last.toLowerCase();
      
      String mimeType;
      if (isVideo) {
        switch (extension) {
          case 'mp4':
            mimeType = 'video/mp4';
            break;
          case 'mov':
            mimeType = 'video/quicktime';
            break;
          case 'avi':
            mimeType = 'video/x-msvideo';
            break;
          case 'webm':
            mimeType = 'video/webm';
            break;
          case 'mkv':
            mimeType = 'video/x-matroska';
            break;
          default:
            mimeType = 'video/mp4';
        }
      } else {
        switch (extension) {
          case 'jpg':
          case 'jpeg':
            mimeType = 'image/jpeg';
            break;
          case 'png':
            mimeType = 'image/png';
            break;
          case 'gif':
            mimeType = 'image/gif';
            break;
          case 'webp':
            mimeType = 'image/webp';
            break;
          default:
            mimeType = 'image/jpeg';
        }
      }
      
      final dataUrl = 'data:$mimeType;base64,$base64Data';
      
      final response = await http.post(
        Uri.parse('$baseUrl/api/v1/upload/media'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'data_url': dataUrl,
          'filename': '${isVideo ? 'video' : 'image'}_${DateTime.now().millisecondsSinceEpoch}.$extension',
          'is_diary': true,
        }),
      );
      
      _log(' Upload response: ${response.statusCode}');
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final url = data['url'] as String;
        _log('Upload successful: $url');
        return url;
      } else {
        _log(' Upload failed: ${response.body}');
        throw Exception('Upload failed: ${response.statusCode}');
      }
    } catch (e) {
      _log('Upload error: $e');
      rethrow;
    }
  }

  // ============ COMMENT FUNCTIONALITY ============
Future<Comment> createComment({
  required int diaryId,
  required String content,
  int? parentId,
  int? replyToUserId,
  List<String>? images,
}) async {
  _log('createComment() - diaryId: $diaryId, parentId: $parentId, replyToUserId: $replyToUserId');
  
  try {
    final token = storageService.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    // Build the request body - match what your backend expects
    final Map<String, dynamic> request = {
      'content': content,
    };
    
    // Only add optional fields if they're provided and valid
    if (parentId != null && parentId > 0) {
      request['parent_id'] = parentId;
    }
    
    if (replyToUserId != null && replyToUserId > 0) {
      request['reply_to_user_id'] = replyToUserId;
    }
    
    if (images != null && images.isNotEmpty) {
      request['images'] = images;
    }

    _log('📤 Creating comment with data: ${jsonEncode(request)}');
    
    // Use the correct endpoint format: /api/v1/diaries/{diaryId}/comments
    final url = '$baseUrl/api/v1/diaries/$diaryId/comments';
    _log('Endpoint: $url');
    
    final response = await http.post(
      Uri.parse(url),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode(request),
    ).timeout(const Duration(seconds: 30));

    _log('Comment response: ${response.statusCode}');
    _log('Response body: ${response.body}');
    
    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return Comment.fromJson(data);
    } else {
      _log(' API Error: ${response.statusCode} - ${response.body}');
      
      // Provide more helpful error messages
      if (response.statusCode == 404) {
        throw Exception('Comment endpoint not found. Please check backend routes.');
      } else if (response.statusCode == 401) {
        throw Exception('Authentication expired. Please login again.');
      } else if (response.statusCode == 403) {
        throw Exception('You don\'t have permission to comment on this diary.');
      } else {
        throw Exception('Failed to create comment: ${response.statusCode}');
      }
    }
  } catch (e) {
    _log(' Error creating comment: $e');
    rethrow;
  }
}


  Future<List<Comment>> getComments(int diaryId) async {
    try {
      final token = storageService.getToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/diaries/$diaryId/comments'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map<Comment>((json) => Comment.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      _log('Error getting comments: $e');
      return [];
    }
  }

  Future<Comment> updateComment({
    required int commentId,
    required String content,
    List<String>? images,
  }) async {
    try {
      final token = storageService.getToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await http.put(
        Uri.parse('$baseUrl/api/v1/diaries/comments/$commentId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'content': content,
          if (images != null) 'images': images,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return Comment.fromJson(data);
      } else {
        throw Exception('Failed to update comment: ${response.statusCode}');
      }
    } catch (e) {
      _log('Error updating comment: $e');
      rethrow;
    }
  }

  Future<void> deleteComment(int commentId) async {
    try {
      final token = storageService.getToken();
      if (token == null) {
        throw Exception('Not authenticated');
      }

      final response = await http.delete(
        Uri.parse('$baseUrl/api/v1/diaries/comments/$commentId'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to delete comment: ${response.statusCode}');
      }
    } catch (e) {
      _log('Error deleting comment: $e');
      rethrow;
    }
  }

  // ============ LIKE FUNCTIONALITY ============
  Future<Map<String, dynamic>> likeDiary(int diaryId) async {
  _log('likeDiary() - diaryId: $diaryId');
  
  try {
    final token = storageService.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/diaries/$diaryId/like'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 30));

    _log(' Like response: ${response.statusCode}');
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      _log(' Like toggled: ${data['liked']}, count: ${data['likes_count']}');
      return data;
    } else {
      _log('API Error: ${response.body}');
      throw Exception('Failed to like diary: ${response.statusCode}');
    }
  } catch (e) {
    _log('Error liking diary: $e');
    rethrow;
  }
}


  // ============ FAVORITE FUNCTIONALITY ============
  Future<Map<String, dynamic>> saveToFavorites(int diaryId) async {
  _log('saveToFavorites() - diaryId: $diaryId');
  
  try {
    final token = storageService.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/diaries/$diaryId/favorites'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 30));

    _log('📥 Save favorite response: ${response.statusCode}');
    
    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      _log('✅ Added to favorites: ${data['id']}');
      return data;
    } else if (response.statusCode == 400) {
      // Already in favorites
      _log('⚠️ Already in favorites');
      return {'already_favorited': true};
    } else {
      _log('❌ API Error: ${response.body}');
      throw Exception('Failed to save favorite: ${response.statusCode}');
    }
  } catch (e) {
    _log('❌ Error saving favorite: $e');
    rethrow;
  }
}

  Future<void> removeFromFavorites(int diaryId) async {
  _log('removeFromFavorites() - diaryId: $diaryId');
  
  try {
    final token = storageService.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }

    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/diaries/$diaryId/favorites'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 30));

    _log(' Remove favorite response: ${response.statusCode}');
    
    if (response.statusCode == 200) {
      _log('Removed from favorites');
    } else {
      _log('API Error: ${response.body}');
      throw Exception('Failed to remove favorite: ${response.statusCode}');
    }
  } catch (e) {
    _log('Error removing favorite: $e');
    rethrow;
  }
}

  Future<List<DiaryModel>> getFavoriteDiaries() async {
    try {
      final token = storageService.getToken();
      if (token == null) return [];

      final response = await http.get(
        Uri.parse('$baseUrl/api/v1/diaries/favorite-list'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        return data.map<DiaryModel>((json) => DiaryModel.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      _log('Error getting favorite diaries: $e');
      return [];
    }
  }
  Future<String> generateShareLink(int diaryId) async {
  _log('generateShareLink() - diaryId: $diaryId');
  
  try {
    final token = storageService.getToken();
    if (token == null) {
      throw Exception('Not authenticated');
    }
    
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/diaries/$diaryId/share-link'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
    ).timeout(const Duration(seconds: 30));
    
    _log('Share link response: ${response.statusCode}');
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final shareUrl = data['share_url'] as String;
      _log('Share URL generated: $shareUrl');
      return shareUrl;
    } else {
      throw Exception('Failed to generate share link: ${response.statusCode}');
    }
  } catch (e) {
    _log('Error generating share link: $e');
    rethrow;
  }
}

Future<DiaryModel> getSharedDiary(String token) async {
  _log('getSharedDiary() - token: $token');
  
  try {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/diaries/shared/$token'),
      headers: {
        'Content-Type': 'application/json',
      },
    ).timeout(const Duration(seconds: 30));
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return DiaryModel.fromJson(data);
    } else {
      throw Exception('Failed to load shared diary: ${response.statusCode}');
    }
  } catch (e) {
    _log('Error loading shared diary: $e');
    rethrow;
  }
}

Future<void> shareViaSocialMedia({
  required String shareUrl,
  required String title,
  required String content,
}) async {
  try {
    // For native sharing
    await Share.share(
      '$title\n\n$content\n\nCheck out this diary on NECO360:\n$shareUrl',
      subject: title,
    );
  } catch (e) {
    _log('Error sharing via social media: $e');
    rethrow;
  }
}
}