import 'dart:async';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:just_audio/just_audio.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:record/record.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';

import '../../chat_api_service.dart';
import '../../model/private_message_model/private_message_model.dart';
import 'widgets/message_bubble.dart';
import 'widgets/voice_recorder_widget.dart';
import '../private/user_profile_screen.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';
import 'package:provider/provider.dart';
import 'package:awesome_emoji_picker/awesome_emoji_picker.dart';

import 'package:whisper_space_flutter/features/websocket/private_websocket.dart';
import 'package:whisper_space_flutter/features/chat/screens/group/group_dialog/forward_dialog.dart';
import 'package:whisper_space_flutter/features/chat/model/pin_model/pinned_message_model.dart';
import 'package:file_picker/file_picker.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';
import 'package:flutter/services.dart';

enum MessageType { text, image, video, voice, file }

class PrivateChatScreen extends StatefulWidget {
  final int userId;
  final String userName;
  final String? avatarUrl;
  final VoidCallback? onChatUpdated;
  final GlobalWebsocket globalWebsocket;
  final Function(
    CallStatus status, {
    String? userName,
    String? avatar,
    bool isVideo,
  }) onCallStateChanged;

  const PrivateChatScreen(
      {super.key,
      required this.userId,
      required this.userName,
      this.avatarUrl,
      this.onChatUpdated,
      required this.globalWebsocket,
      required this.onCallStateChanged});

  @override
  State<PrivateChatScreen> createState() => _PrivateChatScreenState();
}

class _PrivateChatScreenState extends State<PrivateChatScreen> {
  late ChatAPISource chatApi;
  late StorageService storageService;
  late TextEditingController _messageController;
  late ScrollController _scrollController;

  List<PrivateMessageModel> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  int? _currentUserId;

  final ImagePicker _imagePicker = ImagePicker();
  final AudioPlayer _audioPlayer = AudioPlayer();
  final AudioRecorder _audioRecorder = AudioRecorder();
  String? _currentlyPlayingId;
  double _currentPlayingProgress = 0.0;
  Timer? _playbackTimer;

  final Set<String> _failedTempIds = {};
  bool _showEmojiPicker = false;

  late PrivateWebsocket _ws;
  PrivateMessageModel? _editingMessage;
  PrivateMessageModel? _replyingMessage;
  PinnedMessageModel? _pinnedMessage;

  @override
  void initState() {
    super.initState();
    _messageController = TextEditingController();
    _scrollController = ScrollController();

    _messageController.addListener(() {
      setState(() {});
    });

    _loadCurrentUser();
    _initServices();

    _audioPlayer.playerStateStream.listen((state) {
      if (state.processingState == ProcessingState.completed) {
        _stopPlayback();
      }
    });
    _audioPlayer.positionStream.listen((position) {
      if (mounted &&
          _currentlyPlayingId != null &&
          _audioPlayer.duration != null) {
        final progress =
            position.inMilliseconds / _audioPlayer.duration!.inMilliseconds;
        setState(() => _currentPlayingProgress = progress);
      }
    });
  }

  Future<void> _initServices() async {
    storageService = StorageService();
    await storageService.init();
    chatApi = ChatAPISource(storageService: storageService);
    await _loadMessages();
    _loadPinnedMessage();

    _ws = PrivateWebsocket(
        friendId: widget.userId, storageService: storageService);
    await _connectWebsocket();
  }

