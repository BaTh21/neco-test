// lib/features/feed/presentation/screens/shared_diary_screen.dart

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';
import 'package:whisper_space_flutter/shared/widgets/diary_card.dart';

class SharedDiaryScreen extends StatefulWidget {
  final String token;
  
  const SharedDiaryScreen({super.key, required this.token});

  @override
  State<SharedDiaryScreen> createState() => _SharedDiaryScreenState();
}

class _SharedDiaryScreenState extends State<SharedDiaryScreen> {
  DiaryModel? _diary;
  bool _isLoading = true;
  String? _error;
  bool _isAuthenticated = false;

  @override
  void initState() {
    super.initState();
    _checkAuthAndLoad();
  }

  Future<void> _checkAuthAndLoad() async {
    // Check if user is authenticated
    try {
      final storageService = Provider.of<StorageService>(context, listen: false);
      final token = await storageService.getToken();
      setState(() {
        _isAuthenticated = token != null;
      });
    } catch (e) {
      // If StorageService not available, assume not authenticated
      setState(() {
        _isAuthenticated = false;
      });
    }
    await _loadSharedDiary();
  }

  Future<void> _loadSharedDiary() async {
    try {
      final feedApiService = Provider.of<FeedApiService>(context, listen: false);
      final diary = await feedApiService.getSharedDiary(widget.token);
      
      if (mounted) {
        setState(() {
          _diary = diary;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _handleLogin() {
    // Navigate to login and come back after successful login
    context.go('/login', extra: {'returnTo': '/shared/diary/${widget.token}'});
  }

  Future<void> _handleLike() async {
    if (!_isAuthenticated) {
      _showLoginRequired();
      return;
    }
    
    try {
      final feedApiService = Provider.of<FeedApiService>(context, listen: false);
      await feedApiService.likeDiary(_diary!.id);
      // Refresh diary to get updated like status
      await _loadSharedDiary();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Like updated!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to like: $e')),
        );
      }
    }
  }

  Future<void> _handleFavorite() async {
    if (!_isAuthenticated) {
      _showLoginRequired();
      return;
    }
    
    try {
      final feedApiService = Provider.of<FeedApiService>(context, listen: false);
      await feedApiService.saveToFavorites(_diary!.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Added to favorites')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $e')),
        );
      }
    }
  }

  Future<void> _handleComment(int diaryId, String content, int? parentId, int? replyToUserId) async {
    if (!_isAuthenticated) {
      _showLoginRequired();
      return;
    }
    
    try {
      final feedApiService = Provider.of<FeedApiService>(context, listen: false);
      await feedApiService.createComment(
        diaryId: diaryId,
        content: content,
        parentId: parentId,
        replyToUserId: replyToUserId,
      );
      await _loadSharedDiary(); // Refresh to show new comment
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comment posted!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to post comment: $e')),
        );
      }
    }
  }

  void _showLoginRequired() {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Please login to interact with this diary'),
          action: SnackBarAction(
            label: 'Login',
            onPressed: _handleLogin,
          ),
        ),
      );
    }
  }

  Future<void> _shareDiaryLink() async {
    final currentUrl = 'https://whisperspace.app/shared/diary/${widget.token}';
    // You can add share functionality here
    // await Share.share('Check out this diary on NECO360:\n$currentUrl');
  }

  int _getCurrentUserId() {
    // TODO: Get from your auth provider when available
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Loading...'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/home'),
          ),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    
    if (_error != null) {
      final isExpiredOrInvalid = _error!.contains('expired') || 
                                   _error!.contains('invalid') ||
                                   _error!.contains('404');
      
      return Scaffold(
        appBar: AppBar(
          title: const Text('Error'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () => context.go('/home'),
          ),
        ),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: colorScheme.error),
                const SizedBox(height: 20),
                Text(
                  isExpiredOrInvalid ? 'Link Expired' : 'Unable to Load Diary',
                  style: Theme.of(context).textTheme.headlineSmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                Text(
                  _error!,
                  textAlign: TextAlign.center,
                  style: TextStyle(color: colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 24),
                if (isExpiredOrInvalid)
                  Column(
                    children: [
                      const Text(
                        'This share link may have expired or been revoked.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: () => context.go('/home'),
                        child: const Text('Go to Home'),
                      ),
                    ],
                  )
                else if (!_isAuthenticated)
                  Column(
                    children: [
                      const Text(
                        'You need to be logged in to view this diary.',
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _handleLogin,
                        child: const Text('Login to View'),
                      ),
                      const SizedBox(height: 8),
                      TextButton(
                        onPressed: () => context.go('/home'),
                        child: const Text('Go to Home'),
                      ),
                    ],
                  )
                else
                  ElevatedButton(
                    onPressed: _loadSharedDiary,
                    child: const Text('Retry'),
                  ),
              ],
            ),
          ),
        ),
      );
    }
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Shared Diary'),
        backgroundColor: colorScheme.primary,
        foregroundColor: colorScheme.onPrimary,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => context.go('/home'),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareDiaryLink,
            tooltip: 'Share this diary',
          ),
        ],
      ),
      body: _diary != null
          ? SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // Show banner if viewer is not the owner
                  if (_diary!.author.id != _getCurrentUserId())
                    Container(
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.visibility, color: colorScheme.onPrimaryContainer),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'You are viewing a shared diary from @${_diary!.author.username}',
                              style: TextStyle(color: colorScheme.onPrimaryContainer),
                            ),
                          ),
                        ],
                      ),
                    ),
                  DiaryCard(
                    diary: _diary!,
                    onLike: _handleLike,
                    onFavorite: _handleFavorite,
                    onComment: _handleComment,
                    onEdit: (_) {}, // No edit for shared diaries
                    onDelete: (_) {}, // No delete for shared diaries
                    isOwner: _diary!.author.id == _getCurrentUserId(),
                  ),
                ],
              ),
            )
          : const Center(child: Text('Diary not found')),
    );
  }
}