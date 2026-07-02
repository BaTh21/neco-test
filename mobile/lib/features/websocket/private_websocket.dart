import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/core/constants/api_constants.dart';

class PrivateWebsocket {
  final int friendId;
  final StorageService storageService;
  WebSocketChannel? webSocketChannel;
  Stream<Map<String, dynamic>>? _broadcastStream;
  Timer? _heartbeatTimer;

  PrivateWebsocket({required this.friendId, required this.storageService});

  Future<WebSocketChannel> connect() async {
    final token = storageService.getToken();
    if (token == null) throw Exception("User is not authenticated");

    final url = Uri.parse(
        '${ApiConstants.wsBaseUrl}/api/v1/ws/private/$friendId?token=$token');

    webSocketChannel = WebSocketChannel.connect(url);

    _broadcastStream = webSocketChannel!.stream.map((event) {
      final decoded = jsonDecode(event);
      if (decoded is Map<String, dynamic>) return decoded;
      throw Exception('Invalid message format');
    }).asBroadcastStream();

    _broadcastStream!.listen(
      (event) {
        if (event['type'] == 'pong') return;
        print('WS GET: $event');
      },
      onError: (err) => print('WS ERROR: $err'),
      onDone: () {
        print('WS CLOSED');
        _stopHeartbeat();
      },
    );

    _startHeartbeat();

    return webSocketChannel!;
  }

  Stream<Map<String, dynamic>> get messages {
    if (_broadcastStream == null) throw Exception("WebSocket not connected");
    return _broadcastStream!;
  }

  void sendText(
      {required String content, required String tempId, int? replyToId}) {
    if (webSocketChannel == null) {
      throw Exception("WebSocket not connected");
    }

    if (content.trim().isEmpty) return;

    webSocketChannel!.sink.add(jsonEncode({
      "type": "message",
      "content": content,
      "message_type": "text",
      "temp_id": tempId,
      "reply_to_id": replyToId
    }));
  }

  void editMessage({required int messageId, required String newContent}) {
    if (webSocketChannel == null) {
      throw Exception("WebSocket not connected");
    }

    webSocketChannel!.sink.add(jsonEncode({
      "type": "edit",
      "message_id": messageId,
      "new_content": newContent,
    }));
  }

  void deleteMessage({required int messageId}) {
    if (webSocketChannel == null) {
      throw Exception("WebSocket not connected");
    }

    webSocketChannel!.sink
        .add(jsonEncode({"type": "delete", "message_id": messageId}));
  }

  void forwardMessage(int messageId, Set<int> users, Set<int> groups) {
    if (webSocketChannel == null) {
      throw Exception("WebSocket not connected");
    }

    webSocketChannel!.sink.add(jsonEncode({
      "type": "forward",
      "message_id": messageId,
      "targets": {"users": users.toList(), "groups": groups.toList()}
    }));
  }

  void _startHeartbeat() {
    _heartbeatTimer = Timer.periodic(Duration(seconds: 30), (_) {
      if (webSocketChannel != null) {
        webSocketChannel!.sink.add(jsonEncode({"type": "heartbeat"}));
      }
    });
  }

  void _stopHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  Future<void> disconnect() async {
    _stopHeartbeat();
    await webSocketChannel?.sink.close();
    webSocketChannel = null;
  }
}
