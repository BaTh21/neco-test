// lib/features/home/presentation/tabs/friends_tab.dart
import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';
import 'package:whisper_space_flutter/features/friend/presentation/screens/friend_screen.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';

class FriendsTab extends StatelessWidget {
  final GlobalWebsocket ws;
  final Function(
    CallStatus status, {
    String? userName,
    String? avatar,
    bool isVideo,
  }) onCallStateChanged;

  const FriendsTab({super.key, required this.ws, required this.onCallStateChanged});
  @override
  Widget build(BuildContext context) => FriendScreen(ws: ws, onCallStateChanged: onCallStateChanged);
}
