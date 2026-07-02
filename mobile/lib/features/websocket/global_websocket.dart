import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/core/constants/api_constants.dart';

class GlobalWebsocket {
  final StorageService storageService;

  WebSocketChannel? _channel;
  Stream<Map<String, dynamic>>? _stream;
  Timer? _pingTimer;
  bool _isConnected = false;

  GlobalWebsocket({required this.storageService});

  Future<void> connect() async {
    final token = storageService.getToken();
    if (token == null) throw Exception('User not authenticated');

    final url = Uri.parse(
      '${ApiConstants.wsBaseUrl}/api/v1/ws/global?token=$token',
    );

    _channel = WebSocketChannel.connect(url);

    await _channel!.ready;

    _isConnected = true;

    _stream = _channel!.stream
        .map((event) => jsonDecode(event) as Map<String, dynamic>)
        .asBroadcastStream();

    _stream!.listen(
      (event) {
        print("WS EVENT: $event");
      },
      onError: (e) {
        _handleDisconnect();
      },
      onDone: () {
        _handleDisconnect();
      },
    );
  }

  void startHeartbeat({Duration interval = const Duration(seconds: 30)}) {
    _pingTimer?.cancel();

    _pingTimer = Timer.periodic(interval, (timer) {
      sendPing();
    });
  }

  void sendPing() {
    if (!_isConnected || _channel == null) return;

    send({"type": "ping"});
  }

  void send(Map<String, dynamic> data) {
    _channel?.sink.add(jsonEncode(data));
  }

  void _handleDisconnect() {
    _isConnected = false;
    stopHeartbeat();
  }

  void stopHeartbeat() {
    _pingTimer?.cancel();
    _pingTimer = null;
  }

  Stream<Map<String, dynamic>> get stream {
    if (_stream == null) throw Exception("Not connected");
    return _stream!;
  }

  void disconnect() {
    _handleDisconnect();
    try {
      _channel?.sink.close();
    } catch (e) {
      print("WS close error: $e");
    }
    _channel = null;
    _stream = null;
  }
}
