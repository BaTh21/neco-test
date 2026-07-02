// lib/features/notes/data/datasources/notes_api_service.dart
import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:whisper_space_flutter/core/constants/api_constants.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/notes/data/models/note_model.dart';

class ShareNoteRequest {
  final ShareType shareType;
  final List<int>? friendIds;
  final bool canEdit;

  ShareNoteRequest({
    required this.shareType,
    this.friendIds,
    this.canEdit = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'share_type': shareType.value,
      'friend_ids': friendIds,
      'can_edit': canEdit,
    };
  }
}

class NoteCreate {
  final String title;
  final String? content;
  final bool isPinned;
  final bool isArchived;
  final String color;
  final ShareType shareType;
  final List<int> sharedWith;
  final bool canEdit;

  NoteCreate({
    required this.title,
    this.content,
    this.isPinned = false,
    this.isArchived = false,
    this.color = '#ffffff',
    this.shareType = ShareType.private,
    this.sharedWith = const [],
    this.canEdit = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'content': content,
      'is_pinned': isPinned,
      'is_archived': isArchived,
      'color': color,
      'share_type': shareType.value,
      'shared_with': sharedWith,
      'can_edit': canEdit,
    };
  }
}

class NoteUpdate {
  final String? title;
  final String? content;
  final bool? isPinned;
  final bool? isArchived;
  final String? color;
  final ShareType? shareType;
  final List<int>? sharedWith;
  final bool? canEdit;

  NoteUpdate({
    this.title,
    this.content,
    this.isPinned,
    this.isArchived,
    this.color,
    this.shareType,
    this.sharedWith,
    this.canEdit,
  });

  Map<String, dynamic> toJson() {
    return {
      if (title != null) 'title': title,
      if (content != null) 'content': content,
      if (isPinned != null) 'is_pinned': isPinned,
      if (isArchived != null) 'is_archived': isArchived,
      if (color != null) 'color': color,
      if (shareType != null) 'share_type': shareType!.value,
      if (sharedWith != null) 'shared_with': sharedWith,
      if (canEdit != null) 'can_edit': canEdit,
    };
  }
}

class NotesApiService {
  final StorageService storageService;
  final String baseUrl;

  NotesApiService({
    required this.storageService,
    String? baseUrl,
  }) : baseUrl = baseUrl ?? ApiConstants.baseUrl;

  Future<String?> _getToken() async {
    return storageService.getToken();
  }

  Future<Map<String, String>> _getHeaders() async {
    final token = await _getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  String _getNotesUrl(String path, {Map<String, String>? queryParams}) {
    String url = '$baseUrl/api/v1/notes';
    if (path.isNotEmpty && !path.startsWith('?')) {
      url = '$url/$path';
    }
    if (queryParams != null && queryParams.isNotEmpty) {
      final queryString = queryParams.entries
          .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
          .join('&');
      url = '$url?$queryString';
    } else if (path.startsWith('?')) {
      url = '$url$path';
    }
    return url;
  }

  // Create a new note
  Future<NoteModel> createNote(NoteCreate note) async {
    final url = _getNotesUrl('');

    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode(note.toJson()),
    );

    if (response.statusCode == 200) {
      return NoteModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(
          'Failed to create note: ${response.statusCode} - ${response.body}');
    }
  }

  // Get user's notes (with optional archived filter)
  Future<List<NoteModel>> getUserNotes({bool archived = false}) async {
    final queryParams = {'archived': archived.toString()};
    final url = _getNotesUrl('', queryParams: queryParams);

    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => NoteModel.fromJson(json)).toList();
    } else {
      throw Exception(
          'Failed to load notes: ${response.statusCode} - ${response.body}');
    }
  }

  // Get a specific note
  Future<NoteModel> getNote(int noteId) async {
    final url = _getNotesUrl('$noteId');

    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode == 200) {
      return NoteModel.fromJson(jsonDecode(response.body));
    } else if (response.statusCode == 404) {
      throw Exception('Note not found');
    } else {
      throw Exception(
          'Failed to load note: ${response.statusCode} - ${response.body}');
    }
  }

  // Update a note
  Future<NoteModel> updateNote(int noteId, NoteUpdate noteUpdate) async {
    final url = _getNotesUrl('$noteId');

    final headers = await _getHeaders();
    final response = await http.put(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode(noteUpdate.toJson()),
    );

    if (response.statusCode == 200) {
      return NoteModel.fromJson(jsonDecode(response.body));
    } else if (response.statusCode == 404) {
      throw Exception('Note not found or no edit permission');
    } else {
      throw Exception(
          'Failed to update note: ${response.statusCode} - ${response.body}');
    }
  }

  // Delete a note
  Future<void> deleteNote(int noteId) async {
    final url = _getNotesUrl('$noteId');

    final headers = await _getHeaders();
    final response = await http.delete(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode != 200) {
      throw Exception(
          'Failed to delete note: ${response.statusCode} - ${response.body}');
    }
  }

  // Share a note
  Future<NoteModel> shareNote(int noteId, ShareNoteRequest shareData) async {
    final url = _getNotesUrl('$noteId/share');

    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
      body: jsonEncode(shareData.toJson()),
    );

    if (response.statusCode == 200) {
      return NoteModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(
          'Failed to share note: ${response.statusCode} - ${response.body}');
    }
  }

  // Stop sharing a note
  Future<NoteModel> stopSharing(int noteId) async {
    final url = _getNotesUrl('$noteId/stop-sharing');

    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode == 200) {
      return NoteModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(
          'Failed to stop sharing: ${response.statusCode} - ${response.body}');
    }
  }

  // Get notes shared with me
  Future<List<NoteModel>> getSharedWithMe() async {
    final url = _getNotesUrl('shared/with-me');

    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((json) => NoteModel.fromJson(json)).toList();
    } else {
      throw Exception(
          'Failed to load shared notes: ${response.statusCode} - ${response.body}');
    }
  }

  // Leave a shared note
  Future<NoteModel> leaveSharedNote(int noteId) async {
    final url = _getNotesUrl('$noteId/leave');

    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode == 200) {
      return NoteModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception(
          'Failed to leave note: ${response.statusCode} - ${response.body}');
    }
  }

  // Pin/unpin a note
  Future<void> togglePin(int noteId) async {
    final url = _getNotesUrl('$noteId/pin');

    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode != 200) {
      throw Exception(
          'Failed to toggle pin: ${response.statusCode} - ${response.body}');
    }
  }

  // Archive/unarchive a note
  Future<void> toggleArchive(int noteId) async {
    final url = _getNotesUrl('$noteId/archive');

    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse(url),
      headers: headers,
    );

    if (response.statusCode != 200) {
      throw Exception(
          'Failed to toggle archive: ${response.statusCode} - ${response.body}');
    }
  }
}