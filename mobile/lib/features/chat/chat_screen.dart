import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';

import './chat_api_service.dart';
import './model/chat_model/chat_list_model.dart';
import './screens/group/group_chat_screen.dart';
import './screens/private/private_chat_screen.dart';
import 'create_group_dialog.dart';

String _formatTime(DateTime dateTime) {
  final diff = DateTime.now().difference(dateTime);
  if (diff.inMinutes < 60) {
    return "${diff.inMinutes}m";
  } else if (diff.inHours < 24) {
    return "${diff.inHours}h";
  } else {
    return "${diff.inDays}d";
  }
}

class ChatScreen extends StatefulWidget {
  final GlobalWebsocket ws;
  final Function(
    CallStatus status, {
    String? userName,
    String? avatar,
    bool isVideo,
  }) onCallStateChanged;

  const ChatScreen({super.key, required this.ws, required this.onCallStateChanged});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late final ChatAPISource chatApi;

  List<ChatListItemModel> chats = [];
  List<ChatListItemModel> filteredChats = [];
  bool isLoading = true;
  String? error;
  String searchQuery = '';

  @override
  void initState() {
    super.initState();
    initServicesAndLoad();
  }

  Future<void> initServicesAndLoad() async {
    final storageService = StorageService();
    await storageService.init();

    chatApi = ChatAPISource(storageService: storageService);

    _loadChats();
  }

  Future<void> _loadChats() async {
    try {
      final result = await chatApi.getChats();
      setState(() {
        chats = result;
        _filterChats();
        isLoading = false;
      });
    } catch (e) {
      setState(() {
        error = e.toString();
        isLoading = false;
      });
    }
  }

  void _filterChats() {
    if (searchQuery.isEmpty) {
      filteredChats = chats;
    } else {
      filteredChats = chats
          .where((chat) =>
              chat.name.toLowerCase().contains(searchQuery.toLowerCase()))
          .toList();
    }
  }

  Future<void> _openCreateGroupDialog() async {
    final createdGroup = await showDialog(
        context: context, builder: (_) => CreateGroupDialog(chatApi: chatApi));

    if (createdGroup != null) {
      await _loadChats();
    }
  }

