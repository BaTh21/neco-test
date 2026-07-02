// lib/features/notes/presentation/widgets/note_card.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:whisper_space_flutter/features/notes/data/models/note_model.dart';
import 'package:whisper_space_flutter/features/notes/presentation/screens/edit_note_screen.dart';
import 'package:whisper_space_flutter/features/notes/presentation/screens/share_note_screen.dart';

class NoteCard extends StatelessWidget {
  final NoteModel note;
  final bool isOwner;
  final bool canEdit;
  final VoidCallback? onTap;
  final VoidCallback? onPinToggle;
  final VoidCallback? onArchiveToggle;
  final VoidCallback? onDelete;
  final VoidCallback? onShare;
  final VoidCallback? onLeave;

  const NoteCard({
    super.key,
    required this.note,
    required this.isOwner,
    required this.canEdit,
    this.onTap,
    this.onPinToggle,
    this.onArchiveToggle,
    this.onDelete,
    this.onShare,
    this.onLeave,
  });

  Color _getAdjustedColorForDarkMode(Color color) {
    if (color.computeLuminance() > 0.7) {
      return Color.fromARGB(
        color.alpha,
        (color.red * 0.3).toInt(),
        (color.green * 0.3).toInt(),
        (color.blue * 0.3).toInt(),
      );
    }
    return color;
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final dateColor = isDarkMode ? Colors.white54 : Colors.grey[500];
    final borderColor = isDarkMode ? const Color(0xFF00BCD4) : const Color(0xFF6C63FF);
    
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');
    final lastUpdated = note.updatedAt ?? note.createdAt;
    
    final cardColor = isDarkMode 
        ? _getAdjustedColorForDarkMode(note.color)
        : note.color;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      color: cardColor,
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: note.isPinned
            ? BorderSide(color: borderColor, width: 2)
            : BorderSide.none,
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with author and share type
              Row(
                children: [
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: (isDarkMode ? borderColor : const Color(0xFF6C63FF)).withOpacity(0.2),
                    backgroundImage: note.user.avatarUrl != null
                        ? NetworkImage(note.user.avatarUrl!)
                        : null,
                    child: note.user.avatarUrl == null
                        ? Text(
                            note.user.username[0].toUpperCase(),
                            style: TextStyle(
                              color: isDarkMode ? borderColor : const Color(0xFF6C63FF),
                              fontWeight: FontWeight.bold,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          note.user.username,
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: textColor,
                          ),
                        ),
                        Text(
                          dateFormat.format(lastUpdated),
                          style: TextStyle(
                            fontSize: 11,
                            color: dateColor,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: _getShareTypeColor(note.shareType, isDarkMode).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          _getShareTypeIcon(note.shareType),
                          size: 12,
                          color: _getShareTypeColor(note.shareType, isDarkMode),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          _getShareTypeText(note.shareType),
                          style: TextStyle(
                            fontSize: 10,
                            color: _getShareTypeColor(note.shareType, isDarkMode),
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 12),
              
              Text(
                note.title,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              if (note.content != null && note.content!.isNotEmpty) ...[
                const SizedBox(height: 4),
                Text(
                  note.content!,
                  style: TextStyle(
                    fontSize: 14,
                    color: subtitleColor,
                  ),
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              
              const SizedBox(height: 16),
              
              // Action buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  if (isOwner || canEdit) ...[
                    _buildActionButton(
                      context: context,
                      icon: Icons.edit_outlined,
                      label: 'Edit',
                      color: isDarkMode ? Colors.cyan.shade300 : Colors.grey[700],
                      onTap: () => _editNote(context),
                    ),
                  ],
                  
                  if (isOwner) ...[
                    _buildActionButton(
                      context: context,
                      icon: note.isPinned
                          ? Icons.push_pin
                          : Icons.push_pin_outlined,
                      label: note.isPinned ? 'Pinned' : 'Pin',
                      color: note.isPinned 
                          ? (isDarkMode ? Colors.amber.shade300 : Colors.amber)
                          : (isDarkMode ? Colors.white70 : Colors.grey[700]),
                      onTap: onPinToggle,
                    ),
                    _buildActionButton(
                      context: context,
                      icon: note.isArchived
                          ? Icons.unarchive_outlined
                          : Icons.archive_outlined,
                      label: note.isArchived ? 'Unarchive' : 'Archive',
                      color: isDarkMode ? Colors.white70 : Colors.grey[700],
                      onTap: onArchiveToggle,
                    ),
                    _buildActionButton(
                      context: context,
                      icon: Icons.share_outlined,
                      label: 'Share',
                      color: isDarkMode ? Colors.cyan.shade300 : Colors.grey[700],
                      onTap: onShare ?? () => _shareNote(context),
                    ),
                    _buildActionButton(
                      context: context,
                      icon: Icons.delete_outline,
                      label: 'Delete',
                      color: isDarkMode ? Colors.red.shade300 : Colors.red,
                      onTap: onDelete ?? () => _confirmDelete(context),
                    ),
                  ] else if (onLeave != null) ...[
                    _buildActionButton(
                      context: context,
                      icon: Icons.exit_to_app,
                      label: 'Leave',
                      color: isDarkMode ? Colors.orange.shade300 : Colors.orange,
                      onTap: onLeave,
                    ),
                  ],
                ],
              ),
              
              // Shared with count (if shared with friends)
              if (note.shareType == ShareType.shared && note.sharedWith.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: isDarkMode 
                        ? Colors.white10 
                        : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.people,
                        size: 12,
                        color: subtitleColor,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        'Shared with ${note.sharedWith.length} ${note.sharedWith.length == 1 ? 'friend' : 'friends'}',
                        style: TextStyle(
                          fontSize: 10,
                          color: subtitleColor,
                        ),
                      ),
                      if (note.canEdit) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDarkMode 
                                ? Colors.green.shade900.withOpacity(0.5)
                                : Colors.green.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Can edit',
                            style: TextStyle(
                              fontSize: 8,
                              color: isDarkMode ? Colors.green.shade300 : Colors.green.shade700,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required BuildContext context,
    required IconData icon,
    required String label,
    required Color? color,
    required VoidCallback? onTap,
  }) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: color ?? (isDarkMode ? Colors.white70 : Colors.grey[700]),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              style: TextStyle(
                fontSize: 10,
                color: color ?? (isDarkMode ? Colors.white70 : Colors.grey[700]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _editNote(BuildContext context) async {
    final result = await Navigator.push<NoteModel?>(
      context,
      MaterialPageRoute(
        builder: (context) => EditNoteScreen(note: note),
      ),
    );
  }

  void _shareNote(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ShareNoteScreen(note: note),
      ),
    );
  }

  void _confirmDelete(BuildContext context) async {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
        title: Text(
          'Delete Note',
          style: TextStyle(color: isDarkMode ? Colors.white : Colors.black),
        ),
        content: Text(
          'Are you sure you want to delete "${note.title}"?',
          style: TextStyle(color: isDarkMode ? Colors.white70 : Colors.black87),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: TextStyle(color: isDarkMode ? Colors.white70 : Colors.black),
            ),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    
    if (confirmed == true && onDelete != null) {
      onDelete!();
    }
  }

  IconData _getShareTypeIcon(ShareType type) {
    switch (type) {
      case ShareType.shared:
        return Icons.people;
      case ShareType.private:
        return Icons.lock;
    }
  }

  Color _getShareTypeColor(ShareType type, bool isDarkMode) {
    switch (type) {
      case ShareType.shared:
        return isDarkMode ? Colors.cyan.shade300 : Colors.blue;
      case ShareType.private:
        return isDarkMode ? Colors.white54 : Colors.grey;
    }
  }

  String _getShareTypeText(ShareType type) {
    switch (type) {
      case ShareType.shared:
        return 'Shared';
      case ShareType.private:
        return 'Private';
    }
  }
}