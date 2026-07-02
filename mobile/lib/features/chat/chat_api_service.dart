import 'dart:convert';
import 'dart:io';

import 'package:http/http.dart' as http;
import 'package:whisper_space_flutter/core/constants/api_constants.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/chat/model/private_message_model/private_message_model.dart';
import 'package:whisper_space_flutter/features/chat/model/pin_model/pinned_message_model.dart'
    as pin;

import '../chat/model/chat_model/chat_list_model.dart';
import '../chat/model/group_message_model/group_message_model.dart';
import '../chat/model/group_model/group_details_model.dart';
import '../chat/model/group_model/group_image_model.dart';
import '../chat/model/group_model/user_model.dart';
import 'package:http_parser/http_parser.dart';

MediaType _getMediaType(String path) {
  final ext = path.split('.').last.toLowerCase();

  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].contains(ext)) {
    return MediaType('image', ext == 'jpg' ? 'jpeg' : ext);
  } else if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv'].contains(ext)) {
    return MediaType('video', ext);
  } else {
    return MediaType('application', 'octet-stream');
  }
}

class ChatAPISource {
  final StorageService storageService;
  final String baseUrl;

  ChatAPISource({required this.storageService, String? baseUrl})
      : baseUrl = baseUrl ?? ApiConstants.baseUrl;

  Future<Map<String, String>> _authHeaders() async {
    final token = storageService.getToken();
    if (token == null) {
      throw Exception('Auth token is null');
    }

    return {...ApiConstants.defaultHeaders, 'Authorization': 'Bearer $token'};
  }

