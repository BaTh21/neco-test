import 'dart:async';
import 'dart:core';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/chat/model/group_model/group_details_model.dart';
import 'package:whisper_space_flutter/features/websocket/group_websocket.dart';
import 'package:whisper_space_flutter/features/chat/model/group_message_model/group_message_model.dart';
import '../../chat_api_service.dart';
import 'package:image_picker/image_picker.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import 'package:file_picker/file_picker.dart';
import './message_bubble_screen.dart';
import 'package:awesome_emoji_picker/awesome_emoji_picker.dart';
import './group_dialog//forward_dialog.dart';
import 'package:whisper_space_flutter/features/chat/video_player.dart';
import 'package:whisper_space_flutter/features/chat/screens/private/widgets/image_viewer.dart';
import 'package:dio/dio.dart';
import 'package:whisper_space_flutter/features/chat/model/group_model/user_model.dart';
import 'package:flutter/services.dart';

class GroupMessageScreen extends StatefulWidget {
  final int groupId;
  final int currentUserId;
  final GroupWebsocket groupWebsocket;
  final StorageService storageService;
  final ChatAPISource chatApi;

  final GroupDetailsModel? initialGroup;

  const GroupMessageScreen(
      {super.key,
      required this.groupId,
      required this.currentUserId,
      required this.groupWebsocket,
      required this.storageService,
      required this.chatApi,
      this.initialGroup});

  @override
  State<GroupMessageScreen> createState() => _GroupMessageScreenState();
}

class _GroupMessageScreenState extends State<GroupMessageScreen> {
  List<GroupMessageModel> _messages = [];
  final TextEditingController _controller = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();
  String? editingMessageId;
  String? replyingToMessageId;
  ParentMessageModel? replyingToMessage;
  late GroupDetailsModel? group;
  late List<UserModel>? members;
  PinnedMessageModel? _pinnedMessage;

  final _recorder = AudioRecorder();
  bool _isRecording = false;
  bool _showEmojiPicker = false;

  late final StreamSubscription _wsSubscription;

  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _offset = 0;
  final int _limit = 30;

  bool _isDownloading = false;
  double _progress = 0.0;
  int? _downloadingMessageId;

  final allowedExtensions = {
    ".png": "image",
    ".jpg": "image",
    ".jpeg": "image",
    ".webp": "image",
    ".gif": "image",
    ".pdf": "file",
    ".txt": "file",
    ".doc": "file",
    ".docx": "file",
    ".zip": "file",
    ".mp4": "video",
    ".mov": "video",
    ".mkv": "video",
  };

  String _getFileType(File file) {
    final ext = '.${file.path.split('.').last.toLowerCase()}';
    return allowedExtensions[ext] ?? 'file';
  }

  Future<bool> _requestPermission(Permission permission) async {
    final status = await permission.request();
    return status.isGranted;
  }

  Future<void> _pickImage({required ImageSource source}) async {
    final hasPermission = source == ImageSource.camera
        ? await _requestPermission(Permission.camera)
        : await _requestPermission(Permission.photos);

    if (!hasPermission) return;

    final XFile? image = await _picker.pickImage(source: source);

    if (image == null) return;

    _uploadImage(File(image.path), parentMessageId: replyingToMessageId);
  }

