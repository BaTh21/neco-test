class AuthorModel {
  final int id;
  final String username;
  final String? avatar;

  AuthorModel({
    required this.id,
    required this.username,
    this.avatar,
  });

  factory AuthorModel.fromJson(Map<String, dynamic> json) {
    return AuthorModel(
      id: json['id'] ?? 0,
      username: json['username'] ?? 'Unknown',
      avatar: json['avatar_url'],
    );
  }
}

class SeenMessageModel {
  final int id;
  final AuthorModel? user;
  final DateTime seenAt;

  SeenMessageModel({
    required this.id,
    this.user,
    required this.seenAt,
  });

  factory SeenMessageModel.fromJson(Map<String, dynamic> json) {
    return SeenMessageModel(
      id: json['id'] ?? 0,
      user: json['user'] is Map<String, dynamic>
          ? AuthorModel.fromJson(json['user'])
          : null,
      seenAt: DateTime.tryParse(json['seen_at'] ?? '') ?? DateTime.now(),
    );
  }
}

class ParentMessageModel {
  final int id;
  final AuthorModel sender;
  final String? content;
  final String? callContent;
  final String? fileUrl;
  final String? voiceUrl;
  final String? type;

  ParentMessageModel(
      {required this.id,
      required this.sender,
      this.content,
      this.callContent,
      this.fileUrl,
      this.voiceUrl,
      this.type});

  factory ParentMessageModel.fromJson(Map<String, dynamic> json) {
    return ParentMessageModel(
      id: json['id'],
      sender: AuthorModel.fromJson(json['sender']),
      content: json['content'],
      callContent: json['call_content'],
      fileUrl: json['file_url'],
      voiceUrl: json['voice_url'],
      type: json['message_type'],
    );
  }
}

class GroupMessageModel {
  final int id;
  final String? incomingTempId;
  final AuthorModel sender;
  final AuthorModel? forwardedBy;
  final int groupId;
  final String? content;
  final String? callContent;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final String? fileUrl;
  final String? voiceUrl;
  final List<SeenMessageModel>? seenBy;
  final String? tempId;
  final ParentMessageModel? parentMessage;
  final String? type;
  final bool isUploading;
  final Map<String, int>? reactionSummary;
  final String? myReaction;

  GroupMessageModel(
      {required this.id,
      this.incomingTempId,
      required this.sender,
      this.forwardedBy,
      required this.groupId,
      this.content,
      this.callContent,
      required this.createdAt,
      this.updatedAt,
      this.fileUrl,
      this.voiceUrl,
      this.seenBy,
      this.tempId,
      this.parentMessage,
      this.type,
      this.isUploading = false,
      this.reactionSummary,
      this.myReaction});

  /// Optimistic message (before server response)
  factory GroupMessageModel.temp({
    required String tempId,
    required String content,
    required AuthorModel sender,
    required int groupId,
  }) {
    return GroupMessageModel(
      id: -1,
      tempId: tempId,
      sender: sender,
      groupId: groupId,
      content: content,
      createdAt: DateTime.now(),
      isUploading: true,
    );
  }

  static final deletedUser = AuthorModel(id: 0, username: 'Deleted user');

  factory GroupMessageModel.fromJson(
    Map<String, dynamic> json, {
    int? fallbackGroupId,
  }) {
    return GroupMessageModel(
      id: json['id'] ?? -1,
      incomingTempId: json['incoming_temp_id'],
      groupId: json['group_id'] ?? fallbackGroupId ?? 0,
      sender: json['sender'] != null
          ? AuthorModel.fromJson(json['sender'])
          : deletedUser,
      forwardedBy: json['forwarded_by'] != null
          ? AuthorModel.fromJson(json['forwarded_by'])
          : null,
      content: json['content'],
      callContent: json['call_content'],
      createdAt: DateTime.tryParse(json['created_at'] ?? '') ?? DateTime.now(),
      updatedAt: DateTime.tryParse(json['updated_at'] ?? ''),
      fileUrl: json['file_url'],
      voiceUrl: json['voice_url'],
      seenBy: (json['seen_by'] is List)
          ? (json['seen_by'] as List)
              .whereType<Map<String, dynamic>>()
              .map((e) => SeenMessageModel.fromJson(e))
              .toList()
          : [],
      tempId: json['temp_id']?.toString(),
      parentMessage: json['parent_message'] != null
          ? ParentMessageModel.fromJson(json['parent_message'])
          : null,
      type: json['message_type'],
      isUploading: false,
      reactionSummary: (json['reaction_summary'] is Map)
          ? Map<String, int>.from(json['reaction_summary'])
          : {},
      myReaction: json['my_reaction'],
    );
  }

  GroupMessageModel copyWith({
    int? id,
    String? content,
    String? callContent,
    String? fileUrl,
    String? voiceUrl,
    DateTime? createdAt,
    DateTime? updatedAt,
    List<SeenMessageModel>? seenBy,
    String? type,
    AuthorModel? forwardedBy,
    String? tempId,
    ParentMessageModel? parentMessage,
    bool? isUploading,
    AuthorModel? sender,
    Map<String, int>? reactionSummary,
    String? myReaction,
  }) {
    return GroupMessageModel(
      id: id ?? this.id,
      incomingTempId: incomingTempId,
      sender: sender ?? this.sender,
      forwardedBy: forwardedBy ?? this.forwardedBy,
      groupId: groupId,
      content: content ?? this.content,
      callContent: callContent ?? this.callContent,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      fileUrl: fileUrl ?? this.fileUrl,
      voiceUrl: voiceUrl ?? this.voiceUrl,
      seenBy: seenBy ?? this.seenBy,
      tempId: tempId ?? this.tempId,
      parentMessage: parentMessage ?? this.parentMessage,
      type: type ?? this.type,
      isUploading: isUploading ?? this.isUploading,
      reactionSummary: reactionSummary ?? this.reactionSummary,
      myReaction: myReaction ?? this.myReaction,
    );
  }
}
