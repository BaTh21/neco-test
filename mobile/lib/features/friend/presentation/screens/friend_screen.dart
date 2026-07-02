// lib/features/friend/presentation/screens/friend_screen.dart
import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/home_screen.dart';
import 'package:whisper_space_flutter/features/chat/screens/private/private_chat_screen.dart';
import 'package:whisper_space_flutter/features/friend/presentation/screens/friend_search_screen.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';
import 'package:whisper_space_flutter/utils/snack_bar.dart';

import '../datasources/friend_api_source.dart';

enum FriendStatus {
  friend,
  pending,
  requesting,
  blocked,
}

FriendStatus parseStatus(String status) {
  switch (status.toLowerCase()) {
    case 'friend':
    case 'accepted':
      return FriendStatus.friend;
    case 'pending':
      return FriendStatus.pending;
    case 'request':
    case 'requesting':
      return FriendStatus.requesting;
    case 'blocked':
      return FriendStatus.blocked;
    default:
      return FriendStatus.friend;
  }
}

class FriendBox extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final FriendStatus status;
  final Widget? trailing;
  final int? mutualFriendsCount;

  final VoidCallback? onViewProfile;
  final VoidCallback? onOpenChat;
  final VoidCallback? onCancel;
  final VoidCallback? onAccept;
  final VoidCallback? onBlock;
  final VoidCallback? onUnblock;

  const FriendBox({
    super.key,
    required this.name,
    this.avatarUrl,
    required this.status,
    this.trailing,
    this.mutualFriendsCount,
    this.onViewProfile,
    this.onOpenChat,
    this.onCancel,
    this.onAccept,
    this.onBlock,
    this.onUnblock,
  });

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];

    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
      child: PopupMenuButton<_FriendAction>(
        position: PopupMenuPosition.under,
        offset: const Offset(200, 0),
        onSelected: (action) {
          switch (action) {
            case _FriendAction.viewProfile:
              onViewProfile?.call();
              break;
            case _FriendAction.chat:
              onOpenChat?.call();
              break;
            case _FriendAction.cancel:
              onCancel?.call();
              break;
            case _FriendAction.accept:
              onAccept?.call();
              break;
            case _FriendAction.block:
              onBlock?.call();
              break;
            case _FriendAction.unblock:
              onUnblock?.call();
              break;
          }
        },
        itemBuilder: (context) => _buildMenuItems(status, isDarkMode),
        child: ListTile(
          leading: Stack(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor:
                    isDarkMode ? Colors.grey[800] : Colors.blueGrey,
                backgroundImage: avatarUrl != null && avatarUrl!.isNotEmpty
                    ? NetworkImage(avatarUrl!)
                    : null,
                child: avatarUrl != null && avatarUrl!.isNotEmpty
                    ? null
                    : Text(
                        name.isNotEmpty ? name[0].toUpperCase() : '?',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
              ),
            ],
          ),
          title: Row(
            children: [
              Expanded(
                child: Text(
                  name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                ),
              ),
              if (mutualFriendsCount != null && mutualFriendsCount! > 0)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: isDarkMode ? Colors.grey[800] : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '$mutualFriendsCount',
                    style: TextStyle(
                      fontSize: 11,
                      color: isDarkMode ? Colors.white70 : Colors.grey,
                    ),
                  ),
                ),
            ],
          ),
          subtitle: Text(
            _statusLabel(status),
            style: TextStyle(color: subtitleColor),
          ),
          trailing: Icon(Icons.more_vert, color: textColor),
        ),
      ),
    );
  }

  static String _statusLabel(FriendStatus status) {
    switch (status) {
      case FriendStatus.friend:
        return 'Friend';
      case FriendStatus.pending:
        return 'Pending';
      case FriendStatus.requesting:
        return 'Request';
      case FriendStatus.blocked:
        return 'Blocked';
    }
  }

  static List<PopupMenuEntry<_FriendAction>> _buildMenuItems(
    FriendStatus status,
    bool isDarkMode,
  ) {
    final textColor = isDarkMode ? Colors.white : Colors.black;

    switch (status) {
      case FriendStatus.friend:
        return [
          PopupMenuItem(
            value: _FriendAction.viewProfile,
            child: Text('View Profile', style: TextStyle(color: textColor)),
          ),
          PopupMenuItem(
            value: _FriendAction.chat,
            child: Text('Open Chat', style: TextStyle(color: textColor)),
          ),
          PopupMenuItem(
            value: _FriendAction.block,
            child: Text('Block', style: TextStyle(color: textColor)),
          ),
        ];

      case FriendStatus.pending:
        return [
          PopupMenuItem(
            value: _FriendAction.cancel,
            child: Text('Cancel Request', style: TextStyle(color: textColor)),
          ),
        ];

      case FriendStatus.requesting:
        return [
          PopupMenuItem(
            value: _FriendAction.accept,
            child: Text('Accept', style: TextStyle(color: textColor)),
          ),
          PopupMenuItem(
            value: _FriendAction.block,
            child: Text('Block', style: TextStyle(color: textColor)),
          ),
        ];

      case FriendStatus.blocked:
        return [
          PopupMenuItem(
            value: _FriendAction.unblock,
            child: Text('Unblock', style: TextStyle(color: textColor)),
          ),
        ];
    }
  }
}

