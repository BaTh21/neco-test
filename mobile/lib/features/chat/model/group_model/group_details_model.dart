import './group_image_model.dart';

class PinnedMessageModel {
  final int id;
  final String? content;
  final String? messageType;
  final int? senderId;
  final int? pinnedById;
  final String? pinnedBy;
  final DateTime? pinnedAt;

  PinnedMessageModel({
    required this.id,
    this.content,
    this.messageType,
    this.senderId,
    this.pinnedById,
    this.pinnedBy,
    this.pinnedAt,
  });

  factory PinnedMessageModel.fromJson(Map<String, dynamic> json) {
    return PinnedMessageModel(
      id: json['id'],
      content: json['content'],
      messageType: json['message_type'],
      senderId: json['sender_id'],
      pinnedById: json['pinned_by_id'],
      pinnedBy: json['pinned_by'],
      pinnedAt: json['pinned_at'] != null
          ? DateTime.tryParse(json['pinned_at'])
          : null,
    );
  }
}

class GroupDetailsModel {
  final int id;
  final String name;
  final int creatorId;
  final String? description;
  List<GroupImage> images;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final PinnedMessageModel? pinnedMessage;

  GroupDetailsModel(
      {required this.id,
      required this.name,
      required this.creatorId,
      this.description,
      List<GroupImage>? images,
      this.createdAt,
      this.updatedAt,
      this.pinnedMessage})
      : images = images ?? [];

  factory GroupDetailsModel.fromJson(Map<String, dynamic> json) {
    final imagesRaw = json['images'];
    List<GroupImage> parsedImages = [];

    if (imagesRaw is List) {
      parsedImages = imagesRaw
          .map((e) => e is Map<String, dynamic> ? GroupImage.fromJson(e) : null)
          .whereType<GroupImage>()
          .toList();
    } else if (imagesRaw is Map<String, dynamic>) {
      parsedImages = [GroupImage.fromJson(imagesRaw)];
    }

    return GroupDetailsModel(
      id: json['id'] is int
          ? json['id']
          : int.tryParse(json['id'].toString()) ?? 0,
      name: json['name'] ?? '',
      creatorId: json['creator_id'] is int
          ? json['creator_id']
          : int.tryParse(json['creator_id'].toString()) ?? 0,
      description: json['description'],
      images: parsedImages,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'])
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
      pinnedMessage: json['pinned_message'] is Map<String, dynamic>
          ? PinnedMessageModel.fromJson(json['pinned_message'])
          : null,
    );
  }

  String? get cover => images.isNotEmpty ? images.first.url : null;
}