  Widget _buildAvatar(ChatListItemModel chat) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    if (chat.type == 'group') {
      return Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              image: chat.avatar != null
                  ? DecorationImage(
                      image: NetworkImage(chat.avatar!), fit: BoxFit.cover)
                  : null,
              color: isDarkMode ? Colors.grey[800] : Colors.grey[300],
            ),
            child: chat.avatar == null
                ? Center(
                    child: Text(
                      chat.name[0].toUpperCase(),
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: isDarkMode ? Colors.white : Colors.black87,
                      ),
                    ),
                  )
                : null,
          ),
          if (chat.creator != null)
            Positioned(
              bottom: -5,
              left: -5,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isDarkMode ? Colors.grey[800]! : Colors.white,
                    width: 1.5,
                  ),
                  color: isDarkMode ? Colors.grey[700] : Colors.grey[300],
                  image: chat.creator?.avatar != null
                      ? DecorationImage(
                          image: NetworkImage(chat.creator!.avatar!),
                          fit: BoxFit.cover,
                        )
                      : null,
                ),
                alignment: Alignment.center,
                child: chat.creator?.avatar == null
                    ? Text(
                        chat.creator?.username != null &&
                                chat.creator!.username!.isNotEmpty
                            ? chat.creator!.username![0].toUpperCase()
                            : "?",
                        style: TextStyle(
                          color: isDarkMode ? Colors.white : Colors.black,
                          fontWeight: FontWeight.bold,
                          fontSize: 10,
                        ),
                      )
                    : null,
              ),
            ),
        ],
      );
    } else {
      return SizedBox(
        width: 48,
        height: 48,
        child: CircleAvatar(
          backgroundColor: isDarkMode ? Colors.grey[800] : Colors.grey[300],
          child: Text(
            chat.name[0].toUpperCase(),
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: isDarkMode ? Colors.white : Colors.black87,
            ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final searchBarColor =
        isDarkMode ? const Color(0xFF2C2C2C) : Colors.grey[200];
    final hintColor = isDarkMode ? Colors.white54 : Colors.grey[400];
    final iconColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final tileColor = isDarkMode ? const Color(0xFF1E1E1E) : Colors.white;

    return Scaffold(
      backgroundColor: isDarkMode ? const Color(0xFF121212) : Colors.white,
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Text(
                    error!,
                    style: TextStyle(
                      color: isDarkMode ? Colors.red.shade300 : Colors.red,
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadChats,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header with Create Button
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'All Chats',
                                  style: Theme.of(context)
                                      .textTheme
                                      .titleLarge
                                      ?.copyWith(
                                        color: textColor,
                                        fontWeight: FontWeight.bold,
                                      ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.add_circle_outline,
                                    color: iconColor,
                                  ),
                                  tooltip: 'Create Group',
                                  onPressed: _openCreateGroupDialog,
                                ),
                              ],
                            ),
                          ),

                          // Search Bar
                          Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: TextField(
                              style: TextStyle(
                                color: textColor,
                                fontSize: 16,
                              ),
                              decoration: InputDecoration(
                                hintText: 'Search chats...',
                                hintStyle: TextStyle(
                                  color: hintColor,
                                  fontSize: 14,
                                ),
                                prefixIcon: Icon(
                                  Icons.search,
                                  color: iconColor,
                                ),
                                border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none,
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide(
                                    color: Theme.of(context).primaryColor,
                                    width: 2,
                                  ),
                                ),
                                filled: true,
                                fillColor: searchBarColor,
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 16,
                                  vertical: 14,
                                ),
                              ),
                              onChanged: (value) {
                                setState(() {
                                  searchQuery = value;
                                  _filterChats();
                                });
                              },
                              onSubmitted: (value) {
                                setState(() {
                                  searchQuery = value;
                                  _filterChats();
                                });
                              },
                            ),
                          ),

                          // Chat List
                          filteredChats.isEmpty
                              ? Padding(
                                  padding: const EdgeInsets.all(32.0),
                                  child: Center(
                                    child: Column(
                                      children: [
                                        Icon(
                                          Icons.chat_bubble_outline,
                                          size: 64,
                                          color: isDarkMode
                                              ? Colors.white38
                                              : Colors.grey[400],
                                        ),
                                        const SizedBox(height: 16),
                                        Text(
                                          searchQuery.isEmpty
                                              ? 'No chats yet'
                                              : 'No chats found',
                                          style: TextStyle(
                                            fontSize: 16,
                                            color: subtitleColor,
                                          ),
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          searchQuery.isEmpty
                                              ? 'Start a new conversation'
                                              : 'Try a different search term',
                                          style: TextStyle(
                                            fontSize: 14,
                                            color: hintColor,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                              : ListView.builder(
                                  physics: const NeverScrollableScrollPhysics(),
                                  shrinkWrap: true,
                                  itemCount: filteredChats.length,
                                  itemBuilder: (context, index) {
                                    final chat = filteredChats[index];
                                    return ListTile(
                                      leading: _buildAvatar(chat),
                                      title: Text(
                                        chat.name,
                                        style: TextStyle(
                                          fontWeight: FontWeight.w600,
                                          color: textColor,
                                          fontSize: 16,
                                        ),
                                      ),
                                      subtitle: Text(
                                        chat.lastMessage ??
                                            'Tap to start new message',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: TextStyle(
                                          color: subtitleColor,
                                          fontSize: 13,
                                        ),
                                      ),
                                      trailing: Text(
                                        _formatTime(chat.updatedAt),
                                        style: TextStyle(
                                          color: subtitleColor,
                                          fontSize: 12,
                                        ),
                                      ),
                                      tileColor: tileColor,
                                      onTap: () {
                                        if (chat.type == 'group') {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => GroupChatScreen(
                                                groupId: chat.id,
                                                groupName: chat.name,
                                                chatApi: chatApi,
                                                onRefreshChats: _loadChats,
                                                storageService:
                                                    chatApi.storageService,
                                                globalWebsocket: widget.ws,
                                                onCallStateChanged: widget.onCallStateChanged,
                                              ),
                                            ),
                                          );
                                        } else {
                                          Navigator.push(
                                            context,
                                            MaterialPageRoute(
                                              builder: (_) => PrivateChatScreen(
                                                userId: chat.id,
                                                userName: chat.name,
                                                avatarUrl: chat.avatar,
                                                onChatUpdated: _loadChats,
                                                globalWebsocket: widget.ws,
                                                onCallStateChanged: widget.onCallStateChanged,
                                              ),
                                            ),
                                          );
                                        }
                                      },
                                    );
                                  },
                                ),
                        ],
                      ),
                    ),
                  ),
                ),
    );
  }
}
