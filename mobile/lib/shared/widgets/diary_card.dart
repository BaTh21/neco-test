// lib/shared/widgets/diary_card.dart - REDESIGNED UI (Professional & Beautiful)
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';
import 'package:whisper_space_flutter/shared/widgets/media_gallery.dart';

class DiaryCard extends StatefulWidget {
  final DiaryModel diary;
  final VoidCallback onLike;
  final VoidCallback onFavorite;
  final Function(int, String, int?, int?) onComment;
  final Function(DiaryModel) onEdit;
  final Function(int) onDelete;
  final Function(int, String, List<String>?)? onUpdateComment;
  final Function(int)? onDeleteComment;
  final bool isOwner;

  const DiaryCard({
    super.key,
    required this.diary,
    required this.onLike,
    required this.onFavorite,
    required this.onComment,
    required this.onEdit,
    required this.onDelete,
    this.onUpdateComment,
    this.onDeleteComment,
    required this.isOwner,
  });

  @override
  State<DiaryCard> createState() => _DiaryCardState();
}

class _DiaryCardState extends State<DiaryCard>
    with SingleTickerProviderStateMixin {
  bool _showFullContent = false;
  final TextEditingController _commentController = TextEditingController();
  bool _isCommenting = false;
  bool _isSubmittingComment = false;
  bool _isSharing = false;
  int? _replyingToCommentId;
  int? _replyingToUserId;
  String? _replyingToUsername;
  final _commentFocusNode = FocusNode();

  late AnimationController _likeAnimController;
  late Animation<double> _likeScaleAnim;

  @override
  void initState() {
    super.initState();
    _commentFocusNode.addListener(() {
      if (!_commentFocusNode.hasFocus) _clearReplyState();
    });

    _likeAnimController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    _likeScaleAnim = TweenSequence([
      TweenSequenceItem(tween: Tween(begin: 1.0, end: 1.35), weight: 50),
      TweenSequenceItem(tween: Tween(begin: 1.35, end: 1.0), weight: 50),
    ]).animate(CurvedAnimation(
      parent: _likeAnimController,
      curve: Curves.easeInOut,
    ));
  }

  void _clearReplyState() {
    if (_replyingToCommentId != null) {
      setState(() {
        _replyingToCommentId = null;
        _replyingToUserId = null;
        _replyingToUsername = null;
      });
    }
  }

  ({IconData icon, Color color, String label}) _getPrivacyData() {
    switch (widget.diary.shareType) {
      case 'public':
        return (icon: Icons.public_rounded, color: const Color(0xFF22C55E), label: 'Public');
      case 'friends':
        return (icon: Icons.people_rounded, color: const Color(0xFF3B82F6), label: 'Friends');
      case 'group':
        return (icon: Icons.group_rounded, color: const Color(0xFFA855F7), label: 'Group');
      default:
        return (icon: Icons.lock_rounded, color: const Color(0xFFEF4444), label: 'Private');
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    final isLiked = widget.diary.likes.any((l) => l.user.id == _getCurrentUserId());
    final isFavorited = widget.diary.favoritedUserIds.contains(_getCurrentUserId());

    return Container(
      margin: const EdgeInsets.only(bottom: 2),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outlineVariant.withOpacity(0.4),
          width: 0.8,
        ),
        boxShadow: [
          BoxShadow(
            color: isDarkMode
                ? Colors.black.withOpacity(0.25)
                : Colors.black.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ---- Header ----
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 12, 0),
              child: _buildHeader(isDarkMode, colorScheme),
            ),

            // ---- Title ----
            if (widget.diary.title.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
                child: Text(
                  widget.diary.title,
                  style: TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                    letterSpacing: -0.3,
                    height: 1.3,
                  ),
                ),
              ),

            // ---- Content ----
            if (widget.diary.content.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: _buildContent(isDarkMode, colorScheme),
              ),

            // ---- Media ----
            if (widget.diary.images.isNotEmpty || widget.diary.videos.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 12),
                child: MediaGallery(
                  images: widget.diary.images,
                  videos: widget.diary.videos,
                  videoThumbnails: widget.diary.videoThumbnails,
                  height: 260,
                  borderRadius: BorderRadius.zero,
                ),
              ),

            // ---- Stats Row ----
            if (widget.diary.likes.isNotEmpty || widget.diary.comments.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                child: _buildStatsRow(colorScheme, isLiked),
              ),

            // ---- Divider ----
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Divider(
                height: 1,
                thickness: 0.6,
                color: colorScheme.outlineVariant.withOpacity(0.5),
              ),
            ),

            // ---- Action Buttons ----
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 0, 4, 4),
              child: _buildActionButtons(
                isLiked: isLiked,
                isFavorited: isFavorited,
                colorScheme: colorScheme,
                isDarkMode: isDarkMode,
              ),
            ),

            // ---- Reply Indicator ----
            if (_replyingToUsername != null)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: _buildReplyIndicator(colorScheme),
              ),

            // ---- Comments Preview ----
            if (widget.diary.comments.isNotEmpty)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                child: _buildCommentsPreview(isDarkMode, colorScheme),
              ),

            // ---- Comment Input ----
            if (_isCommenting)
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                child: _buildCommentInput(isDarkMode, colorScheme),
              ),

            if (!_isCommenting) const SizedBox(height: 4),
          ],
        ),
      ),
    );
  }

  // ==============================
  // HEADER
  // ==============================
  Widget _buildHeader(bool isDarkMode, ColorScheme colorScheme) {
    final privacy = _getPrivacyData();

    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        // Avatar
        Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    colorScheme.primary.withOpacity(0.6),
                    colorScheme.tertiary.withOpacity(0.6),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              padding: const EdgeInsets.all(2),
              child: CircleAvatar(
                backgroundImage: widget.diary.author.avatarUrl != null &&
                        widget.diary.author.avatarUrl!.isNotEmpty
                    ? NetworkImage(widget.diary.author.avatarUrl!)
                    : null,
                radius: 21,
                backgroundColor: colorScheme.surfaceContainerHighest,
                child: widget.diary.author.avatarUrl == null ||
                        widget.diary.author.avatarUrl!.isEmpty
                    ? Text(
                        widget.diary.author.username.isNotEmpty
                            ? widget.diary.author.username[0].toUpperCase()
                            : 'U',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          fontSize: 16,
                          color: colorScheme.onSurfaceVariant,
                        ),
                      )
                    : null,
              ),
            ),
          ],
        ),
        const SizedBox(width: 12),

        // Name + date
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(
                      widget.diary.author.username,
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                        color: colorScheme.onSurface,
                        letterSpacing: -0.2,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  // Privacy badge
                  Tooltip(
                    message: privacy.label,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 6, vertical: 2),
                      decoration: BoxDecoration(
                        color: privacy.color.withOpacity(0.12),
                        borderRadius: BorderRadius.circular(6),
                        border: Border.all(
                          color: privacy.color.withOpacity(0.3),
                          width: 0.8,
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(privacy.icon,
                              size: 10, color: privacy.color),
                          const SizedBox(width: 3),
                          Text(
                            privacy.label,
                            style: TextStyle(
                              fontSize: 9,
                              color: privacy.color,
                              fontWeight: FontWeight.w600,
                              letterSpacing: 0.2,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                _formatDate(widget.diary.createdAt),
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurfaceVariant,
                  letterSpacing: 0.1,
                ),
              ),
            ],
          ),
        ),

        // Menu
        _buildPopupMenu(isDarkMode, colorScheme),
      ],
    );
  }

  Widget _buildPopupMenu(bool isDarkMode, ColorScheme colorScheme) {
    return PopupMenuButton<String>(
      icon: Icon(
        Icons.more_horiz_rounded,
        size: 22,
        color: colorScheme.onSurfaceVariant,
      ),
      onSelected: _handleMenuSelection,
      color: colorScheme.surfaceContainerHigh,
      elevation: 8,
      shadowColor: Colors.black26,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      itemBuilder: (context) => [
        if (widget.isOwner) ...[
          _buildMenuItem('edit', Icons.edit_rounded, 'Edit', colorScheme.primary),
          _buildMenuItem('delete', Icons.delete_outline_rounded, 'Delete', colorScheme.error),
          const PopupMenuDivider(height: 1),
        ],
        _buildMenuItem('share', Icons.share_rounded, 'Share', const Color(0xFF22C55E)),
        _buildMenuItem('report', Icons.flag_outlined, 'Report', const Color(0xFFF97316)),
      ],
    );
  }

  PopupMenuItem<String> _buildMenuItem(
      String value, IconData icon, String label, Color color) {
    return PopupMenuItem<String>(
      value: value,
      height: 44,
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 10),
          Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  // ==============================
  // STATS ROW
  // ==============================
  Widget _buildStatsRow(ColorScheme colorScheme, bool isLiked) {
    return Row(
      children: [
        if (widget.diary.likes.isNotEmpty) ...[
          Row(
            children: [
              Icon(Icons.favorite_rounded,
                  size: 14, color: const Color(0xFFEF4444)),
              const SizedBox(width: 4),
              Text(
                '${widget.diary.likes.length}',
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
          const SizedBox(width: 12),
        ],
        if (widget.diary.comments.isNotEmpty)
          Row(
            children: [
              Icon(Icons.chat_bubble_rounded,
                  size: 13, color: colorScheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(
                '${widget.diary.comments.length} comments',
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurfaceVariant,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
      ],
    );
  }

  // ==============================
  // CONTENT
  // ==============================
  Widget _buildContent(bool isDarkMode, ColorScheme colorScheme) {
    final textWithMentions = _parseMentions(widget.diary.content, colorScheme);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        RichText(
          text: textWithMentions,
          maxLines: _showFullContent ? null : 4,
          overflow: _showFullContent
              ? TextOverflow.visible
              : TextOverflow.ellipsis,
        ),
        if (widget.diary.content.length > 200)
          GestureDetector(
            onTap: () => setState(() => _showFullContent = !_showFullContent),
            child: Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _showFullContent ? 'Show less' : 'Show more',
                style: TextStyle(
                  color: colorScheme.primary,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
      ],
    );
  }

  // ==============================
  // ACTION BUTTONS
  // ==============================
  Widget _buildActionButtons({
    required bool isLiked,
    required bool isFavorited,
    required ColorScheme colorScheme,
    required bool isDarkMode,
  }) {
    return Row(
      children: [
        // Like
        _buildActionBtn(
          icon: isLiked ? Icons.favorite_rounded : Icons.favorite_outline_rounded,
          label: widget.diary.likes.isNotEmpty
              ? '${widget.diary.likes.length}'
              : 'Like',
          isActive: isLiked,
          activeColor: const Color(0xFFEF4444),
          colorScheme: colorScheme,
          onTap: () {
            HapticFeedback.lightImpact();
            _likeAnimController.forward(from: 0);
            widget.onLike();
          },
          animController: isLiked ? _likeAnimController : null,
          scaleAnim: isLiked ? _likeScaleAnim : null,
        ),

        // Comment
        _buildActionBtn(
          icon: _isCommenting
              ? Icons.chat_bubble_rounded
              : Icons.chat_bubble_outline_rounded,
          label: widget.diary.comments.isNotEmpty
              ? '${widget.diary.comments.length}'
              : 'Comment',
          isActive: _isCommenting,
          activeColor: colorScheme.primary,
          colorScheme: colorScheme,
          onTap: () {
            HapticFeedback.selectionClick();
            setState(() {
              _isCommenting = !_isCommenting;
              if (!_isCommenting) {
                _commentController.clear();
                _clearReplyState();
              } else {
                WidgetsBinding.instance.addPostFrameCallback((_) =>
                    FocusScope.of(context).requestFocus(_commentFocusNode));
              }
            });
          },
        ),

        // Save
        _buildActionBtn(
          icon: isFavorited
              ? Icons.bookmark_rounded
              : Icons.bookmark_outline_rounded,
          label: 'Save',
          isActive: isFavorited,
          activeColor: const Color(0xFFF59E0B),
          colorScheme: colorScheme,
          onTap: () {
            HapticFeedback.selectionClick();
            widget.onFavorite();
          },
        ),

        // Share
        _buildActionBtn(
          icon: Icons.share_rounded,
          label: 'Share',
          isActive: false,
          activeColor: const Color(0xFF22C55E),
          colorScheme: colorScheme,
          onTap: () {
            HapticFeedback.selectionClick();
            _shareDiary();
          },
        ),
      ],
    );
  }

  Widget _buildActionBtn({
    required IconData icon,
    required String label,
    required bool isActive,
    required Color activeColor,
    required ColorScheme colorScheme,
    required VoidCallback onTap,
    AnimationController? animController,
    Animation<double>? scaleAnim,
  }) {
    final defaultColor = colorScheme.onSurfaceVariant;

    Widget iconWidget = Icon(
      icon,
      size: 20,
      color: isActive ? activeColor : defaultColor,
    );

    if (scaleAnim != null) {
      iconWidget = ScaleTransition(scale: scaleAnim, child: iconWidget);
    }

    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10),
          child: Column(
            children: [
              iconWidget,
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: isActive ? activeColor : defaultColor,
                  letterSpacing: 0.1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ==============================
  // REPLY INDICATOR
  // ==============================
  Widget _buildReplyIndicator(ColorScheme colorScheme) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: colorScheme.primaryContainer.withOpacity(0.4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.primary.withOpacity(0.2),
          width: 0.8,
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.reply_rounded, size: 14, color: colorScheme.primary),
          const SizedBox(width: 6),
          Expanded(
            child: Text(
              'Replying to @$_replyingToUsername',
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.primary,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          GestureDetector(
            onTap: _clearReplyState,
            child: Icon(Icons.close_rounded,
                size: 16, color: colorScheme.onSurfaceVariant),
          ),
        ],
      ),
    );
  }

  // ==============================
  // COMMENTS PREVIEW
  // ==============================
  Widget _buildCommentsPreview(bool isDarkMode, ColorScheme colorScheme) {
    final previewComments = widget.diary.comments.take(2).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GestureDetector(
          onTap: _viewAllComments,
          child: Text(
            'View all ${widget.diary.comments.length} comments',
            style: TextStyle(
              color: colorScheme.primary,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        const SizedBox(height: 8),
        ...previewComments.map((c) =>
            _buildCommentItem(c, false, isDarkMode, colorScheme)),
      ],
    );
  }

  // ==============================
  // COMMENT ITEM
  // ==============================
  Widget _buildCommentItem(Comment comment, bool isInModal, bool isDarkMode,
      ColorScheme colorScheme) {
    final isCurrentUser = comment.user.id == _getCurrentUserId();
    final textSpan = _parseMentions(comment.content, colorScheme);

    return Padding(
      padding: EdgeInsets.only(bottom: isInModal ? 14 : 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (comment.replyToUser != null)
            Padding(
              padding: const EdgeInsets.only(left: 36, bottom: 4),
              child: Row(
                children: [
                  Icon(Icons.subdirectory_arrow_right_rounded,
                      size: 12,
                      color: colorScheme.onSurfaceVariant),
                  const SizedBox(width: 4),
                  Text(
                    'Replying to @${comment.replyToUser!.username}',
                    style: TextStyle(
                      fontSize: 11,
                      color: colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              CircleAvatar(
                radius: isInModal ? 17 : 15,
                backgroundImage:
                    comment.user.avatarUrl?.isNotEmpty == true
                        ? NetworkImage(comment.user.avatarUrl!)
                        : null,
                backgroundColor: colorScheme.surfaceContainerHighest,
                child: comment.user.avatarUrl == null ||
                        comment.user.avatarUrl!.isEmpty
                    ? Text(
                        comment.user.username.isNotEmpty
                            ? comment.user.username[0].toUpperCase()
                            : '?',
                        style: TextStyle(
                          fontSize: isInModal ? 12 : 10,
                          color: colorScheme.onSurfaceVariant,
                          fontWeight: FontWeight.w600,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Comment bubble
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 9),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest
                            .withOpacity(0.6),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(4),
                          topRight: Radius.circular(16),
                          bottomLeft: Radius.circular(16),
                          bottomRight: Radius.circular(16),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                comment.user.username,
                                style: TextStyle(
                                  fontWeight: FontWeight.w700,
                                  fontSize: isInModal ? 13 : 12,
                                  color: colorScheme.onSurface,
                                ),
                              ),
                              if (comment.isEdited) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 5, vertical: 1),
                                  decoration: BoxDecoration(
                                    color: colorScheme.outlineVariant
                                        .withOpacity(0.4),
                                    borderRadius: BorderRadius.circular(4),
                                  ),
                                  child: Text(
                                    'edited',
                                    style: TextStyle(
                                      fontSize: 9,
                                      color: colorScheme.onSurfaceVariant,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 3),
                          SelectableText.rich(
                            textSpan,
                            style: TextStyle(
                              fontSize: isInModal ? 14 : 13,
                              color: colorScheme.onSurface,
                              height: 1.4,
                            ),
                          ),
                          // Comment images
                          if (comment.images.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: SizedBox(
                                height: 80,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: comment.images.length,
                                  separatorBuilder: (_, __) =>
                                      const SizedBox(width: 6),
                                  itemBuilder: (ctx, i) => ClipRRect(
                                    borderRadius: BorderRadius.circular(10),
                                    child: Image.network(
                                      comment.images[i],
                                      width: 80,
                                      height: 80,
                                      fit: BoxFit.cover,
                                      errorBuilder: (_, __, ___) => Container(
                                        width: 80,
                                        height: 80,
                                        color: colorScheme
                                            .surfaceContainerHighest,
                                        child: Icon(Icons.broken_image_rounded,
                                            color:
                                                colorScheme.onSurfaceVariant),
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),

                    // Actions row
                    Padding(
                      padding:
                          const EdgeInsets.only(left: 10, top: 5, bottom: 2),
                      child: Row(
                        children: [
                          Text(
                            _formatDate(comment.createdAt),
                            style: TextStyle(
                              fontSize: 11,
                              color: colorScheme.onSurfaceVariant,
                            ),
                          ),
                          const SizedBox(width: 14),
                          _commentAction(
                            'Reply',
                            colorScheme.primary,
                            () => _replyToComment(comment.id,
                                comment.user.id, comment.user.username),
                          ),
                          if (isCurrentUser) ...[
                            const SizedBox(width: 14),
                            _commentAction(
                              'Edit',
                              const Color(0xFF22C55E),
                              () => _editComment(comment),
                            ),
                            const SizedBox(width: 14),
                            _commentAction(
                              'Delete',
                              colorScheme.error,
                              () => _deleteComment(comment.id),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          // Nested replies
          if (comment.replies.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(left: 28, top: 8),
              child: Column(
                children: comment.replies
                    .map((r) => _buildCommentItem(
                        r, isInModal, isDarkMode, colorScheme))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }

  Widget _commentAction(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          color: color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }

  // ==============================
  // COMMENT INPUT
  // ==============================
  Widget _buildCommentInput(bool isDarkMode, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (_replyingToUsername == null)
          Padding(
            padding: const EdgeInsets.only(bottom: 8, left: 2),
            child: Text(
              'Tip: Use @username to mention someone',
              style: TextStyle(
                fontSize: 11,
                color: colorScheme.onSurfaceVariant,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: _commentFocusNode.hasFocus
                        ? colorScheme.primary.withOpacity(0.5)
                        : colorScheme.outlineVariant.withOpacity(0.4),
                    width: 1,
                  ),
                ),
                child: TextField(
                  controller: _commentController,
                  focusNode: _commentFocusNode,
                  style: TextStyle(
                    color: colorScheme.onSurface,
                    fontSize: 14,
                  ),
                  decoration: InputDecoration(
                    hintText: _replyingToUsername != null
                        ? 'Reply to @$_replyingToUsername...'
                        : 'Write a comment...',
                    hintStyle: TextStyle(
                      color: colorScheme.onSurfaceVariant,
                      fontSize: 14,
                    ),
                    border: InputBorder.none,
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                  ),
                  maxLines: 3,
                  minLines: 1,
                  onChanged: (_) => setState(() {}),
                ),
              ),
            ),
            const SizedBox(width: 8),
            // Send button
            GestureDetector(
              onTap: _submitComment,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  gradient: _commentController.text.trim().isEmpty
                      ? null
                      : LinearGradient(
                          colors: [
                            colorScheme.primary,
                            colorScheme.tertiary,
                          ],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                  color: _commentController.text.trim().isEmpty
                      ? colorScheme.surfaceContainerHighest
                      : null,
                  shape: BoxShape.circle,
                  boxShadow: _commentController.text.trim().isEmpty
                      ? null
                      : [
                          BoxShadow(
                            color: colorScheme.primary.withOpacity(0.3),
                            blurRadius: 8,
                            offset: const Offset(0, 3),
                          ),
                        ],
                ),
                child: _isSubmittingComment
                    ? Padding(
                        padding: const EdgeInsets.all(11),
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: colorScheme.onPrimary,
                        ),
                      )
                    : Icon(
                        Icons.send_rounded,
                        size: 18,
                        color: _commentController.text.trim().isEmpty
                            ? colorScheme.onSurfaceVariant
                            : Colors.white,
                      ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ==============================
  // HELPERS
  // ==============================
  TextSpan _parseMentions(String text, ColorScheme colorScheme) {
    final mentionRegex = RegExp(r'@(\w+)');
    final parts = text.split(mentionRegex);
    final matches = mentionRegex.allMatches(text).toList();
    final spans = <TextSpan>[];
    for (int i = 0; i < parts.length; i++) {
      spans.add(TextSpan(
        text: parts[i],
        style: TextStyle(color: colorScheme.onSurface),
      ));
      if (i < matches.length) {
        spans.add(TextSpan(
          text: matches[i].group(0)!,
          style: TextStyle(
            color: colorScheme.primary,
            fontWeight: FontWeight.w600,
          ),
        ));
      }
    }
    return TextSpan(children: spans);
  }

  void _handleMenuSelection(String value) {
    switch (value) {
      case 'edit':
        widget.onEdit(widget.diary);
        break;
      case 'delete':
        widget.onDelete(widget.diary.id);
        break;
      case 'share':
        _shareDiary();
        break;
      case 'report':
        _reportDiary();
        break;
    }
  }

  void _shareDiary() async {
    final colorScheme = Theme.of(context).colorScheme;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    try {
      if (mounted) setState(() => _isSharing = true);
      final feedApiService =
          Provider.of<FeedApiService>(context, listen: false);
      final shareUrl =
          await feedApiService.generateShareLink(widget.diary.id);
      if (mounted) {
        setState(() => _isSharing = false);
        showModalBottomSheet(
          context: context,
          backgroundColor: Colors.transparent,
          builder: (context) => Container(
            decoration: BoxDecoration(
              color: colorScheme.surface,
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: SafeArea(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    height: 4,
                    width: 36,
                    decoration: BoxDecoration(
                      color: colorScheme.outlineVariant,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Share this story',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                      letterSpacing: -0.3,
                    ),
                  ),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _buildShareOption(
                        icon: Icons.copy_rounded,
                        label: 'Copy Link',
                        color: colorScheme.primary,
                        colorScheme: colorScheme,
                        onTap: () async {
                          await Clipboard.setData(
                              ClipboardData(text: shareUrl));
                          if (mounted) Navigator.pop(context);
                          if (mounted)
                            _showToast(context, '✓ Link copied!',
                                colorScheme.primary);
                        },
                      ),
                      _buildShareOption(
                        icon: Icons.share_rounded,
                        label: 'Share via',
                        color: const Color(0xFF22C55E),
                        colorScheme: colorScheme,
                        onTap: () async {
                          if (mounted) Navigator.pop(context);
                          await feedApiService.shareViaSocialMedia(
                            shareUrl: shareUrl,
                            title: widget.diary.title,
                            content: widget.diary.content,
                          );
                        },
                      ),
                      _buildShareOption(
                        icon: Icons.qr_code_rounded,
                        label: 'QR Code',
                        color: const Color(0xFFA855F7),
                        colorScheme: colorScheme,
                        onTap: () {
                          if (mounted) Navigator.pop(context);
                          _showQRCode(shareUrl);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Container(
                    margin: const EdgeInsets.symmetric(horizontal: 20),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerHighest
                          .withOpacity(0.5),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(
                          color:
                              colorScheme.outlineVariant.withOpacity(0.4)),
                    ),
                    child: Column(
                      children: [
                        Text(
                          'Share link',
                          style: TextStyle(
                            fontSize: 11,
                            color: colorScheme.onSurfaceVariant,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          shareUrl,
                          style: TextStyle(
                            fontSize: 12,
                            color: colorScheme.primary,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSharing = false);
        _showToast(context, 'Failed to generate share link',
            Theme.of(context).colorScheme.error);
      }
    }
  }

  Widget _buildShareOption({
    required IconData icon,
    required String label,
    required Color color,
    required ColorScheme colorScheme,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withOpacity(0.2),
                width: 1.5,
              ),
            ),
            child: Icon(icon, color: color, size: 26),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  void _showQRCode(String shareUrl) {
    final colorScheme = Theme.of(context).colorScheme;
    showDialog(
      context: context,
      builder: (context) => Dialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        backgroundColor: colorScheme.surface,
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                'QR Code',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                ),
              ),
              const SizedBox(height: 20),
              Container(
                width: 200,
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Center(
                    child: Text('QR Code would appear here')),
              ),
              const SizedBox(height: 20),
              Text(
                'Scan with camera to view',
                style: TextStyle(color: colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: () => Navigator.pop(context),
                style: FilledButton.styleFrom(
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: const Text('Close'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _reportDiary() {
    final colorScheme = Theme.of(context).colorScheme;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: colorScheme.surface,
        icon: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFFF97316).withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: const Icon(Icons.flag_rounded,
              color: Color(0xFFF97316), size: 24),
        ),
        title: Text(
          'Report Story',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
          ),
          textAlign: TextAlign.center,
        ),
        content: Text(
          'Why are you reporting this story? Our team will review it shortly.',
          style: TextStyle(color: colorScheme.onSurfaceVariant, height: 1.5),
          textAlign: TextAlign.center,
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          OutlinedButton(
            onPressed: () => Navigator.pop(context),
            style: OutlinedButton.styleFrom(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Cancel'),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              if (mounted)
                _showToast(context,
                    '✓ Report submitted. Thank you!', colorScheme.primary);
            },
            style: FilledButton.styleFrom(
              backgroundColor: const Color(0xFFF97316),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _submitComment() async {
    final content = _commentController.text.trim();
    if (content.isEmpty) return;
    try {
      setState(() => _isSubmittingComment = true);
      await widget.onComment(
        widget.diary.id,
        content,
        _replyingToCommentId == 0 ? null : _replyingToCommentId,
        _replyingToUserId == 0 ? null : _replyingToUserId,
      );
      if (mounted) {
        setState(() {
          _commentController.clear();
          _isCommenting = false;
          _isSubmittingComment = false;
          _clearReplyState();
        });
        _showToast(context, '✓ Comment posted!',
            Theme.of(context).colorScheme.primary);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmittingComment = false);
        _showToast(context, 'Failed to post comment',
            Theme.of(context).colorScheme.error);
      }
    }
  }

  void _viewAllComments() {
    final colorScheme = Theme.of(context).colorScheme;
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.75,
        maxChildSize: 0.95,
        minChildSize: 0.4,
        builder: (_, scrollController) => Container(
          decoration: BoxDecoration(
            color: colorScheme.surface,
            borderRadius:
                const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 12),
                height: 4,
                width: 36,
                decoration: BoxDecoration(
                  color: colorScheme.outlineVariant,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 12, 0),
                child: Row(
                  children: [
                    Text(
                      'Comments',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: colorScheme.primaryContainer,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${widget.diary.comments.length}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          color: colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close_rounded,
                          color: colorScheme.onSurfaceVariant),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: widget.diary.comments.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.chat_bubble_outline_rounded,
                                size: 52,
                                color: colorScheme.onSurfaceVariant
                                    .withOpacity(0.4)),
                            const SizedBox(height: 16),
                            Text(
                              'No comments yet',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSurfaceVariant,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Be the first to comment!',
                              style: TextStyle(
                                color: colorScheme.onSurfaceVariant
                                    .withOpacity(0.7),
                              ),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: widget.diary.comments.length,
                        itemBuilder: (ctx, i) => _buildCommentItem(
                            widget.diary.comments[i],
                            true,
                            isDarkMode,
                            colorScheme),
                      ),
              ),
              // Bottom input
              Container(
                padding: EdgeInsets.fromLTRB(
                    16,
                    12,
                    16,
                    MediaQuery.of(context).viewInsets.bottom + 12),
                decoration: BoxDecoration(
                  color: colorScheme.surface,
                  border: Border(
                    top: BorderSide(
                      color: colorScheme.outlineVariant.withOpacity(0.4),
                    ),
                  ),
                ),
                child: Column(
                  children: [
                    if (_replyingToUsername != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: _buildReplyIndicator(colorScheme),
                      ),
                    _buildCommentInput(isDarkMode, colorScheme),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _replyToComment(int commentId, int userId, String username) {
    setState(() {
      _replyingToCommentId = commentId;
      _replyingToUserId = userId;
      _replyingToUsername = username;
      _isCommenting = true;
      _commentController.text = '@$username ';
      _commentController.selection = TextSelection.fromPosition(
        TextPosition(offset: _commentController.text.length),
      );
    });
    WidgetsBinding.instance.addPostFrameCallback(
        (_) => FocusScope.of(context).requestFocus(_commentFocusNode));
  }

  Future<void> _editComment(Comment comment) async {
    final colorScheme = Theme.of(context).colorScheme;
    final controller =
        TextEditingController(text: comment.content);

    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: colorScheme.surface,
        title: Text(
          'Edit Comment',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
          ),
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: controller,
              maxLines: 4,
              minLines: 2,
              style: TextStyle(color: colorScheme.onSurface),
              decoration: InputDecoration(
                hintText: 'Edit your comment...',
                hintStyle: TextStyle(color: colorScheme.onSurfaceVariant),
                filled: true,
                fillColor: colorScheme.surfaceContainerHighest.withOpacity(0.5),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.all(14),
              ),
            ),
            if (comment.images.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '${comment.images.length} image(s) attached',
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurfaceVariant,
                  ),
                ),
              ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel',
                style:
                    TextStyle(color: colorScheme.onSurfaceVariant)),
          ),
          FilledButton(
            onPressed: () {
              final newContent = controller.text.trim();
              if (newContent.isNotEmpty) {
                Navigator.pop(context,
                    {'content': newContent, 'images': comment.images});
              }
            },
            style: FilledButton.styleFrom(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Save'),
          ),
        ],
      ),
    );

    if (result != null && mounted) {
      try {
        await widget.onUpdateComment
            ?.call(comment.id, result['content']!, result['images']);
        if (mounted)
          _showToast(context, '✓ Comment updated!',
              Theme.of(context).colorScheme.primary);
      } catch (e) {
        if (mounted)
          _showToast(context, 'Failed to update comment',
              Theme.of(context).colorScheme.error);
      }
    }
  }

  Future<void> _deleteComment(int commentId) async {
    final colorScheme = Theme.of(context).colorScheme;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        backgroundColor: colorScheme.surface,
        icon: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: colorScheme.errorContainer,
            shape: BoxShape.circle,
          ),
          child: Icon(Icons.delete_outline_rounded,
              color: colorScheme.error, size: 24),
        ),
        title: Text(
          'Delete Comment?',
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
          ),
          textAlign: TextAlign.center,
        ),
        content: Text(
          'This comment will be permanently removed.',
          style:
              TextStyle(color: colorScheme.onSurfaceVariant, height: 1.5),
          textAlign: TextAlign.center,
        ),
        actionsAlignment: MainAxisAlignment.center,
        actions: [
          OutlinedButton(
            onPressed: () => Navigator.pop(context, false),
            style: OutlinedButton.styleFrom(
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Cancel'),
          ),
          const SizedBox(width: 8),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: colorScheme.error,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await widget.onDeleteComment?.call(commentId);
        if (mounted)
          _showToast(context, '✓ Comment deleted',
              Theme.of(context).colorScheme.primary);
      } catch (e) {
        if (mounted)
          _showToast(context, 'Failed to delete comment',
              Theme.of(context).colorScheme.error);
      }
    }
  }

  void _showToast(BuildContext context, String message, Color color) {
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(
              color: Colors.white, fontWeight: FontWeight.w500),
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  int _getCurrentUserId() => 0;

  String _formatDate(DateTime date) {
    final diff = DateTime.now().difference(date);
    if (diff.inDays > 365) return '${diff.inDays ~/ 365}y ago';
    if (diff.inDays > 30) return '${diff.inDays ~/ 30}mo ago';
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }

  @override
  void dispose() {
    _commentController.dispose();
    _commentFocusNode.dispose();
    _likeAnimController.dispose();
    super.dispose();
  }
}