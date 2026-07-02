import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';
import 'package:whisper_space_flutter/features/feed/presentation/providers/feed_provider.dart';
import 'package:whisper_space_flutter/features/feed/presentation/screens/create_diary_screen.dart';
import 'package:whisper_space_flutter/features/feed/presentation/screens/edit_diary_full_screen.dart';
import 'package:whisper_space_flutter/shared/widgets/diary_card.dart';

class FeedTab extends StatefulWidget {
  const FeedTab({super.key});

  @override
  State<FeedTab> createState() => _FeedTabState();
}

class _FeedTabState extends State<FeedTab> {
  final ScrollController _scrollController = ScrollController();
  bool _isInitialized = false;
  int? _currentUserId;
  List<Group> _availableGroups = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCurrentUser();
      _loadUserGroups();
      _initializeFeed();
    });
  }

  void _loadCurrentUser() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;
    if (user != null) {
      setState(() {
        _currentUserId = user.id;
      });
      final feedProvider = Provider.of<FeedProvider>(context, listen: false);
      feedProvider.setCurrentUserId(user.id);
    }
  }

  Future<void> _loadUserGroups() async {
    try {
      final feedApiService = Provider.of<FeedApiService>(context, listen: false);
      final groups = await feedApiService.getUserGroups();
      if (mounted) {
        setState(() => _availableGroups = groups);
      }
    } catch (e) {
      debugPrint('Failed to load groups: $e');
    }
  }

  Future<void> _initializeFeed() async {
    try {
      final feedProvider = Provider.of<FeedProvider>(context, listen: false);
      await feedProvider.loadInitialFeed();
      if (mounted) setState(() => _isInitialized = true);
    } catch (e) {
      debugPrint('Failed to initialize feed: $e');
      if (mounted) setState(() => _isInitialized = true);
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<FeedProvider>(
      builder: (context, feedProvider, child) {
        if (!_isInitialized) {
          return const Center(child: CircularProgressIndicator());
        }
        if (feedProvider.error != null && feedProvider.diaries.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 64, color: Colors.red),
                const SizedBox(height: 20),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    feedProvider.error!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: Colors.red),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () {
                    feedProvider.clearError();
                    feedProvider.refreshFeed();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }
        if (feedProvider.diaries.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.feed, size: 64, color: Colors.grey),
                const SizedBox(height: 20),
                const Text('No diaries yet', style: TextStyle(fontSize: 18, color: Colors.grey)),
                const SizedBox(height: 10),
                const Text('Be the first to share something!', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: () => _navigateToCreateDiary(feedProvider),
                  child: const Text('Create First Diary'),
                ),
              ],
            ),
          );
        }
        return RefreshIndicator(
          onRefresh: () => feedProvider.refreshFeed(),
          child: ListView.builder(
            controller: _scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: feedProvider.diaries.length,
            itemBuilder: (context, index) {
              final diary = feedProvider.diaries[index];
              final isOwner = diary.author.id == _currentUserId;
              return DiaryCard(
                diary: diary,
                onLike: () => _handleLike(feedProvider, diary.id),
                onFavorite: () => _handleFavorite(feedProvider, diary.id),
                onComment: (diaryId, content, parentId, replyToUserId) =>
                    _handleComment(feedProvider, diaryId, content, parentId, replyToUserId),
                onEdit: (diaryToEdit) => _handleEditDiary(context, feedProvider, diaryToEdit),
                onDelete: (diaryId) => _handleDeleteDiary(context, feedProvider, diaryId),
                isOwner: isOwner,
              );
            },
          ),
        );
      },
    );
  }

  void _handleLike(FeedProvider feedProvider, int diaryId) async {
    try {
      await feedProvider.likeDiary(diaryId);
    } catch (e) {
      _showErrorSnackBar('Failed to like diary: $e');
    }
  }

  void _handleFavorite(FeedProvider feedProvider, int diaryId) async {
    if (_currentUserId == null) {
      _showErrorSnackBar('User not loaded');
      return;
    }
    try {
      final diary = feedProvider.diaries.firstWhere((d) => d.id == diaryId);
      final isFavorited = diary.favoritedUserIds.contains(_currentUserId);
      if (isFavorited) {
        await feedProvider.removeFromFavorites(diaryId);
        _showSuccessSnackBar('Removed from favorites');
      } else {
        await feedProvider.saveToFavorites(diaryId);
        _showSuccessSnackBar('Added to favorites');
      }
    } catch (e) {
      _showErrorSnackBar('Failed to update favorites: $e');
    }
  }

  void _handleComment(FeedProvider feedProvider, int diaryId, String content,
      int? parentId, int? replyToUserId) async {
    try {
      await feedProvider.createComment(
        diaryId: diaryId,
        content: content,
        parentId: parentId,
        replyToUserId: replyToUserId,
      );
      _showSuccessSnackBar('Comment posted!');
    } catch (e) {
      _showErrorSnackBar('Failed to post comment: $e');
    }
  }

  void _handleEditDiary(BuildContext context, FeedProvider provider, DiaryModel diary) async {
    if (_availableGroups.isEmpty) {
      await _loadUserGroups();
    }
    try {
      final result = await Navigator.push<DiaryModel?>(
        context,
        MaterialPageRoute(
          builder: (context) => EditDiaryFullScreen(
            diary: diary,
            onUpdate: (updatedDiary) async {
              return await provider.updateDiary(
                diaryId: updatedDiary.id,
                title: updatedDiary.title,
                content: updatedDiary.content,
                shareType: updatedDiary.shareType,
                groupIds: updatedDiary.groups.map((g) => g.id).toList(),
                imageUrls: updatedDiary.images,
                videoUrls: updatedDiary.videos,
              );
            },
            availableGroups: _availableGroups,
          ),
        ),
      );
      if (result != null && mounted) _showSuccessSnackBar('Diary updated successfully!');
    } catch (e) {
      _showErrorSnackBar('Failed to edit diary: $e');
    }
  }

  void _handleDeleteDiary(BuildContext context, FeedProvider feedProvider, int diaryId) async {
    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Delete Diary'),
            content: const Text('Are you sure you want to delete this diary? This action cannot be undone.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
              TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete', style: TextStyle(color: Colors.red))),
            ],
          ),
        ) ??
        false;
    if (confirmed) {
      try {
        await feedProvider.deleteDiary(diaryId);
        _showSuccessSnackBar('Diary deleted successfully');
      } catch (e) {
        _showErrorSnackBar('Failed to delete diary: $e');
      }
    }
  }

  void _navigateToCreateDiary(FeedProvider feedProvider) {
    final feedApiService = Provider.of<FeedApiService>(context, listen: false);
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateDiaryScreen(
          feedApiService: feedApiService,
          onDiaryCreated: (DiaryModel diary) {
            feedProvider.diaries.insert(0, diary);
            _showSuccessSnackBar('Created: "${diary.title}"');
            if (_scrollController.hasClients) {
              _scrollController.animateTo(
                0,
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
              );
            }
          },
        ),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.green, duration: const Duration(seconds: 2)),
      );
    }
  }

  void _showErrorSnackBar(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: Colors.red, duration: const Duration(seconds: 3)),
      );
    }
  }
}