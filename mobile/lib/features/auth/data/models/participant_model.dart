import 'dart:convert';
import 'package:livekit_client/livekit_client.dart';

class ParticipantInfo {
  final String userId;
  final String username;
  final String avatarUrl;

  ParticipantInfo({
    required this.userId,
    required this.username,
    required this.avatarUrl,
  });

  factory ParticipantInfo.fromParticipant(
    Participant participant,
  ) {
    Map<String, dynamic> metadata = {};

    try {
      final raw = participant.metadata;

      if (raw != null && raw.isNotEmpty) {
        metadata = jsonDecode(raw);
      }
    } catch (e) {
      print("Failed to parse participant metadata: $e");
    }

    return ParticipantInfo(
      userId: metadata["user_id"]?.toString() ?? "",
      username: metadata["username"] ?? participant.name,
      avatarUrl: metadata["avatar_url"] ?? "",
    );
  }
}