  Future<void> _pickFiles() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: allowedExtensions.keys
          .map((ext) => ext.replaceFirst('.', ''))
          .toList(),
    );

    if (result == null || result.files.isEmpty) return;

    final file = File(result.files.single.path!);
    final ext = '.${file.path.split('.').last.toLowerCase()}';

    if (!allowedExtensions.containsKey(ext)) return;

    _uploadFile(file, allowedExtensions[ext]!,
        parentMessageId: replyingToMessageId);
  }

  Future<void> _pickVideo({required ImageSource source}) async {
    final hasPermission = source == ImageSource.camera
        ? await _requestPermission(Permission.camera)
        : await _requestPermission(Permission.photos);

    if (!hasPermission) return;

    final XFile? video = await _picker.pickVideo(source: source);

    if (video == null) return;

    _uploadVideo(File(video.path), parentMessageId: replyingToMessageId);
  }

  Future<void> _startRecording() async {
    if (await _recorder.hasPermission(request: true)) {
      final dir = await getTemporaryDirectory();
      final filePath =
          '${dir.path}/${DateTime.now().millisecondsSinceEpoch}.m4a';

      final config = RecordConfig(
        encoder: AudioEncoder.aacLc,
        sampleRate: 44100,
        bitRate: 128000,
      );

      await _recorder.start(
        config,
        path: filePath,
      );

      setState(() {
        _isRecording = true;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Microphone permission denied')),
      );
    }
  }

  Future<void> _stopRecording() async {
    final path = await _recorder.stop();
    setState(() => _isRecording = false);

    if (path != null) {
      _uploadVoice(File(path), parentMessageId: replyingToMessageId);
    }
  }

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      setState(() {});
    });
    group = widget.initialGroup;
    _pinnedMessage = widget.initialGroup?.pinnedMessage;
    _loadOldMessages();

    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 50) {
        _loadOldMessages(loadMore: true);
      }
    });

    _wsSubscription = widget.groupWebsocket.stream.listen(
      (jsonData) => _handleWsEvent(jsonData),
      onError: (error) => debugPrint('WebSocket stream error: $error'),
      onDone: () => debugPrint('WebSocket stream closed'),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    _wsSubscription.cancel();
    widget.groupWebsocket.disconnect();
    _controller.dispose();
    _scrollController.dispose();
    _recorder.dispose();
    super.dispose();
  }

  void _handleWsEvent(Map<String, dynamic> data) {
    final action = data['action'];

    switch (action) {
      case 'ping':
      case 'pong':
      case 'online_users':
        return;

      case 'delete':
        setState(() {
          _messages.removeWhere((m) => m.id == data['message_id']);
        });
        return;

      case 'edit':
        setState(() {
          final index = _messages.indexWhere(
            (m) => m.id == data['message_id'],
          );

          if (index != -1) {
            _messages[index] = _messages[index].copyWith(
              content: data['new_content'],
              updatedAt: DateTime.parse(data['updated_at']),
            );
          }
        });
        return;

      case 'file_upload':
        final index = _messages.indexWhere(
          (m) => m.tempId == data['temp_id'],
        );

        if (index != -1) {
          final existingSeen = _messages[index].seenBy;

          setState(() {
            _messages[index] = GroupMessageModel.fromJson(data).copyWith(
              seenBy: existingSeen,
            );
          });
        } else {
          setState(() {
            _messages.insert(0, GroupMessageModel.fromJson(data));
          });
        }
        return;

      case 'file_update':
        final index = _messages.indexWhere(
          (m) => m.id == data['message_id'] || m.tempId == data['temp_id'],
        );

        setState(() {
          _messages[index] = _messages[index].copyWith(
            fileUrl: data['file_url'],
            type: data['message_type'],
            updatedAt: DateTime.parse(data['updated_at']),
            tempId: data['temp_id'],
            isUploading: false,
            sender: _messages[index].sender,
          );
        });
        return;

      case 'messages_read':
        final messageIds = List<int>.from(data['message_ids'] ?? []);
        if (messageIds.isEmpty) return;

        List<AuthorModel> users = [];
        if (data['users'] != null) {
          users = (data['users'] as List)
              .map((u) => AuthorModel.fromJson(u))
              .toList();
        } else if (data['user'] != null) {
          users = [AuthorModel.fromJson(data['user'])];
        }

        final seenAt = DateTime.parse(data['seen_at']);

        setState(() {
          _messages = _messages.map((msg) {
            if (!messageIds.contains(msg.id) &&
                !(msg.tempId != null && messageIds.contains(msg.id))) {
              return msg;
            }

            final currentSeen = msg.seenBy ?? [];

            final updatedSeen = [
              ...currentSeen,
              ...users
                  .where(
                    (user) => !currentSeen.any((s) => s.user?.id == user.id),
                  )
                  .map((user) =>
                      SeenMessageModel(id: 0, user: user, seenAt: seenAt)),
            ];

            return msg.copyWith(seenBy: updatedSeen);
          }).toList();
        });
        return;
      case 'message_pinned':
        final messageId = data['message_id'];

        final msgIndex = _messages.indexWhere((m) => m.id == messageId);

        if (msgIndex != -1) {
          final msg = _messages[msgIndex];

          setState(() {
            _pinnedMessage = PinnedMessageModel(
              id: msg.id,
              content: msg.content,
              messageType: msg.type,
              senderId: msg.sender.id,
              pinnedById: data['pinned_by_id'],
              pinnedBy: data['pinned_by'],
              pinnedAt: DateTime.tryParse(data['pinned_at'] ?? ''),
            );
          });
        } else {
          setState(() {
            _pinnedMessage = PinnedMessageModel(
              id: messageId,
              content: 'Pinned message',
              pinnedById: data['pinned_by_id'],
              pinnedAt: DateTime.tryParse(data['pinned_at'] ?? ''),
            );
          });
        }
        return;

      case 'message_unpinned':
        setState(() {
          _pinnedMessage = null;
        });
        return;

      case 'message_reaction':
        final int messageId = data['message_id'];
        final int userId = data['user_id'];
        final String reaction = data['reaction'];
        final String status = data['status'];

        final Map<String, int> summary = (data['reaction_summary'] as Map)
            .map((k, v) => MapEntry(k.toString(), v as int));

        setState(() {
          final index = _messages.indexWhere((m) => m.id == messageId);
          if (index == -1) return;

          final old = _messages[index];

          _messages[index] = old.copyWith(
            reactionSummary: Map<String, int>.from(summary),
            myReaction: userId == widget.currentUserId
                ? (status == 'removed' ? null : reaction)
                : old.myReaction,
          );
        });
        return;

      case 'message':
        final message = GroupMessageModel.fromJson(data);
        setState(() => _messages.insert(0, message));
        _scrollToBottom();
      default:
        return;
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0, // scroll to top when reverse:true
          duration: const Duration(milliseconds: 200),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _loadOldMessages({bool loadMore = false}) async {
    if (_isLoadingMore) return;
    _isLoadingMore = true;

    try {
      final messages = await widget.chatApi.getGroupMessages(
        groupId: widget.groupId,
        limit: _limit,
        offset: _offset,
      );

      setState(() {
        if (loadMore) {
          _messages = [...messages, ..._messages];
        } else {
          _messages = messages;
        }
        _offset += messages.length;
        _isLoading = false;
      });

      if (!loadMore) _scrollToBottom();
    } catch (e) {
      debugPrint('Failed to load messages: $e');
      setState(() => _isLoading = false);
    }

    _isLoadingMore = false;
  }

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty) return;

    if (editingMessageId != null) {
      final index =
          _messages.indexWhere((m) => m.id.toString() == editingMessageId);

      if (index != -1) {
        final oldMessage = _messages[index];
        final editedMessage = oldMessage.copyWith(content: text);

        setState(() {
          _messages[index] = editedMessage;
          editingMessageId = null;
        });

        widget.groupWebsocket.sendEditMessage(oldMessage.id, text);
      }
    } else {
      widget.groupWebsocket.sendMessage(
        text,
        replyingToMessageId,
      );

      setState(() {
        replyingToMessageId = null;
        replyingToMessage = null;
      });
    }
    _controller.clear();
  }

  Future<void> _uploadImage(File file, {String? parentMessageId}) async {
    final tempId = DateTime.now().microsecondsSinceEpoch.toString();
    final type = _getFileType(file);

    if (parentMessageId != null) {
      final found = _messages.where((m) => m.id == parentMessageId);

      if (found.isNotEmpty) {
        final m = found.first;

        replyingToMessage = ParentMessageModel(
          id: m.id,
          sender: m.sender,
          content: m.content,
          callContent: m.callContent,
          fileUrl: m.fileUrl,
          voiceUrl: m.voiceUrl,
          type: m.type,
        );
      }
    }

    final tempMessage = GroupMessageModel(
      id: -1,
      tempId: tempId,
      sender: AuthorModel(
        id: widget.currentUserId,
        username: "me",
        avatar: null,
      ),
      groupId: widget.groupId,
      createdAt: DateTime.now(),
      fileUrl: file.path,
      type: type,
      parentMessage: replyingToMessage,
      isUploading: true,
    );

    setState(() {
      _messages.insert(0, tempMessage);
    });

    try {
      final message = await widget.chatApi
          .uploadFile(widget.groupId, file, tempId, parentMessageId);

      final index = _messages.indexWhere((m) => m.tempId == tempId);

      if (index != -1) {
        setState(() {
          _messages[index] = _messages[index].copyWith(
            id: message.id,
            fileUrl: message.fileUrl,
            content: message.content,
            createdAt: message.createdAt,
            // seenBy: message.seenBy,
            type: message.type,
            isUploading: false,
          );
        });
      }
    } catch (e) {
      setState(() {
        _messages.removeWhere((m) => m.tempId == tempId);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Upload failed")),
      );
    } finally {
      setState(() {
        replyingToMessageId = null;
        replyingToMessage = null;
      });
    }
  }

  Future<void> _uploadVoice(File file, {String? parentMessageId}) async {
    final tempId = DateTime.now().microsecondsSinceEpoch.toString();

    if (parentMessageId != null) {
      final found = _messages.where((m) => m.id == parentMessageId);

      if (found.isNotEmpty) {
        final m = found.first;

        replyingToMessage = ParentMessageModel(
          id: m.id,
          sender: m.sender,
          content: m.content,
          callContent: m.callContent,
          fileUrl: m.fileUrl,
          voiceUrl: m.voiceUrl,
          type: m.type,
        );
      }
    }

    final tempMessage = GroupMessageModel(
        id: -1,
        tempId: tempId,
        sender: AuthorModel(
          id: widget.currentUserId,
          username: "me",
          avatar: null,
        ),
        groupId: widget.groupId,
        createdAt: DateTime.now(),
        voiceUrl: file.path,
        type: "voice",
        parentMessage: replyingToMessage,
        isUploading: true);

    setState(() {
      _messages.insert(0, tempMessage);
    });

    try {
      final message = await widget.chatApi
          .uploadVoice(widget.groupId, file, tempId, parentMessageId);

      final index = _messages.indexWhere((m) => m.tempId == tempId);

      if (index != -1) {
        setState(() {
          _messages[index] = _messages[index].copyWith(
            id: message.id,
            voiceUrl: message.voiceUrl,
            content: message.content,
            createdAt: message.createdAt,
            // seenBy: message.seenBy,
            type: message.type,
            isUploading: false,
          );
        });
      }
    } catch (e) {
      setState(() {
        _messages.removeWhere((m) => m.tempId == tempId);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Upload failed")),
      );
    } finally {
      setState(() {
        replyingToMessageId = null;
        replyingToMessage = null;
      });
    }
  }

  Future<void> _uploadFile(File file, String type,
      {String? parentMessageId}) async {
    final tempId = DateTime.now().microsecondsSinceEpoch.toString();

    if (parentMessageId != null) {
      final found = _messages.where((m) => m.id == parentMessageId);

      if (found.isNotEmpty) {
        final m = found.first;

        replyingToMessage = ParentMessageModel(
          id: m.id,
          sender: m.sender,
          content: m.content,
          callContent: m.callContent,
          fileUrl: m.fileUrl,
          voiceUrl: m.voiceUrl,
          type: m.type,
        );
      }
    }

    final tempMessage = GroupMessageModel(
        id: -1,
        tempId: tempId,
        sender: AuthorModel(
          id: widget.currentUserId,
          username: "me",
          avatar: null,
        ),
        groupId: widget.groupId,
        createdAt: DateTime.now(),
        fileUrl: file.path,
        type: type,
        parentMessage: replyingToMessage,
        isUploading: true);

    setState(() => _messages.insert(0, tempMessage));

    try {
      final message = await widget.chatApi
          .uploadFile(widget.groupId, file, tempId, parentMessageId);

      final index = _messages.indexWhere((m) => m.tempId == tempId);
      if (index != -1) {
        setState(() {
          _messages[index] = _messages[index].copyWith(
            id: message.id,
            fileUrl: message.fileUrl,
            content: message.content,
            createdAt: message.createdAt,
            // seenBy: message.seenBy,
            type: message.type,
            isUploading: false,
          );
        });
      }
    } catch (e) {
      setState(() => _messages.removeWhere((m) => m.tempId == tempId));

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Upload failed")),
      );
    } finally {
      setState(() {
        replyingToMessageId = null;
        replyingToMessage = null;
      });
    }
  }

  Future<void> _uploadVideo(File file, {String? parentMessageId}) async {
    final tempId = DateTime.now().microsecondsSinceEpoch.toString();

    if (parentMessageId != null) {
      final found = _messages.where((m) => m.id == parentMessageId);

      if (found.isNotEmpty) {
        final m = found.first;

        replyingToMessage = ParentMessageModel(
          id: m.id,
          sender: m.sender,
          content: m.content,
          callContent: m.callContent,
          fileUrl: m.fileUrl,
          voiceUrl: m.voiceUrl,
          type: m.type,
        );
      }
    }

    final tempMessage = GroupMessageModel(
        id: -1,
        tempId: tempId,
        sender: AuthorModel(
          id: widget.currentUserId,
          username: "me",
          avatar: null,
        ),
        groupId: widget.groupId,
        createdAt: DateTime.now(),
        fileUrl: file.path, // local preview
        type: "video",
        parentMessage: replyingToMessage,
        isUploading: true);

    setState(() {
      _messages.insert(0, tempMessage);
    });

    try {
      final message = await widget.chatApi
          .uploadFile(widget.groupId, file, tempId, parentMessageId);

      final index = _messages.indexWhere((m) => m.tempId == tempId);

      if (index != -1) {
        setState(() {
          _messages[index] = _messages[index].copyWith(
            id: message.id,
            fileUrl: message.fileUrl,
            content: message.content,
            createdAt: message.createdAt,
            // seenBy: message.seenBy,
            type: message.type,
            isUploading: false,
          );
        });
      }
    } catch (e) {
      setState(() {
        _messages.removeWhere((m) => m.tempId == tempId);
      });

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Video upload failed")),
      );
    } finally {
      setState(() {
        replyingToMessageId = null;
        replyingToMessage = null;
      });
    }
  }

  Future<void> _handleReplaceFile(dynamic msg) async {
    final tempId = DateTime.now().microsecondsSinceEpoch.toString();

    final result = await FilePicker.platform.pickFiles();
    if (result == null || result.files.single.path == null) return;

    final file = File(result.files.single.path!);
    final type = _getFileType(file);

    final index = _messages.indexWhere((m) => m.id == msg.id);
    if (index == -1) return;

    final oldMessage = _messages[index];

    try {
      setState(() {
        _messages[index] = oldMessage.copyWith(
          tempId: tempId,
          fileUrl: file.path,
          type: type,
          isUploading: true,
          seenBy: oldMessage.seenBy,
        );
      });

      final updatedMessage = await widget.chatApi.updateFileMessage(
        msg.id,
        file,
        tempId,
      );

      setState(() {
        final current = _messages[index];

        _messages[index] = updatedMessage.copyWith(
          sender: _messages[index].sender,
          isUploading: false,
          seenBy: current.seenBy,
        );
      });
    } catch (e) {
      final rollbackIndex = _messages.indexWhere(
        (m) => m.id == msg.id || m.tempId == tempId,
      );

      if (rollbackIndex != -1) {
        setState(() {
          _messages[rollbackIndex] = oldMessage;
        });
      }

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Replace failed")),
      );
    }
  }

  Future<void> _saveMessage(GroupMessageModel msg) async {
    try {
      final url = msg.fileUrl;
      if (url == null) return;

      final fileName = url.split('/').last;

      final dir = Directory('/storage/emulated/0/Download');
      final filePath = '${dir.path}/$fileName';

      setState(() {
        _isDownloading = true;
        _progress = 0;
        _downloadingMessageId = msg.id;
      });

      await Dio().download(
        url,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            setState(() {
              _progress = received / total;
            });
          }
        },
      );

      setState(() {
        _isDownloading = false;
        _downloadingMessageId = null;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Saved to Downloads')),
      );
    } catch (e, stack) {
      print("❌ ERROR: $e");
      print("STACK: $stack");

      setState(() {
        _isDownloading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
    }
  }

  void _previewMessage(GroupMessageModel msg) {
    if (msg.type == 'image' && msg.fileUrl != null) {
      Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => ImageViewer(imageUrl: msg.fileUrl!)));
    } else if (msg.type == 'video' && msg.fileUrl != null) {
      Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => VideoMessagePlayer(
                  url: msg.fileUrl!,
                  isOwn: msg.sender.id == widget.currentUserId)));
    }
  }

  void _copyMessage(BuildContext context, GroupMessageModel msg) async {
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

  void _handleBubbleAction(String action, dynamic msg) {
    if (action.startsWith("react_")) {
      final reaction = action.replaceFirst("react_", "");
      _toggleReaction(msg, reaction);
      return;
    }

    switch (action) {
      case 'edit':
        _controller.text = msg.content ?? '';
        _controller.selection = TextSelection.fromPosition(
          TextPosition(offset: _controller.text.length),
        );

        setState(() {
          editingMessageId = msg.id.toString();
        });
        break;

      case 'delete':
        _showDeleteDialog(msg);
        break;

      case 'reply':
        setState(() {
          replyingToMessageId = msg.id.toString();
          replyingToMessage = ParentMessageModel(
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            callContent: msg.callContent,
            fileUrl: msg.fileUrl,
            voiceUrl: msg.voiceUrl,
            type: msg.type,
          );
        });
        break;
      case 'forward':
        _showForwardDialog(msg);
        break;
      case 'replace':
        _handleReplaceFile(msg);
        break;
      case 'pin':
        _pinMessage(msg);
        break;
      case 'react':
        _showReactionPicker(context, msg);
        break;
      case 'save':
        _saveMessage(msg);
        break;
      case 'preview':
        _previewMessage(msg);
        break;
      case 'copy':
        _copyMessage(context, msg);
        break;
    }
  }

  void _showAttachmentOptions() {
    showModalBottomSheet(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.insert_drive_file),
                title: const Text('Document'),
                onTap: () {
                  Navigator.pop(context);
                  _pickFiles();
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_library),
                title: const Text('Gallery'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(source: ImageSource.gallery);
                },
              ),
              ListTile(
                leading: const Icon(Icons.camera_alt),
                title: const Text('Camera'),
                onTap: () {
                  Navigator.pop(context);
                  _pickImage(source: ImageSource.camera);
                },
              ),
              ListTile(
                leading: const Icon(Icons.videocam),
                title: const Text('Video'),
                onTap: () {
                  Navigator.pop(context);
                  _pickVideo(source: ImageSource.gallery);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showForwardDialog(GroupMessageModel msg) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return ForwardDialog(
          currentGroupId: widget.groupId,
          messageId: msg.id,
          messageType: "group",
          getChats: widget.chatApi.getChats,
          onSend: (msgId, users, groups) {
            widget.groupWebsocket.sendForward(msgId, users, groups);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text("Message forwarded")),
            );
          },
        );
      },
    );
  }

  void _showDeleteDialog(dynamic msg) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Delete Message'),
          content: const Text('Are you sure you want to delete this message?'),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context); // close dialog
              },
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                Navigator.pop(context); // close dialog

                // Perform delete
                widget.groupWebsocket.sendDeleteMessage(msg.id);
                setState(() {
                  _messages.removeWhere((m) => m.id == msg.id);
                });
              },
              child: const Text(
                'Delete',
                style: TextStyle(color: Colors.red),
              ),
            ),
          ],
        );
      },
    );
  }

  void _pinMessage(dynamic msg) async {
    await widget.chatApi.pinMessage(groupId: widget.groupId, messageId: msg.id);
  }

  void _unpinMessage(int messageId) async {
    await widget.chatApi
        .unPinMessage(groupId: widget.groupId, messageId: messageId);
  }

  void _scrollToPinned(int messageId) {
    final index = _messages.indexWhere((m) => m.id == messageId);

    if (index != -1) {
      _scrollController.animateTo(
        index * 80,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    }
  }

  Widget _buildPinnedMessage() {
    final pinned = _pinnedMessage;
    if (pinned == null) return const SizedBox();

    final icon = switch (pinned.messageType) {
      'image' => Icons.image,
      'video' => Icons.videocam,
      'file' => Icons.insert_drive_file,
      'voice' => Icons.mic,
      _ => Icons.message,
    };

    final typeLabel = switch (pinned.messageType) {
      'image' => 'Image',
      'video' => 'Video',
      'file' => 'File',
      'voice' => 'Voice',
      _ => pinned.content ?? '',
    };

    return GestureDetector(
      onTap: () => _scrollToPinned(pinned.id),
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
                    'Pinned by ${widget.currentUserId == pinned.pinnedById ? 'You' : pinned.pinnedBy ?? 'Unknown'}',
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
              onTap: () => _unpinMessage(pinned.id),
              child: const Icon(Icons.close, size: 18),
            ),
          ],
        ),
      ),
    );
  }

  void _showReactionPicker(BuildContext context, GroupMessageModel msg) {
    final reactions = ["like", "love", "laugh", "wow", "sad", "angry"];

    final icons = {
      "like": Icons.thumb_up,
      "love": Icons.favorite,
      "laugh": Icons.sentiment_satisfied,
      "wow": Icons.emoji_emotions,
      "sad": Icons.sentiment_dissatisfied,
      "angry": Icons.sentiment_very_dissatisfied,
    };

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) {
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: reactions.map((r) {
              final isSelected = msg.myReaction == r;

              return GestureDetector(
                onTap: () {
                  Navigator.pop(context);
                  _handleBubbleAction("react_$r", msg);
                },
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor: isSelected
                          ? Colors.blue.shade100
                          : Colors.grey.shade200,
                      child: Icon(
                        icons[r],
                        color: isSelected ? Colors.blue : Colors.black,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      r,
                      style: TextStyle(
                        fontSize: 11,
                        color: isSelected ? Colors.blue : Colors.black,
                      ),
                    )
                  ],
                ),
              );
            }).toList(),
          ),
        );
      },
    );
  }

  void _toggleReaction(GroupMessageModel msg, String reaction) async {
    try {
      await widget.chatApi.toggleReaction(
        groupId: widget.groupId,
        messageId: msg.id,
        reaction: reaction,
      );
    } catch (e) {
      print("Toggle reaction error: $e");
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final isDark = Theme.of(context).brightness == Brightness.dark;
    final hasText = _controller.text.trim().isNotEmpty;

    return Column(
      children: [
        _buildPinnedMessage(),
        Expanded(
          child: ListView.builder(
            reverse: true,
            controller: _scrollController,
            itemCount: _messages.length + (_isLoadingMore ? 1 : 0),
            itemBuilder: (context, index) {
              try {
                if (_isLoadingMore && index == _messages.length) {
                  return const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  );
                }

                final msg = _messages[index];
                final isMe = msg.sender.id == widget.currentUserId;
                final bool isSeen = msg.seenBy?.any(
                      (s) => s.user?.id != widget.currentUserId,
                    ) ??
                    false;
                final isPinned = _pinnedMessage?.id == msg.id;

                return Container(
                  decoration: BoxDecoration(
                    color: isPinned ? Colors.orange.withOpacity(0.15) : null,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  child: MessageBubble(
                    key: ValueKey(
                      '${msg.id}-${msg.seenBy?.map((e) => e.user?.id).join(",")}',
                    ),
                    msg: msg,
                    isMe: isMe,
                    currentUserId: widget.currentUserId,
                    isSeen: isSeen,
                    repliedMessage: msg.parentMessage,
                    onAction: _handleBubbleAction,
                    isDownloading:
                        _isDownloading && _downloadingMessageId == msg.id,
                    progress: _progress,
                  ),
                );
              } catch (e, s) {
                debugPrint("❌ ERROR AT INDEX: $index");
                debugPrint(e.toString());
                debugPrint(s.toString());
                return const SizedBox();
              }
            },
          ),
        ),
        SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (replyingToMessage != null)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
                            Text(
                              'Replying to: ${replyingToMessage!.sender.username}',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Colors.black54,
                              ),
                            ),
                            const SizedBox(height: 2),

                            // Dynamic preview based on type
                            if (replyingToMessage!.type == 'text' &&
                                replyingToMessage!.content != null)
                              Text(
                                replyingToMessage!.content!,
                                style: const TextStyle(
                                  fontSize: 13,
                                  color: Colors.black87,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              )
                            else if (replyingToMessage!.type == 'file' &&
                                replyingToMessage!.fileUrl != null)
                              Row(
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
                              )
                            else if (replyingToMessage!.type == 'voice' &&
                                replyingToMessage!.voiceUrl != null)
                              Row(
                                children: const [
                                  Icon(Icons.mic, size: 16, color: Colors.grey),
                                  SizedBox(width: 4),
                                  Text(
                                    'Voice Message',
                                    style: TextStyle(
                                        fontSize: 13, color: Colors.black87),
                                  ),
                                ],
                              )
                            else if (replyingToMessage!.type == 'image' &&
                                replyingToMessage!.fileUrl != null)
                              Row(
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
                              )
                            else if (replyingToMessage!.type == 'video' &&
                                replyingToMessage!.fileUrl != null)
                              Row(
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
                              )
                            else
                              const Text(
                                'Attachment',
                                style: TextStyle(
                                    fontSize: 13, color: Colors.black87),
                              ),
                          ],
                        ),
                      ),

                      // Close button
                      GestureDetector(
                        onTap: () {
                          setState(() {
                            replyingToMessageId = null;
                            replyingToMessage = null;
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
              if (editingMessageId != null)
                Container(
                  width: double.infinity,
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  color: Colors.grey.shade200,
                  child: Row(
                    children: [
                      const Icon(Icons.edit, size: 16, color: Colors.blue),
                      const SizedBox(width: 6),
                      const Expanded(
                        child: Text(
                          'Editing message',
                          style: TextStyle(fontSize: 13),
                        ),
                      ),
                      GestureDetector(
                        onTap: () {
                          setState(() => editingMessageId = null);
                          _controller.clear();
                        },
                        child: const Icon(Icons.close,
                            color: Colors.red, size: 18),
                      )
                    ],
                  ),
                ),
              Container(
                color: isDark
                    ? const Color(0xFF1E1E1E)
                    : Colors.grey[100]!, // solid background
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                child: Row(
                  children: [
                    // Image Picker Button
                    IconButton(
                      icon: Icon(Icons.attach_file,
                          color: isDark ? Colors.white : Colors.grey[700]),
                      onPressed: _showAttachmentOptions,
                    ),

                    const SizedBox(width: 8),

                    // Voice Record Button
                    GestureDetector(
                      onLongPressStart: (_) => _startRecording(),
                      onLongPressEnd: (_) => _stopRecording(),
                      child: Icon(
                        _isRecording ? Icons.mic : Icons.mic_none,
                        color: _isRecording
                            ? Colors.red
                            : (isDark ? Colors.white : Colors.grey[700]),
                        size: 28,
                      ),
                    ),

                    const SizedBox(width: 8),

                    // Text Input
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: isDark ? Color(0xFF121212) : Colors.grey[300],
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Colors.grey[300]!),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _controller,
                                decoration: InputDecoration(
                                  hintText: editingMessageId != null
                                      ? 'Edit message...'
                                      : 'Type a message...',
                                  border: InputBorder.none,
                                ),
                                minLines: 1,
                                maxLines: 5,
                              ),
                            ),

                            // Emoji Button
                            IconButton(
                              icon: Icon(
                                Icons.emoji_emotions_outlined,
                                color: editingMessageId != null
                                    ? Colors.blue
                                    : (isDark ? Colors.white70 : Colors.grey),
                              ),
                              onPressed: () {
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

                    // Send Button
                    IconButton(
                      icon: Icon(
                        Icons.send,
                        color: _controller.text.trim().isEmpty
                            ? (isDark ? Colors.white38 : Colors.grey[400])
                            : Theme.of(context).primaryColor,
                      ),
                      onPressed: hasText ? _sendMessage : null,
                    ),
                  ],
                ),
              ),

              // Emoji Picker
              if (_showEmojiPicker)
                SizedBox(
                  height: 250,
                  child: AwesomeEmojiPicker(
                    onEmojiSelected: (emoji) {
                      _controller.text += emoji.char;
                      _controller.selection = TextSelection.fromPosition(
                        TextPosition(offset: _controller.text.length),
                      );
                    },
                    emojiSize: 32.0,
                    cellSize: 48.0,
                    categoryBarPadding: const EdgeInsets.symmetric(vertical: 8),
                    categoryBarHeight: 30.0,
                    iconSize: 30.0,
                  ),
                ),
            ],
          ),
        )
      ],
    );
  }
}
