import 'package:flutter/material.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/inbox/inbox_model/inbox_model.dart';
import 'package:whisper_space_flutter/utils/snack_bar.dart';

import 'inbox_api_service.dart';

class InboxDialog extends StatefulWidget {
  final int? unreadCounts;

  const InboxDialog({super.key, this.unreadCounts});

  @override
  State<InboxDialog> createState() => _InboxScreenState();
}

class _InboxScreenState extends State<InboxDialog>
    with SingleTickerProviderStateMixin {
  late final InboxAPISource inboxApi;
  final List<InboxModel> _inboxs = [];
  final Set<int> _selectedIds = {};
  bool _selectionMode = false;

  bool isLoading = true;
  bool isLoadingMore = false;
  bool hasMore = true;
  String? error;

  final int limit = 20;
  int offset = 0;

  late final ScrollController _scrollController;
  late final TabController _tabController;

  List<InboxModel> get inboxs => _inboxs;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _scrollController = ScrollController();
    _scrollController.addListener(_onScroll);
    initServicesAndLoad();
  }

  Future<void> initServicesAndLoad() async {
    final storageService = StorageService();
    await storageService.init();

    inboxApi = InboxAPISource(storageService: storageService);

    if (mounted) {
      await _loadInboxs();
    }
  }

  Future<void> _loadInboxs() async {
    if (!hasMore) return;

    try {
      if (offset == 0) {
        setState(() {
          isLoading = true;
        });
      } else {
        setState(() {
          isLoadingMore = true;
        });
      }

      final data = await inboxApi.getActivities(limit: limit, offset: offset);

      if (mounted) {
        setState(() {
          _inboxs.addAll(data);
          offset += data.length;
          isLoading = false;
          isLoadingMore = false;
          if (data.length < limit) {
            hasMore = false;
          }
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = e.toString();
          isLoading = false;
          isLoadingMore = false;
        });
      }
    }
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !isLoadingMore &&
        hasMore) {
      _loadInboxs();
    }
  }

  void _toggleSelection(InboxModel item) {
    setState(() {
      _selectionMode = true;
      if (_selectedIds.contains(item.id)) {
        _selectedIds.remove(item.id);
        if (_selectedIds.isEmpty) _selectionMode = false;
      } else {
        _selectedIds.add(item.id);
      }
    });
  }

  void _clearSelection() {
    setState(() {
      _selectedIds.clear();
      _selectionMode = false;
    });
  }

  Future<void> _markAllAsRead() async {
    try {
      await inboxApi.markAllActivitiesAsRead();

      if (mounted) {
        setState(() {
          for (int i = 0; i < _inboxs.length; i++) {
            _inboxs[i] = InboxModel(
              id: _inboxs[i].id,
              type: _inboxs[i].type,
              actor: _inboxs[i].actor,
              recipient: _inboxs[i].recipient,
              createdAt: _inboxs[i].createdAt,
              isRead: true,
              postId: _inboxs[i].postId,
              commentId: _inboxs[i].commentId,
              friendRequestId: _inboxs[i].friendRequestId,
              groupId: _inboxs[i].groupId,
              extraData: _inboxs[i].extraData,
            );
          }
        });

        if (mounted) {
          showTopSnackBar(
            context,
            'All marked as read',
            backgroundColor: Colors.green,
          );
        }
      }
    } catch (e) {
      if (mounted) {
        _showError(e);
      }
    }
  }

  Future<void> _deleteSelected() async {
    if (_selectedIds.isEmpty) return;

    try {
      await inboxApi.deleteSelectedActivities(_selectedIds.toList());

      if (mounted) {
        setState(() {
          _inboxs.removeWhere((i) => _selectedIds.contains(i.id));
          _clearSelection();
        });

        showTopSnackBar(
          context,
          'Deleted successfully',
          backgroundColor: Colors.green,
        );
      }
    } catch (e) {
      if (mounted) {
        _showError(e);
      }
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _tabController.dispose();
    super.dispose();
  }

  List<InboxModel> getFilteredInbox(int tabIndex) {
    switch (tabIndex) {
      case 1:
        return _inboxs.where((item) => !item.isRead).toList();
      case 2:
        return _inboxs.where((item) => item.isRead).toList();
      case 0:
      default:
        return _inboxs;
    }
  }

  Future<void> _markActivityAsRead(int activityId) async {
    try {
      await inboxApi.markActivityAsRead(activityId);
      if (mounted) {
        setState(() {
          final index = _inboxs.indexWhere((i) => i.id == activityId);
          if (index != -1) {
            _inboxs[index] = InboxModel(
              id: _inboxs[index].id,
              type: _inboxs[index].type,
              actor: _inboxs[index].actor,
              recipient: _inboxs[index].recipient,
              createdAt: _inboxs[index].createdAt,
              isRead: true,
              postId: _inboxs[index].postId,
              commentId: _inboxs[index].commentId,
              friendRequestId: _inboxs[index].friendRequestId,
              groupId: _inboxs[index].groupId,
              extraData: _inboxs[index].extraData,
            );
          }
        });
      }
    } catch (e) {
      debugPrint('Error marking activity as read: $e');
    }
  }

  Future<void> _acceptActivity(InboxModel item) async {
    if (!mounted) return;

    try {
      bool success = false;
      String successMessage = '';

      if (item.type == 'friend_request' && item.friendRequestId != null) {
        await inboxApi.acceptFriendRequest(item.actor.id);
        success = true;
        successMessage = 'Friend request accepted';
      } else if (item.type == 'group_invite' && item.groupId != null) {
        await inboxApi.acceptGroupInvite(item.groupId!);
        success = true;
        successMessage = 'Group invite accepted';
      }

      if (success && mounted) {
        await _markActivityAsRead(item.id);

        if (mounted) {
          showTopSnackBar(
            context,
            successMessage,
            backgroundColor: Colors.green,
          );
        }
      }
    } catch (e) {
      if (!mounted) return;

      String errorMessage = e.toString().replaceAll('Exception: ', '');

      if (errorMessage.contains('not found')) {
        if (mounted) {
          setState(() {
            _inboxs.removeWhere((i) => i.id == item.id);
          });
          showTopSnackBar(
            context,
            'This request is no longer available',
            backgroundColor: Colors.orange,
          );
        }
      } else if (errorMessage.contains('already')) {
        await _markActivityAsRead(item.id);
        if (mounted) {
          showTopSnackBar(
            context,
            'You are already friends',
            backgroundColor: Colors.blue,
          );
        }
      } else {
        if (mounted) {
          showTopSnackBar(
            context,
            'Failed to accept: $errorMessage',
            backgroundColor: Colors.red,
          );
        }
      }
    }
  }

  // ========== THEME-AWARE UI ==========

  Widget _buildInboxList(List<InboxModel> items) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.inbox_outlined,
              size: 64,
              color: colorScheme.onSurface.withOpacity(0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No messages here',
              style: TextStyle(
                fontSize: 18,
                color: colorScheme.onSurface.withOpacity(0.6),
              ),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      controller: _scrollController,
      itemCount: items.length + (isLoadingMore ? 1 : 0),
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        if (index >= items.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Center(child: CircularProgressIndicator()),
          );
        }

        final item = items[index];
        bool showAcceptButton = item.type == 'friend_request' ||
            item.type == 'group_invite';

        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          // Highlight unread items using the primaryContainer color with opacity
          color: item.isRead
              ? null
              : colorScheme.primaryContainer.withOpacity(0.3),
          child: ListTile(
            leading: _selectionMode
                ? Checkbox(
                    value: _selectedIds.contains(item.id),
                    onChanged: (value) {
                      _toggleSelection(item);
                    },
                  )
                : Stack(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundImage: item.actor.avatarUrl != null
                            ? NetworkImage(item.actor.avatarUrl!)
                            : null,
                        child: item.actor.avatarUrl == null
                            ? Text(
                                item.actor.username.isNotEmpty
                                    ? item.actor.username[0].toUpperCase()
                                    : '?',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                ),
                              )
                            : null,
                      ),
                      if (!item.isRead)
                        Positioned(
                          top: 0,
                          right: 0,
                          child: Container(
                            width: 12,
                            height: 12,
                            decoration: BoxDecoration(
                              color: colorScheme.error,
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: theme.scaffoldBackgroundColor,
                                width: 2,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
            title: Text(
              item.actor.username,
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.extraData ?? ''),
                const SizedBox(height: 4),
                Text(
                  _formatTime(item.createdAt),
                  style: TextStyle(
                    fontSize: 11,
                    color: colorScheme.onSurface.withOpacity(0.6),
                  ),
                ),
              ],
            ),
            trailing: showAcceptButton && !item.isRead
                ? ElevatedButton(
                    onPressed: () {
                      _acceptActivity(item);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.tertiary,
                      foregroundColor: colorScheme.onTertiary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: const Text('Accept'),
                  )
                : null,
            onLongPress: () {
              _toggleSelection(item);
            },
            onTap: () {
              if (_selectionMode) {
                _toggleSelection(item);
              } else if (!item.isRead) {
                _markActivityAsRead(item.id);
              }
            },
          ),
        );
      },
    );
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final difference = now.difference(time);

    if (difference.inDays > 7) {
      return '${time.day}/${time.month}/${time.year}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }

  void _showError(Object e) {
    if (!mounted) return;
    final errorColor = Theme.of(context).colorScheme.error;
    showTopSnackBar(
      context,
      'Error: ${e.toString().replaceAll('Exception: ', '')}',
      backgroundColor: errorColor,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          _selectionMode ? '${_selectedIds.length} selected' : 'Inbox',
        ),
        leading: _selectionMode
            ? IconButton(
                icon: const Icon(Icons.close),
                onPressed: _clearSelection,
              )
            : null,
        actions: [
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'mark_all_read':
                  _markAllAsRead();
                  break;
                case 'delete_selected':
                  _deleteSelected();
                  break;
              }
            },
            itemBuilder: (context) {
              if (_selectionMode) {
                return [
                  const PopupMenuItem(
                    value: 'delete_selected',
                    child: Text('Delete Selected'),
                  ),
                ];
              } else {
                return [
                  const PopupMenuItem(
                    value: 'mark_all_read',
                    child: Text('Mark All as Read'),
                  ),
                ];
              }
            },
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          // Fix: Use white labels for visibility on colored app bar
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'All'),
            Tab(text: 'Unread'),
            Tab(text: 'Read'),
          ],
        ),
      ),
      body: isLoading
          ? const Center(child: CircularProgressIndicator())
          : error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.error_outline,
                        size: 64,
                        color: colorScheme.error,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        error!,
                        style: TextStyle(color: colorScheme.error),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () {
                          setState(() {
                            offset = 0;
                            hasMore = true;
                            _inboxs.clear();
                          });
                          _loadInboxs();
                        },
                        child: const Text('Try Again'),
                      ),
                    ],
                  ),
                )
              : TabBarView(
                  controller: _tabController,
                  children: List.generate(
                    3,
                    (index) => _buildInboxList(getFilteredInbox(index)),
                  ),
                ),
    );
  }
}