class ReplyMessage {
  final int id;
  final int senderId;
  final String senderUsername;
  final String content;
  final String messageType;
  final DateTime? createdAt;
  final double? voiceDuration;
  final int? fileSize;

  ReplyMessage({
    required this.id,
    required this.senderId,
    required this.senderUsername,
    required this.content,
    required this.messageType,
    this.createdAt,
    this.voiceDuration,
    this.fileSize,
  });

  factory ReplyMessage.fromJson(Map<String, dynamic> json) {
    return ReplyMessage(
      id: json['id'],
      senderId: json['sender_id'] ?? 0,
      senderUsername: json['sender_username'] ?? 'Unknown',
      content: json['content'] ?? '',
      messageType: json['message_type'] ?? 'text',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      voiceDuration: json['voice_duration'] != null
          ? (json['voice_duration'] as num).toDouble()
          : null,
      fileSize: json['file_size'],
    );
  }
}

class Reaction {
  final String emoji;
  final int count;
  final List<int> userIds;

  Reaction({
    required this.emoji,
    required this.count,
    required this.userIds,
  });

  factory Reaction.fromJson(Map<String, dynamic> json) {
    return Reaction(
      emoji: json['emoji'],
      count: json['count'] ?? 0,
      userIds: (json['user_ids'] as List<dynamic>? ?? [])
          .map((e) => e as int)
          .toList(),
    );
  }
}

class PrivateMessageModel {
  final int id;
  final int senderId;
  final int receiverId;
  final String? content;
  final String? messageType;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isRead;
  final String? tempId;
  final String? senderUsername;
  final String? receiverUsername;
  final double? voiceDuration;
  final int? fileSize;
  final bool isEdited;

  final MessageStatus status;

  final int? replyToId;
  final ReplyMessage? replyTo;

  final bool isForwarded;
  final int? forwardedFromId;
  final String? originalSender;
  final String? originalSenderAvatar;
  final List<Reaction> reactions;

  PrivateMessageModel({
    required this.id,
    required this.senderId,
    required this.receiverId,
    this.content,
    this.messageType,
    required this.createdAt,
    this.updatedAt,
    required this.isRead,
    this.tempId,
    this.senderUsername,
    this.receiverUsername,
    this.voiceDuration,
    this.fileSize,
    this.status = MessageStatus.sent,
    this.isEdited = false,
    this.replyToId,
    this.replyTo,
    this.isForwarded = false,
    this.forwardedFromId,
    this.originalSender,
    this.originalSenderAvatar,
    this.reactions = const [],
  });

  factory PrivateMessageModel.fromJson(Map<String, dynamic> json) {
    final isRead = json['is_read'] ?? false;

    return PrivateMessageModel(
      id: json['id'],
      senderId: json['sender_id'],
      receiverId: json['receiver_id'],
      content: json['content'],
      messageType: json['message_type'] ?? 'text',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now().toUtc(),
      updatedAt:
          json['edited_at'] != null ? DateTime.parse(json['edited_at']) : null,
      isEdited: json['edited_at'] != null,
      isRead: isRead,
      status: isRead ? MessageStatus.read : MessageStatus.sent,
      tempId: json['temp_id'],
      senderUsername: json['sender_username'],
      receiverUsername: json['receiver_username'],
      voiceDuration: json['voice_duration'] != null
          ? (json['voice_duration'] as num).toDouble()
          : null,
      fileSize: json['file_size'],
      replyToId: json['reply_to_id'],
      replyTo: json['reply_to'] is Map<String, dynamic>
          ? ReplyMessage.fromJson(json['reply_to'])
          : null,
      isForwarded: json['is_forwarded'] ?? false,
      forwardedFromId: json['forwarded_from_id'],
      originalSender: json['original_sender'],
      originalSenderAvatar: json['original_sender_avatar'],
      reactions: (json['reactions'] as List<dynamic>? ?? [])
          .map((e) => Reaction.fromJson(e))
          .toList(),
    );
  }

  PrivateMessageModel copyWith({
    int? id,
    MessageStatus? status,
    String? content,
    DateTime? updatedAt,
    bool? isEdited,
    String? messageType,
    double? voiceDuration,
    int? fileSize,
    String? tempId,
    int? replyToId,
    ReplyMessage? replyTo,
    bool? isForwarded,
    int? forwardedFromId,
    String? originalSender,
    String? originalSenderAvatar,
    bool? isRead,
    List<Reaction>? reactions,
  }) {
    return PrivateMessageModel(
      id: id ?? this.id,
      senderId: senderId,
      receiverId: receiverId,
      content: content ?? this.content,
      messageType: messageType ?? this.messageType,
      createdAt: createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isRead: isRead ?? this.isRead,
      tempId: tempId ?? this.tempId,
      senderUsername: senderUsername,
      receiverUsername: receiverUsername,
      voiceDuration: voiceDuration ?? this.voiceDuration,
      fileSize: fileSize ?? this.fileSize,
      status: status ?? this.status,
      isEdited: isEdited ?? this.isEdited,
      replyToId: replyToId ?? this.replyToId,
      replyTo: replyTo ?? this.replyTo,
      isForwarded: isForwarded ?? this.isForwarded,
      forwardedFromId: forwardedFromId ?? this.forwardedFromId,
      originalSender: originalSender ?? this.originalSender,
      originalSenderAvatar: originalSenderAvatar ?? this.originalSenderAvatar,
      reactions: reactions ?? this.reactions,
    );
  }

  bool get isImage => messageType == 'image';
  bool get isVideo => messageType == 'video';
  bool get isAudio => messageType == 'voice';
  bool get isText => messageType == 'text';
  bool get isFile => messageType == 'file';
  bool get hasFile => isImage || isVideo || isAudio || isFile;
  bool get hasForwardInfo => isForwarded && originalSender != null;

  bool get hasReactions => reactions.isNotEmpty;

  bool hasUserReacted(int userId, String emoji) {
    return reactions.any(
      (r) => r.emoji == emoji && r.userIds.contains(userId),
    );
  }

  int getReactionCount(String emoji) {
    return reactions
        .firstWhere(
          (r) => r.emoji == emoji,
          orElse: () => Reaction(emoji: emoji, count: 0, userIds: []),
        )
        .count;
  }
}

enum MessageStatus { sending, sent, delivered, read, failed }