enum _FriendAction {
  viewProfile,
  chat,
  cancel,
  accept,
  block,
  unblock,
}

class EnhancedSuggestFriendBox extends StatelessWidget {
  final String name;
  final String? avatarUrl;
  final int mutualFriendsCount;
  final List<dynamic> mutualFriends;
  final bool isOnline;
  final VoidCallback? onAdd;
  final VoidCallback? onViewProfile;

  const EnhancedSuggestFriendBox({
    super.key,
    required this.name,
    this.avatarUrl,
    required this.mutualFriendsCount,
    required this.mutualFriends,
    this.isOnline = false,
    this.onAdd,
    this.onViewProfile,
  });

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;

    return SizedBox(
      width: 160,
      child: Card(
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
        color: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
        child: InkWell(
          onTap: onViewProfile,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  children: [
                    CircleAvatar(
                      radius: 40,
                      backgroundColor:
                          isDarkMode ? Colors.grey[800] : Colors.blueGrey,
                      backgroundImage:
                          avatarUrl != null && avatarUrl!.isNotEmpty
                              ? NetworkImage(avatarUrl!)
                              : null,
                      child: avatarUrl != null && avatarUrl!.isNotEmpty
                          ? null
                          : Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 24),
                            ),
                    ),
                    if (isOnline)
                      Positioned(
                        bottom: 0,
                        right: 0,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  name,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: textColor,
                  ),
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                if (mutualFriendsCount > 0) _buildMutualFriendsChip(isDarkMode),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: onAdd,
                  icon: const Icon(Icons.person_add, size: 16),
                  label: const Text('Add', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).primaryColor,
                    foregroundColor: Colors.white,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    minimumSize: const Size(100, 32),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildMutualFriendsChip(bool isDarkMode) {
    if (mutualFriends.isEmpty) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: isDarkMode ? Colors.grey[800] : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          '$mutualFriendsCount mutual',
          style: TextStyle(
            fontSize: 10,
            color: isDarkMode ? Colors.white70 : Colors.grey,
          ),
        ),
      );
    }

    String mutualText = '';
    if (mutualFriends.length == 1) {
      mutualText = mutualFriends[0]['username'];
    } else if (mutualFriends.length == 2) {
      mutualText =
          '${mutualFriends[0]['username']} and ${mutualFriends[1]['username']}';
    } else {
      mutualText =
          '${mutualFriends[0]['username']}, ${mutualFriends[1]['username']} and ${mutualFriends.length - 2} others';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isDarkMode ? Colors.grey[800] : Colors.grey.shade200,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.people,
            size: 12,
            color: isDarkMode ? Colors.white70 : Colors.grey,
          ),
          const SizedBox(width: 4),
          Flexible(
            child: Text(
              mutualText,
              style: TextStyle(
                fontSize: 10,
                color: isDarkMode ? Colors.white70 : Colors.grey,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 1,
            ),
          ),
        ],
      ),
    );
  }
}

class SuggestionSectionHeader extends StatelessWidget {
  final String title;
  final VoidCallback? onViewAll;
  final int itemCount;

