// lib/features/notes/data/models/friend_model.dart
class FriendModel {
  final int id;
  final String username;
  final String email;
  final String? avatarUrl;

  FriendModel({
    required this.id,
    required this.username,
    required this.email,
    this.avatarUrl,
  });

  factory FriendModel.fromJson(Map<String, dynamic> json) {
    return FriendModel(
      id: json['id'],
      username: json['username'],
      email: json['email'],
      avatarUrl: json['avatar_url'],
    );
  }
}