  void _loadCurrentUser() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final user = authProvider.currentUser;
      if (user != null) {
        setState(() {
          _currentUserId = user.id;
        });
      }
    });
  }

  Future<void> _loadMessages() async {
    try {
      final messages = await chatApi.getPrivateMessages(
        userId: widget.userId,
        limit: 50,
      );
      if (mounted) {
        setState(() {
          _messages = messages.reversed.toList();
          _isLoading = false;
        });
        _scrollToBottom();
      }
    } catch (e, stack) {
      print('❌ LOAD MESSAGES ERROR: $e');
      print(stack);
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _loadPinnedMessage() async {
    final pinnedMessage = await chatApi.getPinnedMessage(widget.userId);
    setState(() {
      _pinnedMessage = pinnedMessage;
    });

    print("pinned message $pinnedMessage");
  }

  void _stopPlayback() {
    setState(() {
      _currentlyPlayingId = null;
      _currentPlayingProgress = 0.0;
    });
    _playbackTimer?.cancel();
    _playbackTimer = null;
  }

  void _playAudio(String url, String messageId) async {
    if (_currentlyPlayingId == messageId) {
      await _audioPlayer.stop();
      _stopPlayback();
    } else {
      await _audioPlayer.stop();
      _stopPlayback();
      await _audioPlayer.setAudioSource(AudioSource.uri(Uri.parse(url)));
      await _audioPlayer.play();
      setState(() {
        _currentlyPlayingId = messageId;
        _currentPlayingProgress = 0.0;
      });
      _playbackTimer =
          Timer.periodic(const Duration(milliseconds: 100), (timer) {
        if (_audioPlayer.position >= _audioPlayer.duration!) {
          _stopPlayback();
          timer.cancel();
        }
      });
    }
  }

  Future<void> _sendMessage({
    String? content,
    File? file,
    String? fileType,
    Duration? voiceDuration,
    int? replyToId,
  }) async {
    final text = content?.trim();

    if ((text == null || text.isEmpty) && file == null) return;

    if (_editingMessage != null && text != null && text.isNotEmpty) {
      try {
        _ws.editMessage(
          messageId: _editingMessage!.id,
          newContent: text,
        );

        setState(() {
          _editingMessage = null;
          _messageController.clear();
        });
      } catch (e) {
        debugPrint("Edit failed: $e");
      }
      return;
    }

    setState(() => _isSending = true);

    final tempId = DateTime.now().millisecondsSinceEpoch.toString();

    final durationSeconds =
        voiceDuration != null ? voiceDuration.inMilliseconds / 1000.0 : null;

    String? tempContent;
    if (file != null) {
      tempContent = file.path;
    } else {
      tempContent = text;
    }

    final tempMessage = PrivateMessageModel(
      id: 0,
      senderId: _currentUserId ?? 0,
      receiverId: widget.userId,
      content: tempContent,
      messageType: fileType == 'audio' ? 'voice' : fileType,
      createdAt: DateTime.now(),
      isRead: false,
      tempId: tempId,
      status: MessageStatus.sending,
      voiceDuration: durationSeconds,
      replyToId: replyToId,
      replyTo: _replyingMessage != null
          ? ReplyMessage(
              id: _replyingMessage!.id,
              senderId: _currentUserId ?? 0,
              senderUsername: _replyingMessage!.senderUsername ?? "You",
              content: _replyingMessage!.content ?? "[Attachment]",
              messageType: _replyingMessage!.messageType ?? "text",
            )
          : null,
    );

    setState(() => _messages.add(tempMessage));
    _scrollToBottom();

    try {
      if (file != null) {
        final fileSize = await file.length();

        if (fileSize > 15 * 1024 * 1024) {
          throw Exception("File too large");
        }

        if (fileType == 'audio') {
          await chatApi.uploadPrivateVoice(
            receiverId: widget.userId,
            file: file,
            tempId: tempId,
            voiceDuration: durationSeconds ?? 0.0,
            replyToId: replyToId,
          );
        } else {
          await chatApi.uploadPrivateFile(
            receiverId: widget.userId,
            file: file,
            tempId: tempId,
            replyToId: replyToId,
          );
        }
      }

      if (text != null && text.isNotEmpty) {
        _ws.sendText(content: text, tempId: tempId, replyToId: replyToId);
      }
    } catch (e) {
      setState(() {
        final index = _messages.indexWhere((m) => m.tempId == tempId);
        if (index != -1) {
          _messages[index] =
              _messages[index].copyWith(status: MessageStatus.failed);
        }
        _failedTempIds.add(tempId);
      });

      debugPrint("Send failed: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
          _replyingMessage = null;
        });
      }
    }
  }

  Future<void> _retryMessage(PrivateMessageModel failedMessage) async {
    if (failedMessage.tempId == null) return;
    setState(() {
      _messages.removeWhere((m) => m.tempId == failedMessage.tempId);
      _failedTempIds.remove(failedMessage.tempId);
    });
    if (failedMessage.content != null) {
      await _sendMessage(content: failedMessage.content);
    } else if (failedMessage.hasFile && failedMessage.content != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cannot retry file upload at this time')),
      );
    }
  }

  Future<void> _pickImage() async {
    Permission permission;

    if (Platform.isAndroid) {
      permission = Permission.photos; // Android < 13
    } else {
      permission = Permission.photos; // iOS
    }

    final status = await permission.request();

    if (status.isGranted) {
      final picked = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (picked != null) {
        await _sendMessage(
          file: File(picked.path),
          fileType: 'image',
          replyToId: _replyingMessage?.id,
        );
      }
    } else {
      _showPermissionDeniedDialog('Photos');
    }
  }

  Future<void> _takePhoto() async {
    final status = await Permission.camera.request();

    if (status.isGranted) {
      final picked = await _imagePicker.pickImage(source: ImageSource.camera);
      if (picked != null) {
        await _sendMessage(
          file: File(picked.path),
          fileType: 'image',
          replyToId: _replyingMessage?.id,
        );
      }
    } else if (status.isPermanentlyDenied) {
      openAppSettings();
    } else {
      _showPermissionDeniedDialog('Camera');
    }
  }

  Future<void> _pickVideo() async {
    if (await Permission.photos.request().isGranted) {
      final picked = await _imagePicker.pickVideo(source: ImageSource.gallery);
      if (picked != null) {
        await _sendMessage(
          file: File(picked.path),
          fileType: 'video',
          replyToId: _replyingMessage?.id,
        );
      }
    } else {
      _showPermissionDeniedDialog('Photos');
    }
  }

  Future<void> _pickFile() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.any,
    );

    if (result != null && result.files.single.path != null) {
      final file = File(result.files.single.path!);

      await _sendMessage(
        file: file,
        fileType: 'file',
        replyToId: _replyingMessage?.id,
      );
    }
  }

  void _showPermissionDeniedDialog(String permission) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('$permission permission needed'),
        content: Text('To share media, please grant $permission permission.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => openAppSettings(),
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _ws.disconnect();
    _messageController.dispose();
    _scrollController.dispose();
    _audioPlayer.dispose();
    _audioRecorder.dispose();
    _playbackTimer?.cancel();
    super.dispose();
  }

  Future<void> _connectWebsocket() async {
    try {
      await _ws.connect();

      _ws.messages.listen((data) {
        if (!mounted) return;
        print("ws data: ${data}");

        final type = data['type'];

        if (type == 'message') {
          final message = PrivateMessageModel.fromJson(data);
          final incomingTempId = data['temp_id'];

          setState(() {
            if (incomingTempId != null) {
              final index =
                  _messages.indexWhere((m) => m.tempId == incomingTempId);

              if (index != -1) {
                final existing = _messages[index];
                _messages[index] = existing.copyWith(
                  id: message.id,
                  content: message.content,
                  messageType: message.messageType,
                  voiceDuration: message.voiceDuration,
                  fileSize: message.fileSize,
                  status: MessageStatus.sent,
                  tempId: existing.tempId,
                );
              } else {
                _messages.add(message);
              }
            } else {
              final exists = _messages.any((m) => m.id == message.id);
              if (!exists) {
                _messages.add(message);
              }
            }

            _messages.sort((a, b) => a.createdAt.compareTo(b.createdAt));
          });

          _scrollToBottom();
        } else if (type == 'message_edited') {
          final messageId = data['message_id'];
          final newContent = data['new_content'];
          final editedAt = data['edited_at'];

          setState(() {
            final index = _messages.indexWhere((m) => m.id == messageId);

            if (index != -1) {
              _messages[index] = _messages[index].copyWith(
                content: newContent,
                updatedAt: editedAt != null ? DateTime.parse(editedAt) : null,
                isEdited: true,
              );
            }
          });
        } else if (type == 'message_deleted') {
          final messageId = data['message_id'];

          setState(() {
            _messages.removeWhere((m) => m.id == messageId);
          });
        } else if (type == 'message_replaced') {
          final messageId = data['message_id'];
          final newContent = data['new_content'];
          final editedAt = data['edited_at'];
          final fileSize = data['file_size'];
          final messageType = data['message_type'];

          setState(() {
            final index = _messages.indexWhere((m) => m.id == messageId);

            if (index != -1) {
              _messages[index] = _messages[index].copyWith(
                content: newContent,
                fileSize: fileSize,
                messageType: messageType,
                updatedAt: editedAt != null ? DateTime.parse(editedAt) : null,
                isEdited: true,
                status: MessageStatus.sent,
              );
            }
          });
        } else if (type == 'chat_read') {
          final readerId = data['reader_id'];

          if (readerId != widget.userId) return;

          setState(() {
            _messages = _messages.map((msg) {
              if (msg.senderId == _currentUserId) {
                return msg.copyWith(
                  isRead: true,
                  status: MessageStatus.read,
                );
              }
              return msg;
            }).toList();
          });
        } else if (type == 'messages_read') {
          final messageIds = (data['message_ids'] as List<dynamic>?)
                  ?.map((e) => e.toString())
                  .toList() ??
              [];

          setState(() {
            _messages = _messages.map((msg) {
              if (msg.senderId == _currentUserId &&
                  messageIds.contains(msg.id.toString())) {
                return msg.copyWith(
                  isRead: true,
                  status: MessageStatus.read,
                );
              }
              return msg;
            }).toList();
          });
        } else if (type == 'message_pinned') {
          final pinned = PinnedMessageModel.fromJson(data);

          setState(() {
            _pinnedMessage = pinned;
          });
        } else if (type == 'message_unpinned') {
          setState(() {
            _pinnedMessage = null;
          });
        } else if (type == 'reaction_updated') {
          final messageId = data['message_id'];
          final reactionsJson = data['reactions'] as List<dynamic>? ?? [];

          final reactions =
              reactionsJson.map((e) => Reaction.fromJson(e)).toList();

          setState(() {
            _messages = _messages.map((msg) {
              if (msg.id == messageId) {
                return msg.copyWith(reactions: reactions);
              }
              return msg;
            }).toList();
          });
        }
      });
    } catch (e) {
      print("WS Connection error: $e");
    }
  }

  void _startEditing(PrivateMessageModel message) {
    setState(() {
      _editingMessage = message;
      _messageController.text = message.content ?? '';
    });
    FocusScope.of(context).requestFocus(FocusNode());
  }

  Future<void> _deleteMessage(PrivateMessageModel message) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text("Delete message?"),
        content: const Text("This action cannot be undone."),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text("Cancel"),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Delete"),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    _ws.deleteMessage(messageId: message.id);

    setState(() {
      _messages.removeWhere((m) => m.id == message.id);
    });
  }

  void _replyMessage(PrivateMessageModel message) {
    setState(() {
      _replyingMessage = message;
    });
  }

  void _showForwardDialog(PrivateMessageModel msg) {
    showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) {
          return ForwardDialog(
              currentGroupId: widget.userId,
              messageId: msg.id,
              messageType: "private",
              onSend: (msgId, users, groups) {
                _ws.forwardMessage(msgId, users, groups);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Message forwarded")),
                );
              },
              getChats: chatApi.getChats);
        });
  }

  Future<File?> pickImage() async {
    if (await Permission.photos.request().isGranted) {
      final picked = await _imagePicker.pickImage(source: ImageSource.gallery);
      if (picked != null) return File(picked.path);
    } else {
      _showPermissionDeniedDialog('Photos');
    }
    return null;
  }

  Future<void> _replaceMessage(PrivateMessageModel msg) async {
    try {
      final file = await pickImage();
      if (file == null) return;

      final index = _messages.indexWhere((m) => m.id == msg.id);
      if (index == -1) return;

      final oldMessage = _messages[index];

      String newType = 'file';
      final ext = file.path.toLowerCase();
      if (ext.endsWith('.jpg') ||
          ext.endsWith('.jpeg') ||
          ext.endsWith('.png')) {
        newType = 'image';
      } else if (ext.endsWith('.mp4') || ext.endsWith('.mov')) {
        newType = 'video';
      }

      setState(() {
        _messages[index] = oldMessage.copyWith(
          content: file.path,
          messageType: newType,
          status: MessageStatus.sending,
          updatedAt: DateTime.now(),
          isEdited: true,
        );
      });

      await chatApi.replaceFile(
        messageId: msg.id,
        file: file,
      );
    } catch (e) {
      final index = _messages.indexWhere((m) => m.id == msg.id);
      if (index != -1) {
        setState(() {
          _messages[index] = _messages[index].copyWith(
            status: MessageStatus.failed,
          );
        });
      }
    }
  }

  Future<void> _pinMessage(dynamic msg) async {
    await chatApi.pinPrivateMessage(msg.id);
  }

  Future<void> _showReactEmoji(PrivateMessageModel msg) async {
    final emojis = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

    final selectedEmoji = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
          decoration: BoxDecoration(
            color: Colors.grey[900],
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: emojis.map((emoji) {
              return GestureDetector(
                onTap: () => Navigator.pop(context, emoji),
                child: Text(
                  emoji,
                  style: const TextStyle(fontSize: 28),
                ),
              );
            }).toList(),
          ),
        );
      },
    );

    if (selectedEmoji != null) {
      await chatApi.reactPrivateMessage(
        messageId: msg.id,
        emoji: selectedEmoji,
      );
    }
  }

  Future<void> _copyMessage(
    BuildContext context,
    PrivateMessageModel msg,
  ) async {
    final text = msg.content;

    if (text == null || text.trim().isEmpty) {
      return;
    }

    await Clipboard.setData(
      ClipboardData(text: text),
    );

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Message copied'),
      ),
    );
  }

  void _scrollToPinned(int messageId) {
    final index = _messages.indexWhere((m) => m.id == messageId);
    if (index == -1) return;

    _scrollController.animateTo(
      index * 80.0,
      duration: const Duration(milliseconds: 300),
      curve: Curves.easeInOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bg = isDark ? const Color(0xFF121212) : Colors.grey[100]!;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
        titleSpacing: 0,
        title: GestureDetector(
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => UserProfileScreen(
                  userId: widget.userId,
                  userName: widget.userName,
                  avatarUrl: widget.avatarUrl,
                ),
              ),
            );
          },
          child: Row(
            children: [
              SizedBox(
                width: 40,
                height: 40,
                child: CircleAvatar(
                  radius: 18,
                  backgroundImage: widget.avatarUrl != null
                      ? NetworkImage(widget.avatarUrl!)
                      : null,
                  backgroundColor: widget.avatarUrl == null
                      ? Colors.grey
                      : Colors.transparent,
                  child: widget.avatarUrl == null
                      ? Text(widget.userName[0].toUpperCase())
                      : null,
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  widget.userName,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.call),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                builder: (context) {
                  return SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          ListTile(
                            leading: const Icon(Icons.call),
                            title: const Text("Voice Call"),
                            onTap: () {
                              Navigator.pop(context);

                              widget.onCallStateChanged(
                                CallStatus.calling,
                                userName: widget.userName,
                                avatar: widget.avatarUrl,
                                isVideo: false,
                              );

                              widget.globalWebsocket.send({
                                "type": "call_start",
                                "scope": "private",
                                "to": widget.userId,
                                "call_type": "voice",
                              });
                            },
                          ),
                          ListTile(
                            leading: const Icon(Icons.videocam),
                            title: const Text("Video Call"),
                            onTap: () {
                              Navigator.pop(context);

                              widget.onCallStateChanged(
                                CallStatus.calling,
                                userName: widget.userName,
                                avatar: widget.avatarUrl,
                                isVideo: true,
                              );

                              widget.globalWebsocket.send({
                                "type": "call_start",
                                "scope": "private",
                                "to": widget.userId,
                                "call_type": "video",
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _buildPinnedMessage(),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                    itemCount: _messages.length,
                    itemBuilder: (_, index) {
                      final msg = _messages[index];
                      final isMe = msg.senderId == _currentUserId;
                      return MessageBubble(
                        message: msg,
                        isMe: isMe,
                        currentUserId: _currentUserId,
                        onPlayAudio: msg.isAudio
                            ? () =>
                                _playAudio(msg.content ?? '', msg.id.toString())
                            : null,
                        isPlaying: _currentlyPlayingId == msg.id.toString(),
                        playingProgress:
                            _currentlyPlayingId == msg.id.toString()
                                ? _currentPlayingProgress
                                : null,
                        onRetry: msg.status == MessageStatus.failed
                            ? () => _retryMessage(msg)
                            : null,
                        onAction: (action, message) {
                          if (action == 'edit') {
                            _startEditing(message);
                          } else if (action == 'delete') {
                            _deleteMessage(message);
                          } else if (action == 'reply') {
                            _replyMessage(message);
                          } else if (action == 'forward') {
                            _showForwardDialog(message);
                          } else if (action == 'replace') {
                            _replaceMessage(msg);
                          } else if (action == 'pin') {
                            _pinMessage(msg);
                          } else if (action == 'react') {
                            _showReactEmoji(msg);
                          } else if (action == 'copy') {
                            _copyMessage(context, msg);
                          }
                        },
                      );
                    },
                  ),
                ),
                _buildInput(isDark, bg),
              ],
            ),
    );
  }

  Widget _buildPinnedMessage() {
    final pinned = _pinnedMessage;
    if (pinned == null) {
      return const SizedBox.shrink();
    }

    final msg = pinned;

    final icon = switch (msg.messageType) {
      'image' => Icons.image,
      'video' => Icons.videocam,
      'file' => Icons.insert_drive_file,
      'voice' => Icons.mic,
      _ => Icons.message,
    };

    final typeLabel = switch (msg.messageType) {
      'image' => 'Image',
      'video' => 'Video',
      'file' => 'File',
      'voice' => 'Voice',
      _ => msg.content,
    };

    return GestureDetector(
      onTap: () => _scrollToPinned(msg.id),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        color: Colors.orange.shade100,
        child: Row(
          children: [
            const Icon(Icons.push_pin, size: 18, color: Colors.orange),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Pinned by ${_currentUserId == pinned.pinnedByUser?.id ? 'You' : pinned.pinnedByUser?.id ?? 'Unknown'}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(icon, size: 14, color: Colors.orange),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          typeLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w500),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () => _pinMessage(msg),
              child: const Icon(Icons.close, size: 18),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInput(bool isDark, Color bg) {
    final primary = Theme.of(context).primaryColor;
    final hasText = _messageController.text.trim().isNotEmpty;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (_editingMessage != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            color: Colors.orange.withOpacity(0.1),
            child: Row(
              children: [
                const Icon(Icons.edit, size: 16),
                const SizedBox(width: 8),
                const Expanded(child: Text("Editing message")),
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _editingMessage = null;
                      _messageController.clear();
                    });
                  },
                  child: const Icon(Icons.close, size: 18),
                )
              ],
            ),
          ),
        if (_replyingMessage != null)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Reply icon
                const Icon(Icons.reply, size: 20, color: Colors.green),
                const SizedBox(width: 8),

                // Message preview
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Label with username
                      RichText(
                        text: TextSpan(
                          children: [
                            const TextSpan(
                              text: 'Replying to: ',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.black54,
                              ),
                            ),
                            TextSpan(
                              text: _replyingMessage!.senderUsername,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 2),

                      // Dynamic content preview
                      Builder(
                        builder: (_) {
                          switch (_replyingMessage!.messageType) {
                            case 'text':
                              return Text(
                                _replyingMessage!.content ?? '',
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.black87,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              );
                            case 'file':
                              return Row(
                                children: const [
                                  Icon(Icons.insert_drive_file,
                                      size: 16, color: Colors.grey),
                                  SizedBox(width: 4),
                                  Expanded(
                                    child: Text(
                                      'File',
                                      style: TextStyle(
                                          fontSize: 13, color: Colors.black87),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              );
                            case 'voice':
                              return Row(
                                children: const [
                                  Icon(Icons.mic, size: 16, color: Colors.grey),
                                  SizedBox(width: 4),
                                  Text(
                                    'Voice Message',
                                    style: TextStyle(
                                        fontSize: 13, color: Colors.black87),
                                  ),
                                ],
                              );
                            case 'image':
                              return Row(
                                children: const [
                                  Icon(Icons.image,
                                      size: 16, color: Colors.grey),
                                  SizedBox(width: 4),
                                  Text(
                                    'Image',
                                    style: TextStyle(
                                        fontSize: 13, color: Colors.black87),
                                  ),
                                ],
                              );
                            case 'video':
                              return Row(
                                children: const [
                                  Icon(Icons.videocam,
                                      size: 16, color: Colors.grey),
                                  SizedBox(width: 4),
                                  Text(
                                    'Video',
                                    style: TextStyle(
                                        fontSize: 13, color: Colors.black87),
                                  ),
                                ],
                              );
                            default:
                              return const Text(
                                'Attachment',
                                style: TextStyle(
                                    fontSize: 13, color: Colors.black87),
                              );
                          }
                        },
                      ),
                    ],
                  ),
                ),

                // Close button
                GestureDetector(
                  onTap: () {
                    setState(() {
                      _replyingMessage = null;
                    });
                  },
                  child: const Padding(
                    padding: EdgeInsets.only(left: 8.0),
                    child: Icon(Icons.close, color: Colors.red, size: 18),
                  ),
                ),
              ],
            ),
          ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          decoration: BoxDecoration(
            color: isDark ? const Color(0xFF1E1E1E) : Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 4,
                offset: const Offset(0, -2),
              )
            ],
          ),
          child: Row(
            children: [
              PopupMenuButton<String>(
                icon: Icon(
                  Icons.attach_file,
                  color: isDark ? Colors.white70 : Colors.grey[600],
                ),
                onSelected: (v) {
                  switch (v) {
                    case 'document':
                      _pickFile();
                      break;
                    case 'image_gallery':
                      _pickImage();
                      break;
                    case 'image_camera':
                      _takePhoto();
                      break;
                    case 'video':
                      _pickVideo();
                      break;
                  }
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(
                    value: 'document',
                    child: Row(
                      children: [
                        Icon(Icons.insert_drive_file, size: 20),
                        SizedBox(width: 12),
                        Text('Document'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'image_gallery',
                    child: Row(
                      children: [
                        Icon(Icons.photo_library, size: 20),
                        SizedBox(width: 12),
                        Text('Gallery'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'image_camera',
                    child: Row(
                      children: [
                        Icon(Icons.camera_alt, size: 20),
                        SizedBox(width: 12),
                        Text('Camera'),
                      ],
                    ),
                  ),
                  PopupMenuItem(
                    value: 'video',
                    child: Row(
                      children: [
                        Icon(Icons.videocam, size: 20),
                        SizedBox(width: 12),
                        Text('Video'),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 4),
              VoiceRecorderWidget(
                onRecordingComplete: (file, dur) => _sendMessage(
                  file: file,
                  fileType: 'audio',
                  voiceDuration: dur,
                  replyToId: _replyingMessage?.id,
                ),
              ),
              const SizedBox(width: 4),
              Expanded(
                child: Container(
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: BorderRadius.circular(24),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Row(
                    children: [
                      /// TEXT FIELD
                      Expanded(
                        child: TextField(
                          controller: _messageController,
                          maxLines: null,
                          onTap: () {
                            if (_showEmojiPicker) {
                              setState(() => _showEmojiPicker = false);
                            }
                          },
                          style: TextStyle(
                              color: isDark ? Colors.white : Colors.black),
                          decoration: InputDecoration(
                            hintText: 'Type a message...',
                            hintStyle: TextStyle(
                              color: isDark ? Colors.white54 : Colors.grey[400],
                            ),
                            border: InputBorder.none,
                          ),
                        ),
                      ),

                      IconButton(
                        icon: Icon(
                          Icons.emoji_emotions_outlined,
                          color: isDark ? Colors.white70 : Colors.grey,
                        ),
                        onPressed: () {
                          FocusScope.of(context).unfocus();
                          setState(() {
                            _showEmojiPicker = !_showEmojiPicker;
                          });
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                onPressed: _isSending || !hasText
                    ? null
                    : () => _sendMessage(
                          content: _messageController.text.trim(),
                          replyToId: _replyingMessage?.id,
                        ),
                icon: _isSending
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Icon(
                        Icons.send,
                        color: _messageController.text.trim().isEmpty
                            ? (isDark ? Colors.white38 : Colors.grey[400])
                            : primary,
                      ),
              ),
            ],
          ),
        ),
        AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          height: _showEmojiPicker ? 250 : 0,
          child: _showEmojiPicker
              ? AwesomeEmojiPicker(
                  onEmojiSelected: (emoji) {
                    final text = _messageController.text;
                    final selection = _messageController.selection;

                    final newText = text.replaceRange(
                      selection.start,
                      selection.end,
                      emoji.char,
                    );

                    _messageController.text = newText;
                    _messageController.selection = TextSelection.collapsed(
                      offset: selection.start + emoji.char.length,
                    );
                  },
                )
              : null,
        ),
      ],
    );
  }
}
