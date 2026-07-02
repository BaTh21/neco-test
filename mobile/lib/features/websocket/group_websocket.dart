import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/core/constants/api_constants.dart';

class GroupWebsocket {
  final int groupId;
  final StorageService storageService;
  WebSocketChannel? _channel;
  Stream<Map<String, dynamic>>? _broadcastStream;
  Timer? _pingTimer;
  bool _isConnected = false;

  GroupWebsocket({required this.groupId, required this.storageService});

  Future<WebSocketChannel> connect() async {
    final token = storageService.getToken();
    if (token == null) throw Exception('User is not authenticated');

    final url = Uri.parse(
      '${ApiConstants.wsBaseUrl}/api/v1/ws/group/$groupId?token=$token',
    );

    _channel = WebSocketChannel.connect(url);
    _isConnected = true;

    _broadcastStream = _channel!.stream
        .map((event) => jsonDecode(event) as Map<String, dynamic>)
        .asBroadcastStream();

    _broadcastStream!.listen(
      (event) => print('WS DATA: $event'),
      onError: (err) {
        print('WS ERROR: $err');
        _handleDisconnect();
      },
      onDone: () {
        print('WS CLOSED');
        _handleDisconnect();
      },
    );

    return _channel!;
  }

  void _handleDisconnect() {
    _isConnected = false;
    stopHeartbeat();
  }

  void startHeartbeat({Duration interval = const Duration(seconds: 30)}) {
    _pingTimer?.cancel();
    _pingTimer = Timer.periodic(interval, (timer) {
      if (!_isConnected) {
        timer.cancel();
        return;
      }
      sendPing();
    });
  }

  void stopHeartbeat() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  void send(Map<String, dynamic> data) {
    _channel?.sink.add(jsonEncode(data));
  }

  void sendMessage(String content, String? replyTo, {String? tempId}) {
    send({
      "message_type": "text",
      "reply_to": replyTo,
      "content": content,
      "temp_id": tempId ?? DateTime.now().millisecondsSinceEpoch.toString(),
    });
  }

  void sendEditMessage(int messageId, String newContent) {
    send({
      "action": "edit",
      "message_id": messageId,
      "new_content": newContent,
    });
  }

  void sendDeleteMessage(int messageId) {
    send({"action": "delete", "message_id": messageId});
  }

  void sendForward(int messageId, Set<int> users, Set<int> groups) {
    send({
      "action": "forward",
      "message_id": messageId,
      "targets": {
        "users": users.toList(),
        "groups": groups.toList(),
      }
    });
  }

  void sendPing() {
    if (!_isConnected || _channel == null) return;
    send({"action": "ping"});
  }

  void requestOnlineUsers() => send({"action": "online_users"});

  Stream<Map<String, dynamic>> get stream {
    if (_broadcastStream == null) {
      throw Exception('WebSocket not connected yet');
    }
    return _broadcastStream!;
  }

  void disconnect() {
    _handleDisconnect();
    _channel?.sink.close();
    _channel = null;
    _broadcastStream = null;
  }
}
