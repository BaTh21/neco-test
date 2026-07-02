import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';
import 'package:whisper_space_flutter/features/chat/chat_api_service.dart';
import 'package:whisper_space_flutter/features/chat/model/group_model/group_details_model.dart';
import 'package:whisper_space_flutter/features/chat/model/group_model/user_model.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';
import 'group_dialog/group_dialog_page.dart';
import 'package:whisper_space_flutter/features/websocket/group_websocket.dart';
import 'group_message_screen.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';

class GroupChatScreen extends StatefulWidget {
  final int groupId;
  final String groupName;
  final String? groupCover;
  final ChatAPISource chatApi;
  final Future<void> Function()? onRefreshChats;
  final StorageService storageService;
  final GlobalWebsocket globalWebsocket;
  final Function(
    CallStatus status, {
    String? userName,
    String? avatar,
    bool isVideo,
  }) onCallStateChanged;

  const GroupChatScreen(
      {super.key,
      required this.groupId,
      required this.groupName,
      this.groupCover,
      required this.chatApi,
      this.onRefreshChats,
      required this.storageService,
      required this.globalWebsocket,
      required this.onCallStateChanged});

  @override
  State<GroupChatScreen> createState() => _GroupChatScreenState();
}

class _GroupChatScreenState extends State<GroupChatScreen> {
  GroupWebsocket? groupWs;
  int? _currentUserId;
  GroupDetailsModel? group;
  List<UserModel>? members = [];
  StreamSubscription? _wsSubscription;

  bool isLoading = true;
  String? error;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();
    _init();
  }

  Future<void> _init() async {
    try {
      await _loadGroup();
      await _connectGroupWebsocket();
      setState(() {
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
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

  Future<void> _loadCovers() async {
    try {
      final covers = await widget.chatApi.getGroupCovers(widget.groupId);
      setState(() {
        group!.images = covers;
      });
    } catch (_) {}
  }

  Future<void> _loadGroup() async {
    try {
      final result = await widget.chatApi.getGroupById(widget.groupId);
      final memberData = await widget.chatApi.getGroupMembers(widget.groupId);
      setState(() {
        group = result;
        members = memberData;
        isLoading = false;
      });
      await _loadCovers();
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
  }

  Future<void> _connectGroupWebsocket() async {
    groupWs ??= GroupWebsocket(
      groupId: widget.groupId,
      storageService: widget.storageService,
    );

    try {
      await groupWs!.connect();
      groupWs!.startHeartbeat();
    } catch (e) {
      debugPrint('WebSocket connection failed: $e');
      setState(() {
        error = 'WebSocket connection failed';
      });
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    groupWs?.disconnect();
    super.dispose();
  }

  void _showGroupDialog() {
    if (group == null) return;

    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: false,
        pageBuilder: (_, __, ___) => GroupDialogPage(
          group: group!,
          members: members!,
          currentUserId: _currentUserId!,
          chatApi: widget.chatApi,
          onRefreshChats: widget.onRefreshChats,
          onGroupUpdated: _loadGroup,
        ),
        transitionsBuilder: (_, animation, __, child) {
          const begin = Offset(1.0, 0.0);
          const end = Offset.zero;
          final tween = Tween(begin: begin, end: end)
              .chain(CurveTween(curve: Curves.easeInOut));
          return SlideTransition(
              position: animation.drive(tween), child: child);
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading || _currentUserId == null || groupWs == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: GestureDetector(
          onTap: _showGroupDialog,
          child: Row(
            children: [
              SizedBox(
                width: 48,
                height: 48,
                child: CircleAvatar(
                  radius: 18,
                  backgroundImage:
                      group!.cover != null ? NetworkImage(group!.cover!) : null,
                  backgroundColor: Colors.grey[300],
                  child: group!.cover == null
                      ? Text(
                          group!.name[0].toUpperCase(),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 8),
              Text(group!.name),
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
                                userName: widget.groupName,
                                avatar: widget.groupCover,
                                isVideo: false,
                              );

                              widget.globalWebsocket.send({
                                "type": "call_start",
                                "scope": "group",
                                "group_id": widget.groupId,
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
                                userName: widget.groupName,
                                avatar: widget.groupCover,
                                isVideo: true,
                              );

                              widget.globalWebsocket.send({
                                "type": "call_start",
                                "scope": "group",
                                "group_id": widget.groupId,
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
      body: GroupMessageScreen(
        groupId: widget.groupId,
        currentUserId: _currentUserId!,
        groupWebsocket: groupWs!,
        storageService: widget.storageService,
        chatApi: widget.chatApi,
        initialGroup: group,
      ),
    );
  }
}