  Future<List<ChatListItemModel>> getChats() async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/chats/'),
      headers: await _authHeaders(),
    );

    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data.map((json) => ChatListItemModel.fromJson(json)).toList();
    } else {
      throw Exception(
        'Failed to load chats (${response.statusCode})',
      );
    }
  }

  Future<GroupDetailsModel> createNewGroup({
    required String name,
    String? description,
    List<int> inviteUserIds = const [],
  }) async {
    final response = await http.post(Uri.parse('$baseUrl/api/v1/groups/'),
        headers: {
          ...(await _authHeaders()),
          'Content-Type': 'application/json'
        },
        body: jsonEncode({
          'name': name,
          'description': description,
          'invite_user_ids': inviteUserIds
        }));
    if (response.statusCode == 201) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return GroupDetailsModel.fromJson(data);
    } else {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<GroupDetailsModel> getGroupById(int groupId) async {
    final response = await http.get(
        Uri.parse('$baseUrl/api/v1/groups/$groupId'),
        headers: await _authHeaders());

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      print('data $data');
      return GroupDetailsModel.fromJson(data);
    } else {
      throw Exception(
          'Failed to group chat ($groupId) –  ${response.statusCode}');
    }
  }

  Future<GroupDetailsModel> updateGroupById(
    int groupId, {
    String? name,
    String? description,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/v1/groups/$groupId'),
      headers: {
        ...(await _authHeaders()),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        if (name != null) 'name': name,
        if (description != null) 'description': description,
      }),
    );

    if (response.statusCode == 200) {
      final Map<String, dynamic> data = jsonDecode(response.body);
      return GroupDetailsModel.fromJson(data);
    } else {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<void> deleteGroupId(int groupId) async {
    final response = await http.delete(
        Uri.parse('$baseUrl/api/v1/groups/$groupId'),
        headers: await _authHeaders());
    if (response.statusCode != 204) {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<void> leaveGroupById(int groupId) async {
    final response = await http.delete(
        Uri.parse('$baseUrl/api/v1/groups/leave/$groupId'),
        headers: await _authHeaders());
    if (response.statusCode != 204) {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<List<UserModel>> getGroupMembers(int groupId) async {
    final response = await http.get(
        Uri.parse('$baseUrl/api/v1/groups/$groupId/members/'),
        headers: await _authHeaders());
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data.map((json) => UserModel.fromJson(json)).toList();
    } else {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<List<GroupMessageModel>> getGroupMessages({
    required int groupId,
    int limit = 30,
    int offset = 0,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/groups/$groupId/message')
        .replace(queryParameters: {
      'limit': limit.toString(),
      'offset': offset.toString(),
    });

    final response = await http.get(uri, headers: await _authHeaders());

    if (response.statusCode != 200) {
      throw Exception('Failed to load messages');
    }

    final List data = jsonDecode(response.body);
    print('Raw message list: $data');
    return data
        .where((e) => e != null)
        .map((e) => GroupMessageModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<UserModel>> searchUsers(String query) async {
    if (query.length < 2) return [];

    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/users/search?q=$query'),
      headers: await _authHeaders(),
    );

    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data.map((json) => UserModel.fromJson(json)).toList();
    } else {
      throw Exception('Failed to search users');
    }
  }

  Future<void> inviteUser(int groupId, int userId) async {
    final response = await http.post(
        Uri.parse('$baseUrl/api/v1/groups/$groupId/invites/$userId'),
        headers: await _authHeaders());
    if (response.statusCode != 200) {
      throw Exception(jsonDecode(response.body));
    }
  }

  Future<void> removeMember(int groupId, int memberId) async {
    final response = await http.delete(
        Uri.parse('$baseUrl/api/v1/groups/remove/$groupId/members/$memberId'),
        headers: await _authHeaders());
    if (response.statusCode != 204) {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<void> uploadGroupCover(int groupId, File file) async {
    final uri = Uri.parse('$baseUrl/api/v1/groups/$groupId/cover');

    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(await _authHeaders());

    request.files.add(
      await http.MultipartFile.fromPath(
        'cover',
        file.path,
      ),
    );

    final response = await request.send();

    if (response.statusCode != 200 && response.statusCode != 201) {
      final body = await response.stream.bytesToString();
      throw Exception(body);
    }
  }

  Future<List<GroupImage>> getGroupCovers(int groupId) async {
    final response = await http.get(
        Uri.parse('$baseUrl/api/v1/groups/$groupId/cover'),
        headers: await _authHeaders());
    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data.map((json) => GroupImage.fromJson(json)).toList();
    } else {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<void> deleteCoverById(int coverId) async {
    final response = await http.delete(
        Uri.parse('$baseUrl/api/v1/groups/cover/$coverId'),
        headers: await _authHeaders());
    if (response.statusCode != 204) {
      throw Exception(jsonDecode(response.body)['detail']);
    }
  }

  Future<GroupMessageModel> uploadFile(
      int groupId, File file, String tempId, String? parentMessageId) async {
    final uri = Uri.parse('$baseUrl/api/v1/messages/groups/$groupId');

    var request = http.MultipartRequest("POST", uri);

    request.headers.addAll(await _authHeaders());

    request.files.add(
      await http.MultipartFile.fromPath('file', file.path),
    );

    request.fields['temp_id'] = tempId;
    if (parentMessageId != null) {
      request.fields['parent_message_id'] = parentMessageId;
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      return GroupMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception("Upload failed: ${response.body}");
    }
  }

  Future<GroupMessageModel> uploadVoice(
      int groupId, File file, String tempId, String? parentMessageId) async {
    final uri = Uri.parse('$baseUrl/api/v1/messages/groups/$groupId/voice');

    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(await _authHeaders());

    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        file.path,
        contentType: http.MediaType('audio', 'm4a'),
      ),
    );

    request.fields['temp_id'] = tempId;
    if (parentMessageId != null) {
      request.fields['parent_message_id'] = parentMessageId;
    }

    final response = await request.send();

    final responseBody = await response.stream.bytesToString();

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(responseBody);
    }

    final jsonData = json.decode(responseBody) as Map<String, dynamic>;

    return GroupMessageModel.fromJson(jsonData);
  }

  Future<GroupMessageModel> updateFileMessage(
      int messageId, File file, String tempId) async {
    final uri = Uri.parse('$baseUrl/api/v1/messages/$messageId/file');

    final request = http.MultipartRequest('PUT', uri);

    request.headers.addAll(await _authHeaders());
    request.files.add(await http.MultipartFile.fromPath('file', file.path));

    request.fields['temp_id'] = tempId;

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200) {
      return GroupMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to update file message: ${response.body}');
    }
  }

  Future<GroupDetailsModel> pinMessage({
    required int groupId,
    required int messageId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/messages/pin');

    final response = await http.patch(
      uri,
      headers: {
        ...await _authHeaders(),
        "Content-Type": "application/json",
      },
      body: jsonEncode({
        "group_id": groupId,
        "message_id": messageId,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to pin message: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return GroupDetailsModel.fromJson(data);
  }

  Future<GroupDetailsModel> unPinMessage({
    required int groupId,
    required int messageId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/messages/unpin');

    final response = await http.patch(
      uri,
      headers: {
        ...await _authHeaders(),
        "Content-Type": "application/json",
      },
      body: jsonEncode({
        "group_id": groupId,
        "message_id": messageId,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to unpin message: ${response.body}');
    }

    final data = jsonDecode(response.body);
    return GroupDetailsModel.fromJson(data);
  }

  Future<GroupMessageModel> toggleReaction({
    required int groupId,
    required int messageId,
    required String reaction,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/messages/reaction');

    final response = await http.post(
      uri,
      headers: {
        ...await _authHeaders(),
        "Content-Type": "application/json",
      },
      body: jsonEncode({
        "group_id": groupId,
        "message_id": messageId,
        "reaction": reaction,
      }),
    );

    if (response.statusCode != 200) {
      throw Exception('Failed to toggle reaction: ${response.body}');
    }

    return GroupMessageModel.fromJson(jsonDecode(response.body));
  }

  //Private Chat

  Future<List<PrivateMessageModel>> getPrivateMessages({
    required int userId,
    int limit = 30,
    int offset = 0,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/chats/private/$userId')
        .replace(queryParameters: {
      'limit': limit.toString(),
      'offset': offset.toString(),
    });

    final response = await http.get(uri, headers: await _authHeaders());

    if (response.statusCode == 200) {
      final List data = jsonDecode(response.body);
      return data
          .where((e) => e != null)
          .map((e) => PrivateMessageModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } else {
      throw Exception(
          'Failed to load private messages: ${response.statusCode}');
    }
  }

  Future<PrivateMessageModel> sendPrivateMessage({
    required int receiverId,
    required String content,
    String? tempId,
    int? replyToId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/chats/private/$receiverId'),
      headers: {
        ...(await _authHeaders()),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'content': content,
        'message_type': 'text',
        if (replyToId != null) 'reply_to_id': replyToId,
        if (tempId != null) 'temp_id': tempId,
      }),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return PrivateMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to send message: ${response.body}');
    }
  }

  Future<PrivateMessageModel> uploadPrivateFile({
    required int receiverId,
    required File file,
    required String tempId,
    int? replyToId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/chats/private/$receiverId/upload');

    var request = http.MultipartRequest("POST", uri);
    request.headers.addAll(await _authHeaders());

    String messageType = 'file';
    final extension = file.path.split('.').last.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].contains(extension)) {
      messageType = 'image';
    } else if (['mp4', 'mov', 'avi', 'mkv', 'wmv', 'flv'].contains(extension)) {
      messageType = 'video';
    }

    request.fields['message_type'] = messageType;
    if (replyToId != null) {
      request.fields['reply_to_id'] = replyToId.toString();
    }
    if (tempId.isNotEmpty) {
      request.fields['temp_id'] = tempId;
    }

    request.files.add(
      await http.MultipartFile.fromPath(
        'file',
        file.path,
        contentType: _getMediaType(file.path),
      ),
    );

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    if (response.statusCode == 200 || response.statusCode == 201) {
      final data = jsonDecode(response.body);
      return PrivateMessageModel.fromJson(data);
    } else {
      throw Exception("Upload failed: ${response.body}");
    }
  }

  Future<PrivateMessageModel> uploadPrivateVoice({
    required int receiverId,
    required File file,
    required String tempId,
    required double voiceDuration,
    int? replyToId,
  }) async {
    final uri = Uri.parse('$baseUrl/api/v1/chats/private/$receiverId/voice');
    final request = http.MultipartRequest('POST', uri);
    request.headers.addAll(await _authHeaders());

    request.fields['temp_id'] = tempId;
    if (replyToId != null) {
      request.fields['reply_to_id'] = replyToId.toString();
    }

    request.fields['duration'] = voiceDuration.toString();

    request.files.add(await http.MultipartFile.fromPath(
      'voice_file',
      file.path,
    ));

    final response = await request.send();
    final responseBody = await response.stream.bytesToString();

    if (response.statusCode == 200 || response.statusCode == 201) {
      final jsonData = json.decode(responseBody) as Map<String, dynamic>;
      return PrivateMessageModel.fromJson(jsonData);
    } else {
      throw Exception('Voice upload failed: $responseBody');
    }
  }

  Future<void> replaceFile({required int messageId, required File file}) async {
    final uri =
        Uri.parse('$baseUrl/api/v1/chats/private/$messageId/replace-file');

    final request = http.MultipartRequest('PUT', uri);
    request.headers.addAll(await _authHeaders());

    request.files.add(await http.MultipartFile.fromPath('file', file.path));

    final response = await request.send();
    final responseBody = await response.stream.bytesToString();

    if (response.statusCode == 200) {
      return;
    } else {
      throw Exception('Replace file failed $responseBody');
    }
  }

  Future<PrivateMessageModel> editPrivateMessage({
    required int messageId,
    required String newContent,
  }) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/v1/chats/private/$messageId'),
      headers: {
        ...(await _authHeaders()),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'content': newContent,
      }),
    );

    if (response.statusCode == 200) {
      return PrivateMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to edit message: ${response.body}');
    }
  }

  Future<void> deletePrivateMessage(int messageId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/chats/private/$messageId'),
      headers: await _authHeaders(),
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete message: ${response.statusCode}');
    }
  }

  Future<void> deleteImageMessage(int messageId) async {
    final response = await http.delete(
      Uri.parse('$baseUrl/api/v1/chats/private/image/$messageId'),
      headers: await _authHeaders(),
    );

    if (response.statusCode != 200 && response.statusCode != 204) {
      throw Exception('Failed to delete image message: ${response.statusCode}');
    }
  }

  Future<pin.PinnedMessageModel> pinPrivateMessage(int messageId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/chats/private/$messageId/pin'),
      headers: await _authHeaders(),
    );

    if (response.statusCode == 200) {
      return pin.PinnedMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to pin message: ${response.statusCode}');
    }
  }

  Future<pin.PinnedMessageModel> getPinnedMessage(int userId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/chats/private/$userId/pin'),
      headers: await _authHeaders(),
    );

    if (response.statusCode == 200) {
      return pin.PinnedMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to pin message: ${response.statusCode}');
    }
  }

  Future<PrivateMessageModel> reactPrivateMessage({
    required int messageId,
    required String emoji,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/chats/private/reaction'),
      headers: {
        ...(await _authHeaders()),
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'message_id': messageId,
        'emoji': emoji,
      }),
    );

    if (response.statusCode == 200) {
      return PrivateMessageModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Failed to react message: ${response.body}');
    }
  }

  Future<String> getLiveKitToken(String room) async {
    final res = await http.post(
      Uri.parse('$baseUrl/api/v1/livekit/token'),
      headers: await _authHeaders(),
      body: jsonEncode({
        "room": room,
      }),
    );

    if (res.statusCode != 200) {
      throw Exception("Failed to get LiveKit token: ${res.body}");
    }

    final data = jsonDecode(res.body);
    return data["token"];
  }
}
