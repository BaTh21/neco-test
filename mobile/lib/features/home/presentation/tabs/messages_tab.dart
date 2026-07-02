// lib/features/home/presentation/tabs/messages_tab.dart
import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';
import 'package:whisper_space_flutter/features/chat/chat_screen.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';

class MessagesTab extends StatelessWidget {
  final GlobalWebsocket ws;

  final Function(
    CallStatus status, {
    String? userName,
    String? avatar,
    bool isVideo,
  }) onCallStateChanged;

  const MessagesTab({
    super.key,
    required this.ws,
    required this.onCallStateChanged,
  });
  @override
  Widget build(BuildContext context) => ChatScreen(
        ws: ws,
        onCallStateChanged: onCallStateChanged,
      );
}