  const SuggestionSectionHeader({
    super.key,
    required this.title,
    this.onViewAll,
    required this.itemCount,
  });

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
          ),
          if (onViewAll != null && itemCount > 5)
            TextButton(
              onPressed: onViewAll,
              child: Text(
                'View All',
                style: TextStyle(color: Theme.of(context).primaryColor),
              ),
            ),
        ],
      ),
    );
  }
}

class FriendScreen extends StatefulWidget {
  final GlobalWebsocket ws;
  final Function(
    CallStatus status, {
    String? userName,
    String? avatar,
    bool isVideo,
  }) onCallStateChanged;

  const FriendScreen({super.key, required this.ws, required this.onCallStateChanged});

  @override
  State<FriendScreen> createState() => _FriendScreenState();
}

class _FriendScreenState extends State<FriendScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late FriendAPISource friendApi;

  bool isLoading = true;
  bool isLoadingSuggestions = false;

  List<Map<String, dynamic>> suggestFriends = [];
  List<Map<String, dynamic>> allFriends = [];
  List<Map<String, dynamic>> pendingFriends = [];
  List<Map<String, dynamic>> requestFriends = [];
  List<Map<String, dynamic>> blockedFriends = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    initServicesAndLoad();
  }

  Future<void> initServicesAndLoad() async {
    final storageService = StorageService();
    await storageService.init();

    friendApi = FriendAPISource(storageService: storageService);
    await loadFriends();
    await loadSuggestions();
  }

  List<Map<String, dynamic>> _mapAllFriends(List<dynamic> list) {
    return list.map<Map<String, dynamic>>((f) {
      return {
        'id': f['id'].toString(),
        'name': f['username'] ?? '',
        'avatar': f['avatar_url'] ?? '',
        'status': f['status'] ?? '',
        'email': f['email'] ?? '',
      };
    }).toList();
  }

  List<Map<String, dynamic>> _mapPendingFriends(List<dynamic> list) {
    return list.map<Map<String, dynamic>>((f) {
      return {
        'pending_id': f['id'].toString(),
        'id': f['friend']['id'].toString(),
        'name': f['friend']['username'] ?? '',
        'avatar': f['friend']['avatar_url'] ?? '',
        'status': f['status'] ?? '',
        'email': f['friend']['email'] ?? '',
      };
    }).toList();
  }

  List<Map<String, dynamic>> _mapRequestingFriends(List<dynamic> list) {
    return list.map<Map<String, dynamic>>((f) {
      return {
        'id': f['requester_id'].toString(),
        'name': f['requester_username'] ?? '',
        'avatar': f['requester_avatar_url'] ?? '',
        'status': f['status'] ?? '',
        'email': f['requester_email'] ?? '',
      };
    }).toList();
  }

  List<Map<String, dynamic>> _mapBlockedUsers(List<dynamic> list) {
    return list.map<Map<String, dynamic>>((f) {
      return {
        'id': f['id'].toString(),
        'name': f['username'] ?? '',
        'avatar': f['avatar_url'] ?? '',
        'status': f['status'] ?? '',
        'email': f['email'] ?? '',
      };
    }).toList();
  }

  List<Map<String, dynamic>> _mapSuggestedUsers(List<dynamic> list) {
    return list.map<Map<String, dynamic>>((f) {
      return {
        'id': f['id'].toString(),
        'name': f['username'] ?? '',
        'avatar': f['avatar_url'] ?? '',
        'email': f['email'] ?? '',
        'mutual_friends_count': f['mutual_friends_count'] ?? 0,
        'mutual_friends': f['mutual_friends'] ?? [],
        'is_online': f['is_online'] ?? false,
      };
    }).toList();
  }

  Future<void> loadSuggestions() async {
    setState(() {
      isLoadingSuggestions = true;
    });

    try {
      final suggestionData = await friendApi.getFriendSuggestions(limit: 10);
      if (mounted) {
        setState(() {
          suggestFriends = _mapSuggestedUsers(suggestionData);
          isLoadingSuggestions = false;
        });
      }
    } catch (e) {
      debugPrint('Error loading suggestions: $e');
      if (mounted) {
        setState(() {
          isLoadingSuggestions = false;
        });
      }
    }
  }

  Future<void> loadFriends() async {
    try {
      final pendingData = await friendApi.getPendingRequests();
      final requestingData = await friendApi.getRequestingUsers();
      final blockedData = await friendApi.getBlockedUsers();
      final data = await friendApi.getFriends();

      if (!mounted) return;

      setState(() {
        allFriends = _mapAllFriends(data);
        pendingFriends = _mapPendingFriends(pendingData);
        requestFriends = _mapRequestingFriends(requestingData);
        blockedFriends = _mapBlockedUsers(blockedData);
        isLoading = false;
      });
    } catch (e) {
      debugPrint('Error loading friend: $e');
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  Future<void> _handleAddSuggestion(int userId, String userName) async {
    try {
      final response = await friendApi.addFriend(userId);

      if (mounted) {
        showTopSnackBar(context, response['msg']);
        await loadSuggestions();
        await loadFriends();
      }
    } catch (e) {
      if (mounted) {
        showTopSnackBar(context, e.toString().replaceAll('Exception: ', ''));
      }
    }
  }

  void _navigateToAddFriends() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => const AddFriendScreen(),
      ),
    ).then((_) {
      loadSuggestions();
      loadFriends();
    });
  }

  void _navigateToViewAllSuggestions() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => AllSuggestionsScreen(
          initialSuggestions: suggestFriends,
          friendApi: friendApi,
          onAddFriend: _handleAddSuggestion,
        ),
      ),
    ).then((_) {
      loadSuggestions();
      loadFriends();
    });
  }

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final tabBarBgColor =
        isDarkMode ? const Color(0xFF2C2C2C) : const Color(0xFFE0C3FF);
    final indicatorColor =
        isDarkMode ? const Color(0xFF00BCD4) : const Color(0xFF6A11CB);
    final unselectedColor = isDarkMode ? Colors.white54 : Colors.grey.shade600;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await loadFriends();
          await loadSuggestions();
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Friends Tabs Section
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Your Friends',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: textColor,
                          ),
                    ),
                    IconButton(
                      icon: Icon(
                        Icons.person_add,
                        color: textColor,
                      ),
                      onPressed: _navigateToAddFriends,
                      tooltip: 'Add Friends',
                    ),
                  ],
                ),
              ),

              // Modern Tab Bar - Matching Notes Tab Style
              Container(
                width: double.infinity,
                margin: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: tabBarBgColor,
                  borderRadius: BorderRadius.circular(30),
                ),
                child: TabBar(
                  controller: _tabController,
                  isScrollable: false,
                  indicatorColor: Colors.transparent,
                  dividerColor: Colors.transparent,
                  indicator: BoxDecoration(
                    color: indicatorColor,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  labelColor: isDarkMode ? Colors.black : Colors.white,
                  unselectedLabelColor: unselectedColor,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 13,
                  ),
                  tabs: const [
                    Tab(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text("All Friends", textAlign: TextAlign.center),
                      ),
                    ),
                    Tab(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text("Pending", textAlign: TextAlign.center),
                      ),
                    ),
                    Tab(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text("Requests", textAlign: TextAlign.center),
                      ),
                    ),
                    Tab(
                      child: Padding(
                        padding: EdgeInsets.symmetric(vertical: 12),
                        child: Text("Blocked", textAlign: TextAlign.center),
                      ),
                    ),
                  ],
                ),
              ),

              SizedBox(
                height: 400,
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildFriendsList(allFriends, FriendStatus.friend),
                    _buildFriendsList(pendingFriends, FriendStatus.pending),
                    _buildFriendsList(requestFriends, FriendStatus.requesting),
                    _buildFriendsList(blockedFriends, FriendStatus.blocked),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildViewMoreBox() {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    return SizedBox(
      width: 160,
      child: Card(
        color: isDarkMode ? Colors.grey[800] : Colors.grey.shade100,
        margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        child: InkWell(
          onTap: _navigateToViewAllSuggestions,
          borderRadius: BorderRadius.circular(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: isDarkMode ? Colors.grey[700] : Colors.grey.shade300,
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  Icons.arrow_forward,
                  size: 30,
                  color: isDarkMode ? Colors.white70 : Colors.grey,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'View All',
                style: TextStyle(
                  color:
                      isDarkMode ? Colors.cyan.shade300 : Colors.blue.shade700,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '${suggestFriends.length} suggestions',
                style: TextStyle(
                  color: isDarkMode ? Colors.white54 : Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildFriendsList(
      List<Map<String, dynamic>> friends, FriendStatus status) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];

    if (friends.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _getEmptyStateIcon(status),
              size: 64,
              color: isDarkMode ? Colors.white38 : Colors.grey.shade400,
            ),
            const SizedBox(height: 16),
            Text(
              _getEmptyStateText(status),
              style: TextStyle(
                color: isDarkMode ? Colors.white54 : Colors.grey.shade600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(8),
      itemCount: friends.length,
      itemBuilder: (context, index) {
        final f = friends[index];
        return FriendBox(
          name: f['name']!,
          avatarUrl: f['avatar'],
          status: status,
          onViewProfile: () {
            debugPrint('View profile ${f['name']}');
          },
          onOpenChat: () {
            // 👇 NEW: Navigate to private chat
            final friendId = int.tryParse(f['id'] ?? '');
            if (friendId == null) {
              debugPrint('Invalid friend ID: ${f['id']}');
              return;
            }
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => PrivateChatScreen(
                  userId: friendId,
                  userName: f['name']!,
                  avatarUrl:
                      f['avatar'] != null && f['avatar'].toString().isNotEmpty
                          ? f['avatar']
                          : null,
                  globalWebsocket: widget.ws,
                  onCallStateChanged: widget.onCallStateChanged,

                ),
              ),
            );
          },
          onCancel: status == FriendStatus.pending
              ? () async {
                  final id = int.tryParse(f['pending_id'] ?? '');
                  if (id == null) return;
                  try {
                    await friendApi.cancelPending(id);
                    await loadFriends();
                  } catch (e) {
                    showTopSnackBar(context, e.toString());
                  }
                }
              : null,
          onAccept: status == FriendStatus.requesting
              ? () async {
                  final id = int.tryParse(f['id'] ?? '');
                  if (id == null) return;
                  try {
                    await friendApi.acceptFriendRequest(id);
                    await loadFriends();
                    await loadSuggestions();
                  } catch (e) {
                    showTopSnackBar(context, e.toString());
                  }
                }
              : null,
          onBlock:
              status == FriendStatus.friend || status == FriendStatus.requesting
                  ? () async {
                      final id = int.tryParse(f['id'] ?? '');
                      if (id == null) return;
                      try {
                        await friendApi.blockUser(id);
                        await loadFriends();
                        await loadSuggestions();
                      } catch (e) {
                        showTopSnackBar(context, e.toString());
                      }
                    }
                  : null,
          onUnblock: status == FriendStatus.blocked
              ? () async {
                  final id = int.tryParse(f['id'] ?? '');
                  if (id == null) return;
                  try {
                    await friendApi.unblockUser(id);
                    await loadFriends();
                    await loadSuggestions();
                  } catch (e) {
                    showTopSnackBar(context, e.toString());
                  }
                }
              : null,
        );
      },
    );
  }

  IconData _getEmptyStateIcon(FriendStatus status) {
    switch (status) {
      case FriendStatus.friend:
        return Icons.people_outline;
      case FriendStatus.pending:
        return Icons.hourglass_empty;
      case FriendStatus.requesting:
        return Icons.person_add_disabled;
      case FriendStatus.blocked:
        return Icons.block;
    }
  }

  String _getEmptyStateText(FriendStatus status) {
    switch (status) {
      case FriendStatus.friend:
        return 'No friends yet.\nConnect with people you may know above!';
      case FriendStatus.pending:
        return 'No pending requests';
      case FriendStatus.requesting:
        return 'No friend requests';
      case FriendStatus.blocked:
        return 'No blocked users';
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }
}

class AllSuggestionsScreen extends StatefulWidget {
  final List<Map<String, dynamic>> initialSuggestions;
  final FriendAPISource friendApi;
  final Function(int, String) onAddFriend;

  const AllSuggestionsScreen({
    super.key,
    required this.initialSuggestions,
    required this.friendApi,
    required this.onAddFriend,
  });

  @override
  State<AllSuggestionsScreen> createState() => _AllSuggestionsScreenState();
}

class _AllSuggestionsScreenState extends State<AllSuggestionsScreen> {
  late List<Map<String, dynamic>> suggestions;
  bool isLoading = false;

  @override
  void initState() {
    super.initState();
    suggestions = List.from(widget.initialSuggestions);
  }

  Future<void> _refreshSuggestions() async {
    setState(() => isLoading = true);
    try {
      final newSuggestions =
          await widget.friendApi.getFriendSuggestions(limit: 20);
      if (mounted) {
        setState(() {
          suggestions = List<Map<String, dynamic>>.from(newSuggestions);
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'People You May Know',
          style: TextStyle(color: textColor),
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: textColor),
            onPressed: _refreshSuggestions,
          ),
        ],
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _refreshSuggestions,
              child: suggestions.isEmpty
                  ? ListView(
                      children: [
                        SizedBox(
                          height: MediaQuery.of(context).size.height * 0.3,
                        ),
                        Center(
                          child: Column(
                            children: [
                              Icon(
                                Icons.people_outline,
                                size: 80,
                                color:
                                    isDarkMode ? Colors.white38 : Colors.grey,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No suggestions available',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: subtitleColor,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: suggestions.length,
                      itemBuilder: (context, index) {
                        final user = suggestions[index];
                        final userId = int.tryParse(user['id'] ?? '');

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          color: isDarkMode
                              ? const Color(0xFF1E1E1E)
                              : Colors.white,
                          child: ListTile(
                            contentPadding: const EdgeInsets.all(12),
                            leading: Stack(
                              children: [
                                CircleAvatar(
                                  radius: 30,
                                  backgroundColor: isDarkMode
                                      ? Colors.grey[800]
                                      : Colors.blueGrey,
                                  backgroundImage: user['avatar'] != null &&
                                          user['avatar'].toString().isNotEmpty
                                      ? NetworkImage(user['avatar'])
                                      : null,
                                  child: user['avatar'] == null ||
                                          user['avatar'].toString().isEmpty
                                      ? Text(
                                          user['name'][0].toUpperCase(),
                                          style: const TextStyle(
                                            color: Colors.white,
                                            fontWeight: FontWeight.bold,
                                            fontSize: 20,
                                          ),
                                        )
                                      : null,
                                ),
                                if (user['is_online'] == true)
                                  Positioned(
                                    bottom: 0,
                                    right: 0,
                                    child: Container(
                                      width: 14,
                                      height: 14,
                                      decoration: BoxDecoration(
                                        color: Colors.green,
                                        shape: BoxShape.circle,
                                        border: Border.all(
                                            color: Colors.white, width: 2),
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                            title: Text(
                              user['name'],
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: textColor,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  user['email'] ?? '',
                                  style: TextStyle(color: subtitleColor),
                                ),
                                if (user['mutual_friends_count'] > 0) ...[
                                  const SizedBox(height: 4),
                                  _buildMutualFriendsText(user, isDarkMode),
                                ],
                              ],
                            ),
                            trailing: ElevatedButton(
                              onPressed: userId == null
                                  ? null
                                  : () async {
                                      await widget.onAddFriend(
                                          userId, user['name']);
                                      if (mounted) {
                                        setState(() {
                                          suggestions.removeAt(index);
                                        });
                                      }
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).primaryColor,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(20),
                                ),
                              ),
                              child: const Text('Add'),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }

  Widget _buildMutualFriendsText(Map<String, dynamic> user, bool isDarkMode) {
    final count = user['mutual_friends_count'] ?? 0;
    final mutualFriends = user['mutual_friends'] ?? [];

    if (mutualFriends.isEmpty) {
      return Text(
        '$count mutual ${count == 1 ? 'friend' : 'friends'}',
        style: TextStyle(
          fontSize: 12,
          color: isDarkMode ? Colors.white70 : Colors.grey,
        ),
      );
    }

    String names = '';
    if (mutualFriends.length == 1) {
      names = mutualFriends[0]['username'];
    } else if (mutualFriends.length == 2) {
      names =
          '${mutualFriends[0]['username']} and ${mutualFriends[1]['username']}';
    } else {
      names =
          '${mutualFriends[0]['username']}, ${mutualFriends[1]['username']} and ${mutualFriends.length - 2} others';
    }

    return Row(
      children: [
        Icon(
          Icons.people,
          size: 14,
          color: isDarkMode ? Colors.white70 : Colors.grey,
        ),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            names,
            style: TextStyle(
              fontSize: 12,
              color: isDarkMode ? Colors.white70 : Colors.grey,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
