// lib/features/notes/presentation/screens/share_note_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/features/notes/data/models/note_model.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/friend_provider.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';

class ShareNoteScreen extends StatefulWidget {
  final NoteModel note;

  const ShareNoteScreen({super.key, required this.note});

  @override
  State<ShareNoteScreen> createState() => _ShareNoteScreenState();
}

class _ShareNoteScreenState extends State<ShareNoteScreen> {
  late ShareType _shareType;
  late bool _canEdit;
  List<int> _selectedFriendIds = [];
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _shareType = widget.note.shareType;
    _canEdit = widget.note.canEdit;
    _selectedFriendIds = List.from(widget.note.sharedWith);
    _loadFriends();
  }

  Future<void> _loadFriends() async {
    if (!mounted) return;
    
    final friendProvider = Provider.of<FriendProvider>(context, listen: false);
    await friendProvider.loadFriends();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDarkMode ? Colors.white : Colors.black;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey[600];
    final cardColor = isDarkMode ? const Color(0xFF1E1E1E) : Colors.white;
    final inputFillColor = isDarkMode ? const Color(0xFF2C2C2C) : Colors.grey[100];
    final backgroundColor = isDarkMode ? const Color(0xFF121212) : Colors.white;
    
    final isOwner = Provider.of<NotesProvider>(context).isOwner(widget.note);
    
    if (!isOwner) {
      return Scaffold(
        backgroundColor: backgroundColor,
        appBar: AppBar(
          title: Text(
            'Share Settings',
            style: TextStyle(color: textColor),
          ),
          backgroundColor: isDarkMode ? const Color(0xFF1E1E1E) : null,
        ),
        body: Center(
          child: Text(
            'Only the owner can change share settings',
            style: TextStyle(color: subtitleColor),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: backgroundColor,
      appBar: AppBar(
        title: Text(
          'Share Note',
          style: TextStyle(color: textColor),
        ),
        elevation: 0,
        backgroundColor: isDarkMode ? const Color(0xFF1E1E1E) : null,
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _updateSharing,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Text(
                    'Save',
                    style: TextStyle(color: Theme.of(context).primaryColor),
                  ),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Current sharing status
          Card(
            color: cardColor,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Current Status',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: textColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        _getShareTypeIcon(widget.note.shareType),
                        color: _getShareTypeColor(widget.note.shareType, isDarkMode),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _getShareTypeDescription(widget.note.shareType),
                        style: TextStyle(fontSize: 14, color: textColor),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          
          const SizedBox(height: 24),
          
          // Share type selector
          Text(
            'Share Type',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
          const SizedBox(height: 8),
          SegmentedButton<ShareType>(
            segments: const [
              ButtonSegment(
                value: ShareType.private,
                label: Text('Private'),
                icon: Icon(Icons.lock_outline),
              ),
              ButtonSegment(
                value: ShareType.shared,
                label: Text('Shared'),
                icon: Icon(Icons.people_outline),
              ),
            ],
            selected: {_shareType},
            style: ButtonStyle(
              foregroundColor: MaterialStateProperty.resolveWith<Color>(
                (states) => isDarkMode ? Colors.white : Colors.black,
              ),
            ),
            onSelectionChanged: (Set<ShareType> selected) {
              setState(() {
                _shareType = selected.first;
                if (_shareType != ShareType.shared) {
                  _selectedFriendIds.clear();
                }
              });
            },
          ),
          
          const SizedBox(height: 24),
          
          // Shared with friends section
          if (_shareType == ShareType.shared) ...[
            // Edit permission
            Card(
              color: cardColor,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Permissions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 8),
                    CheckboxListTile(
                      title: Text(
                        'Allow friends to edit',
                        style: TextStyle(color: textColor),
                      ),
                      value: _canEdit,
                      onChanged: (value) {
                        setState(() {
                          _canEdit = value ?? false;
                        });
                      },
                      secondary: Icon(Icons.edit, color: subtitleColor),
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 16),
            
            // Friend selection
            Card(
              color: cardColor,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Share with friends',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: textColor,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Consumer<FriendProvider>(
                      builder: (context, friendProvider, child) {
                        if (friendProvider.isLoading) {
                          return const Center(
                            child: Padding(
                              padding: EdgeInsets.all(16),
                              child: CircularProgressIndicator(),
                            ),
                          );
                        }
                        
                        if (friendProvider.friends.isEmpty) {
                          return Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: inputFillColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Column(
                              children: [
                                Icon(Icons.people_outline, color: subtitleColor),
                                const SizedBox(height: 8),
                                Text(
                                  'No friends yet',
                                  style: TextStyle(color: subtitleColor),
                                ),
                              ],
                            ),
                          );
                        }
                        
                        return Column(
                          children: friendProvider.friends.map((friend) {
                            final isSelected = _selectedFriendIds.contains(friend.id);
                            return CheckboxListTile(
                              title: Text(
                                friend.username,
                                style: TextStyle(color: textColor),
                              ),
                              subtitle: Text(
                                friend.email,
                                style: TextStyle(color: subtitleColor),
                              ),
                              value: isSelected,
                              onChanged: (selected) {
                                setState(() {
                                  if (selected == true) {
                                    _selectedFriendIds.add(friend.id);
                                  } else {
                                    _selectedFriendIds.remove(friend.id);
                                  }
                                });
                              },
                              secondary: CircleAvatar(
                                backgroundColor: Theme.of(context).primaryColor,
                                backgroundImage: friend.avatarUrl != null
                                    ? NetworkImage(friend.avatarUrl!)
                                    : null,
                                child: friend.avatarUrl == null
                                    ? Text(
                                        friend.username[0].toUpperCase(),
                                        style: const TextStyle(color: Colors.white),
                                      )
                                    : null,
                              ),
                            );
                          }).toList(),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
          ],
          
          const SizedBox(height: 24),
          
          // Stop sharing button (if currently shared)
          if (widget.note.shareType != ShareType.private)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: OutlinedButton.icon(
                onPressed: _isLoading ? null : _confirmStopSharing,
                icon: const Icon(Icons.stop),
                label: const Text('Stop Sharing'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Future<void> _updateSharing() async {
    setState(() => _isLoading = true);
    
    try {
      final provider = Provider.of<NotesProvider>(context, listen: false);
      
      await provider.shareNote(
        noteId: widget.note.id,
        shareType: _shareType,
        friendIds: _shareType == ShareType.shared ? _selectedFriendIds : null,
        canEdit: _canEdit,
      );
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Share settings updated'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _confirmStopSharing() async {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
        title: Text(
          'Stop Sharing',
          style: TextStyle(color: isDarkMode ? Colors.white : Colors.black),
        ),
        content: Text(
          'This note will become private. Continue?',
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
            child: const Text('Stop Sharing'),
          ),
        ],
      ),
    );
    
    if (confirmed == true) {
      setState(() => _isLoading = true);
      
      try {
        final provider = Provider.of<NotesProvider>(context, listen: false);
        await provider.stopSharing(widget.note.id);
        
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Sharing stopped'),
              backgroundColor: Colors.green,
            ),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Failed to stop sharing: $e'),
              backgroundColor: Colors.red,
            ),
          );
        }
      } finally {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
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

  String _getShareTypeDescription(ShareType type) {
    switch (type) {
      case ShareType.shared:
        return 'Shared with ${widget.note.sharedWith.length} friend(s)';
      case ShareType.private:
        return 'Private - Only you can view';
    }
  }
}