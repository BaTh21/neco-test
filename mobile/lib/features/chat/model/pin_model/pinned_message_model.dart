class AuthorModel {
  final int id;
  final String username;
  final String? avatarUrl;

  AuthorModel({
    required this.id,
    required this.username,
    this.avatarUrl,
  });

  factory AuthorModel.fromJson(Map<String, dynamic> json) {
    return AuthorModel(
      id: json['id'],
      username: json['username'],
      avatarUrl: json['avatar_url'],
    );
  }
}

class PinnedMessageModel {
  final int id;
  final String content;
  final String messageType;
  final DateTime pinnedAt;
  final AuthorModel? sender;
  final AuthorModel? pinnedByUser;

  PinnedMessageModel({
    required this.id,
    required this.content,
    required this.messageType,
    required this.pinnedAt,
    this.sender,
    this.pinnedByUser,
  });

  factory PinnedMessageModel.fromJson(Map<String, dynamic> json) {
    return PinnedMessageModel(
      id: json['id'],
      content: json['content'],
      messageType: json['message_type'] ?? 'text',
      pinnedAt: DateTime.parse(json['pinned_at']),
      sender:
          json['sender'] != null ? AuthorModel.fromJson(json['sender']) : null,
      pinnedByUser: json['pinned_by_user'] != null
          ? AuthorModel.fromJson(json['pinned_by_user'])
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'content': content,
      'message_type': messageType,
      'pinned_at': pinnedAt.toIso8601String(),
      'sender': sender != null
          ? {
              'id': sender!.id,
              'username': sender!.username,
              'avatar_url': sender!.avatarUrl,
            }
          : null,
      'pinned_by_user': pinnedByUser != null
          ? {
              'id': pinnedByUser!.id,
              'username': pinnedByUser!.username,
              'avatar_url': pinnedByUser!.avatarUrl,
            }
          : null,
    };
  }
}
