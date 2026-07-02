import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/core/providers/theme_provider.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';
import 'package:whisper_space_flutter/features/feed/presentation/providers/feed_provider.dart';
import 'package:whisper_space_flutter/features/feed/presentation/screens/create_diary_screen.dart';
import 'package:whisper_space_flutter/features/feed/presentation/screens/edit_diary_full_screen.dart';
import 'package:whisper_space_flutter/shared/widgets/diary_card.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen>
    with SingleTickerProviderStateMixin {
  final ScrollController _scrollController = ScrollController();
  late AnimationController _fabAnimationController;
  late Animation<double> _fabScaleAnimation;
  int? _currentUserId;
  bool _showFab = true;
  double _lastScrollOffset = 0;

  @override
  void initState() {
    super.initState();
    _loadCurrentUser();

    _fabAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );

    _fabScaleAnimation = CurvedAnimation(
      parent: _fabAnimationController,
      curve: Curves.easeOut,
    );

    _fabAnimationController.forward();

    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    final offset = _scrollController.offset;
    if (offset > _lastScrollOffset + 10 && _showFab) {
      setState(() => _showFab = false);
      _fabAnimationController.reverse();
    } else if (offset < _lastScrollOffset - 10 && !_showFab) {
      setState(() => _showFab = true);
      _fabAnimationController.forward();
    }
    _lastScrollOffset = offset;
  }

  void _loadCurrentUser() {
    _currentUserId = 1;
  }

  @override
  void dispose() {
    _scrollController.dispose();
    _fabAnimationController.dispose();
    super.dispose();
  }

  void _toggleTheme() {
    HapticFeedback.lightImpact();
    final themeProvider = Provider.of<ThemeProvider>(context, listen: false);
    themeProvider.toggleTheme(!themeProvider.isDarkMode);
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDarkMode = themeProvider.isDarkMode;
    final colorScheme = Theme.of(context).colorScheme;

    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: isDarkMode
          ? SystemUiOverlayStyle.light
          : SystemUiOverlayStyle.dark,
      child: Consumer<FeedProvider>(
        builder: (context, provider, child) {
          // ---- Loading State ----
          if (provider.isLoading && provider.diaries.isEmpty) {
            return Scaffold(
              backgroundColor: colorScheme.surface,
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      width: 48,
                      height: 48,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.5,
                        color: colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Text(
                      'Loading your feed...',
                      style: TextStyle(
                        color: colorScheme.onSurfaceVariant,
                        fontSize: 14,
                        letterSpacing: 0.3,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          // ---- Error State ----
          if (provider.error != null && provider.diaries.isEmpty) {
            return Scaffold(
              backgroundColor: colorScheme.surface,
              body: Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: colorScheme.errorContainer,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          Icons.wifi_off_rounded,
                          size: 36,
                          color: colorScheme.error,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'Something went wrong',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                          letterSpacing: -0.3,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        provider.error!,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 13,
                          color: colorScheme.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 28),
                      FilledButton.icon(
                        onPressed: () => provider.refreshFeed(),
                        icon: const Icon(Icons.refresh_rounded, size: 18),
                        label: const Text('Try Again'),
                        style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 28, vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }

          // ---- Main Feed ----
          return Scaffold(
            backgroundColor: colorScheme.surface,
            extendBodyBehindAppBar: true,
            appBar: _buildAppBar(context, isDarkMode, colorScheme, provider),
            floatingActionButton: ScaleTransition(
              scale: _fabScaleAnimation,
              child: _buildFAB(context, provider, colorScheme),
            ),
            body: RefreshIndicator(
              onRefresh: () => provider.refreshFeed(),
              color: colorScheme.primary,
              backgroundColor: colorScheme.surface,
              strokeWidth: 2.5,
              child: _buildFeedContent(provider),
            ),
          );
        },
      ),
    );
  }

  // ---- AppBar ----
  PreferredSizeWidget _buildAppBar(
    BuildContext context,
    bool isDarkMode,
    ColorScheme colorScheme,
    FeedProvider provider,
  ) {
    return AppBar(
      backgroundColor: colorScheme.surface.withOpacity(0.92),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 0.5,
      centerTitle: false,
      flexibleSpace: Container(
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              color: colorScheme.outlineVariant.withOpacity(0.3),
              width: 0.5,
            ),
          ),
        ),
      ),
      title: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  colorScheme.primary,
                  colorScheme.tertiary,
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(
              Icons.auto_awesome_rounded,
              size: 16,
              color: Colors.white,
            ),
          ),
          const SizedBox(width: 10),
          Text(
            'NECO360',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
              letterSpacing: -0.5,
            ),
          ),
        ],
      ),
      actions: [
        // Theme Toggle
        AnimatedSwitcher(
          duration: const Duration(milliseconds: 300),
          transitionBuilder: (child, animation) => RotationTransition(
            turns: animation,
            child: FadeTransition(opacity: animation, child: child),
          ),
          child: IconButton(
            key: ValueKey<bool>(isDarkMode),
            icon: Icon(
              isDarkMode
                  ? Icons.light_mode_rounded
                  : Icons.dark_mode_rounded,
              size: 22,
            ),
            color: colorScheme.onSurfaceVariant,
            tooltip: isDarkMode ? 'Light Mode' : 'Dark Mode',
            onPressed: _toggleTheme,
          ),
        ),
        // Refresh
        IconButton(
          icon: const Icon(Icons.refresh_rounded, size: 22),
          color: colorScheme.onSurfaceVariant,
          tooltip: 'Refresh',
          onPressed: () {
            HapticFeedback.selectionClick();
            provider.refreshFeed();
          },
        ),
        const SizedBox(width: 4),
      ],
    );
  }

  // ---- FAB ----
  Widget _buildFAB(
      BuildContext context, FeedProvider provider, ColorScheme colorScheme) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        gradient: LinearGradient(
          colors: [
            colorScheme.primary,
            colorScheme.tertiary,
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withOpacity(0.35),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () {
            HapticFeedback.mediumImpact();
            _createNewPost(context, provider);
          },
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.edit_rounded, color: Colors.white, size: 20),
                SizedBox(width: 8),
                Text(
                  'New Post',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ---- Feed Content ----
  Widget _buildFeedContent(FeedProvider provider) {
    final colorScheme = Theme.of(context).colorScheme;

    if (provider.diaries.isEmpty) {
      return CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverFillRemaining(
            child: _buildEmptyState(colorScheme, provider),
          ),
        ],
      );
    }

    return ListView.builder(
      controller: _scrollController,
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + kToolbarHeight + 16,
        left: 16,
        right: 16,
        bottom: 100,
      ),
      itemCount: provider.diaries.length + (provider.isLoading ? 1 : 0),
      itemBuilder: (context, index) {
        // Loading indicator at bottom
        if (index == provider.diaries.length) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(
              child: SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          );
        }

        final diary = provider.diaries[index];
        final isOwner = diary.author.id == _currentUserId;

        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: DiaryCard(
            diary: diary,
            onLike: () => _handleLike(provider, diary.id),
            onFavorite: () => _handleFavorite(provider, diary.id, isOwner),
            onComment: (diaryId, content, parentId, replyToUserId) =>
                _handleComment(
                    provider, diaryId, content, parentId, replyToUserId),
            onEdit: (diaryToEdit) =>
                _handleEditDiary(context, provider, diaryToEdit),
            onDelete: (diaryId) =>
                _handleDeleteDiary(context, provider, diaryId),
            isOwner: isOwner,
          ),
        );
      },
    );
  }

  // ---- Empty State ----
  Widget _buildEmptyState(ColorScheme colorScheme, FeedProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    colorScheme.primaryContainer,
                    colorScheme.tertiaryContainer,
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.auto_stories_rounded,
                size: 44,
                color: colorScheme.primary,
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'No stories yet',
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.5,
              ),
            ),
            const SizedBox(height: 10),
            Text(
              'Be the first to share your thoughts\nwith the world.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurfaceVariant,
                height: 1.6,
              ),
            ),
            const SizedBox(height: 32),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [colorScheme.primary, colorScheme.tertiary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.primary.withOpacity(0.3),
                    blurRadius: 14,
                    offset: const Offset(0, 5),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(16),
                child: InkWell(
                  borderRadius: BorderRadius.circular(16),
                  onTap: () {
                    HapticFeedback.mediumImpact();
                    _createNewPost(context, provider);
                  },
                  child: const Padding(
                    padding:
                        EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.edit_rounded,
                            color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text(
                          'Write Your First Story',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 15,
                            letterSpacing: 0.1,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ---- Handlers (unchanged logic) ----

  void _handleLike(FeedProvider provider, int diaryId) async {
    try {
      HapticFeedback.selectionClick();
      await provider.likeDiary(diaryId);
    } catch (e) {
      _showErrorSnackBar('Failed to like diary: $e');
    }
  }

  void _handleFavorite(
      FeedProvider provider, int diaryId, bool isOwner) async {
    try {
      HapticFeedback.selectionClick();
      final diary = provider.diaries.firstWhere((d) => d.id == diaryId);
      final isCurrentlyFavorited =
          diary.favoritedUserIds.contains(_currentUserId);

      if (isCurrentlyFavorited) {
        await provider.removeFromFavorites(diaryId);
        _showSuccessSnackBar('Removed from favorites');
      } else {
        await provider.saveToFavorites(diaryId);
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

  void _handleEditDiary(BuildContext context, FeedProvider provider,
      DiaryModel diary) async {
    final feedApiService =
        Provider.of<FeedApiService>(context, listen: false);

    final updatedDiary = await Navigator.push<DiaryModel>(
      context,
      MaterialPageRoute<DiaryModel>(
        builder: (context) => EditDiaryFullScreen(
          diary: diary,
          feedApiService: feedApiService,
          onUpdate: (updatedDiary) async {
            try {
              final result = await provider.updateDiary(
                diaryId: updatedDiary.id,
                title: updatedDiary.title,
                content: updatedDiary.content,
                shareType: updatedDiary.shareType,
                groupIds: updatedDiary.groups.map((g) => g.id).toList(),
                imageUrls: updatedDiary.images,
                videoUrls: updatedDiary.videos,
              );
              return result;
            } catch (e) {
              rethrow;
            }
          },
          onDelete: (deletedDiaryId) async {
            try {
              await provider.deleteDiary(deletedDiaryId);
              _showSuccessSnackBar('Diary deleted successfully!');
            } catch (e) {
              _showErrorSnackBar('Failed to delete diary: $e');
              rethrow;
            }
          },
        ),
      ),
    );

    if (updatedDiary != null) {
      _showSuccessSnackBar('Diary updated successfully!');
    }
  }

  void _handleDeleteDiary(
      BuildContext context, FeedProvider feedProvider, int diaryId) async {
    final colorScheme = Theme.of(context).colorScheme;

    final confirmed = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
            ),
            backgroundColor: colorScheme.surface,
            icon: Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.delete_outline_rounded,
                color: colorScheme.error,
                size: 26,
              ),
            ),
            title: Text(
              'Delete Diary?',
              style: TextStyle(
                fontWeight: FontWeight.w700,
                fontSize: 18,
                color: colorScheme.onSurface,
                letterSpacing: -0.3,
              ),
              textAlign: TextAlign.center,
            ),
            content: Text(
              'This diary will be permanently deleted and cannot be recovered.',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: colorScheme.onSurfaceVariant,
                fontSize: 14,
                height: 1.5,
              ),
            ),
            actionsAlignment: MainAxisAlignment.center,
            actionsPadding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            actions: [
              OutlinedButton(
                onPressed: () => Navigator.pop(context, false),
                style: OutlinedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 28, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  side: BorderSide(color: colorScheme.outline),
                ),
                child: Text(
                  'Cancel',
                  style: TextStyle(color: colorScheme.onSurface),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                onPressed: () => Navigator.pop(context, true),
                style: FilledButton.styleFrom(
                  backgroundColor: colorScheme.error,
                  padding: const EdgeInsets.symmetric(
                      horizontal: 28, vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                child: const Text('Delete'),
              ),
            ],
          ),
        ) ??
        false;

    if (confirmed) {
      try {
        if (mounted) {
          _showInfoSnackBar('Deleting diary...');
        }

        await feedProvider.deleteDiary(diaryId);

        if (mounted) {
          _showSuccessSnackBar('Diary deleted successfully');
        }
      } catch (e) {
        if (mounted) {
          _showErrorSnackBar('Failed to delete diary: $e');
        }
      }
    }
  }

  void _createNewPost(BuildContext context, FeedProvider provider) {
    final feedApiService =
        Provider.of<FeedApiService>(context, listen: false);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateDiaryScreen(
          feedApiService: feedApiService,
          onDiaryCreated: (DiaryModel diary) {
            provider.diaries.insert(0, diary);
            _showSuccessSnackBar('Diary created successfully!');
          },
        ),
      ),
    );
  }

  // ---- SnackBars ----
  void _showErrorSnackBar(String message) {
    final colorScheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline_rounded,
                color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(
                child: Text(message,
                    style: const TextStyle(color: Colors.white))),
          ],
        ),
        backgroundColor: colorScheme.error,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showSuccessSnackBar(String message) {
    final colorScheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_outline_rounded,
                color: Colors.white, size: 18),
            const SizedBox(width: 10),
            Expanded(
                child: Text(message,
                    style: const TextStyle(color: Colors.white))),
          ],
        ),
        backgroundColor: colorScheme.primary,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _showInfoSnackBar(String message) {
    final colorScheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: colorScheme.onPrimary,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
                child: Text(message,
                    style: const TextStyle(color: Colors.white))),
          ],
        ),
        backgroundColor: colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 1),
      ),
    );
  }
}