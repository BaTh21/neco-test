import 'package:flutter/material.dart';

enum ShareType {
  private,
  shared;

  static ShareType fromString(String value) {
    switch (value) {
      case 'shared':
        return ShareType.shared;
      default:
        return ShareType.private;
    }
  }

  String get value {
    switch (this) {
      case ShareType.shared:
        return 'shared';
      case ShareType.private:
        return 'private';
    }
  }
}

class UserResponse {
  final int id;
  final String username;
  final String? avatarUrl;

  UserResponse({
    required this.id,
    required this.username,
    this.avatarUrl,
  });

  factory UserResponse.fromJson(Map<String, dynamic> json) {
    return UserResponse(
      id: json['id'] ?? 0,
      username: json['username'] ?? '',
      avatarUrl: json['avatar_url'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'username': username,
      'avatar_url': avatarUrl,
    };
  }
}

class NoteModel {
  final int id;
  final String title;
  final String? content;
  final int userId;
  final UserResponse user;
  final bool isPinned;
  final bool isArchived;
  final Color color;
  final ShareType shareType;
  final List<int> sharedWith;
  final bool canEdit;
  final DateTime createdAt;
  final DateTime? updatedAt;

  NoteModel({
    required this.id,
    required this.title,
    this.content,
    required this.userId,
    required this.user,
    required this.isPinned,
    required this.isArchived,
    required this.color,
    required this.shareType,
    required this.sharedWith,
    required this.canEdit,
    required this.createdAt,
    this.updatedAt,
  });

  factory NoteModel.fromJson(Map<String, dynamic> json) {
    return NoteModel(
      id: json['id'] ?? 0,
      title: json['title'] ?? 'Untitled',
      content: json['content'],
      userId: json['user_id'] ?? 0,
      user: json['user'] != null
          ? UserResponse.fromJson(json['user'])
          : UserResponse(id: 0, username: 'Unknown'),
      isPinned: json['is_pinned'] ?? false,
      isArchived: json['is_archived'] ?? false,
      color: _parseColor(json['color'] ?? '#ffffff'),
      shareType: ShareType.fromString(json['share_type'] ?? 'private'),
      sharedWith: _parseIntList(json['shared_with']),
      canEdit: json['can_edit'] ?? false,
      createdAt: _parseDateTime(json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTime(json['updated_at']),
    );
  }

  static List<int> _parseIntList(dynamic value) {
    if (value == null) return [];
    if (value is List) {
      return value.map((e) {
        if (e is int) return e;
        if (e is String) return int.tryParse(e) ?? 0;
        if (e is double) return e.toInt();
        return 0;
      }).toList();
    }
    return [];
  }

  static DateTime? _parseDateTime(String? dateTimeString) {
    if (dateTimeString == null) return null;
    final parsed = DateTime.tryParse(dateTimeString);
    if (parsed == null) return null;
    return parsed.toLocal();
  }

  static Color _parseColor(String hexColor) {
    try {
      hexColor = hexColor.toUpperCase().replaceAll('#', '');
      if (hexColor.length == 6) {
        hexColor = 'FF$hexColor';
      }
      return Color(int.parse(hexColor, radix: 16));
    } catch (e) {
      return Colors.white;
    }
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'content': content,
      'user_id': userId,
      'user': user.toJson(),
      'is_pinned': isPinned,
      'is_archived': isArchived,
      'color': '#${color.value.toRadixString(16).substring(2)}',
      'share_type': shareType.value,
      'shared_with': sharedWith,
      'can_edit': canEdit,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  NoteModel copyWith({
    int? id,
    String? title,
    String? content,
    int? userId,
    UserResponse? user,
    bool? isPinned,
    bool? isArchived,
    Color? color,
    ShareType? shareType,
    List<int>? sharedWith,
    bool? canEdit,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return NoteModel(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      userId: userId ?? this.userId,
      user: user ?? this.user,
      isPinned: isPinned ?? this.isPinned,
      isArchived: isArchived ?? this.isArchived,
      color: color ?? this.color,
      shareType: shareType ?? this.shareType,
      sharedWith: sharedWith ?? this.sharedWith,
      canEdit: canEdit ?? this.canEdit,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

class PublicNoteModel {
  final int id;
  final String title;
  final String? content;
  final Color color;
  final DateTime createdAt;
  final DateTime? updatedAt;

  PublicNoteModel({
    required this.id,
    required this.title,
    this.content,
    required this.color,
    required this.createdAt,
    this.updatedAt,
  });

  factory PublicNoteModel.fromJson(Map<String, dynamic> json) {
    return PublicNoteModel(
      id: json['id'],
      title: json['title'],
      content: json['content'],
      color: _parseColor(json['color'] ?? '#ffffff'),
      createdAt: _parseDateTime(json['created_at']) ?? DateTime.now(),
      updatedAt: _parseDateTime(json['updated_at']),
    );
  }

  static Color _parseColor(String hexColor) {
    try {
      hexColor = hexColor.toUpperCase().replaceAll('#', '');
      if (hexColor.length == 6) hexColor = 'FF$hexColor';
      return Color(int.parse(hexColor, radix: 16));
    } catch (e) {
      return Colors.white;
    }
  }

  static DateTime? _parseDateTime(String? dateTimeString) {
    if (dateTimeString == null) return null;
    final parsed = DateTime.tryParse(dateTimeString);
    if (parsed == null) return null;
    return parsed.toLocal();
  }
}