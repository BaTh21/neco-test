// lib/features/notes/presentation/screens/edit_note_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/features/notes/data/models/note_model.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/friend_provider.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';

class EditNoteScreen extends StatefulWidget {
  final NoteModel note;

  const EditNoteScreen({super.key, required this.note});

  @override
  State<EditNoteScreen> createState() => _EditNoteScreenState();
}

class _EditNoteScreenState extends State<EditNoteScreen> {
  static const List<Color> _colorOptions = [
    Colors.white,
    Color(0xFFFFF3E0),
    Color(0xFFE8F5E9),
    Color(0xFFE3F2FD),
    Color(0xFFF3E5F5),
    Color(0xFFFFF0F0),
    Color(0xFFFFF8E1),
  ];

  late final TextEditingController _titleController;
  late final TextEditingController _contentController;

  late Color _selectedColor;
  late ShareType _shareType;
  late bool _canEdit;
  late List<int> _selectedFriendIds;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.note.title);
    _contentController = TextEditingController(text: widget.note.content);
    _selectedColor = widget.note.color;
    _shareType = widget.note.shareType;
    _canEdit = widget.note.canEdit;
    _selectedFriendIds = List.from(widget.note.sharedWith);

    // Load friends for shared selection
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<FriendProvider>(context, listen: false).loadFriends();
    });
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Edit Note'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _updateNote,
            child: _isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Text(
                    'Save',
                    style: TextStyle(color: Colors.white),
                  ),
          ),
        ],
      ),
      body: GestureDetector(
        onTap: () => FocusScope.of(context).unfocus(),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Title
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),

            // Content
            TextField(
              controller: _contentController,
              decoration: const InputDecoration(
                labelText: 'Content',
                border: OutlineInputBorder(),
                alignLabelWithHint: true,
              ),
              maxLines: 10,
              keyboardType: TextInputType.multiline,
            ),
            const SizedBox(height: 24),

            // Color picker
            Text(
              'Note Color',
              style: theme.textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 50,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _colorOptions.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final color = _colorOptions[index];
                  final isSelected = _selectedColor == color;

                  return Semantics(
                    label: 'Color option',
                    value: isSelected ? 'Selected' : null,
                    child: GestureDetector(
                      onTap: () => setState(() => _selectedColor = color),
                      child: Container(
                        width: 50,
                        decoration: BoxDecoration(
                          color: color,
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: isSelected
                                ? colorScheme.primary
                                : theme.dividerColor,
                            width: isSelected ? 3 : 1,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 24),

            // Share settings
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Share Settings',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),

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
                      onSelectionChanged: (Set<ShareType> selected) {
                        setState(() {
                          _shareType = selected.first;
                          if (_shareType != ShareType.shared) {
                            _selectedFriendIds.clear();
                          }
                        });
                      },
                    ),

                    if (_shareType == ShareType.shared) ...[
                      const SizedBox(height: 16),

                      CheckboxListTile(
                        title: const Text('Allow friends to edit'),
                        value: _canEdit,
                        onChanged: (value) {
                          setState(() {
                            _canEdit = value ?? false;
                          });
                        },
                        secondary: const Icon(Icons.edit),
                      ),

                      const SizedBox(height: 8),

                      const Text(
                        'Share with friends:',
                        style: TextStyle(fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 8),

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
                                color: theme.colorScheme.surfaceContainerHighest.withOpacity(0.5),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Column(
                                children: [
                                  Icon(Icons.people_outline, color: Colors.grey),
                                  SizedBox(height: 8),
                                  Text(
                                    'No friends yet',
                                    style: TextStyle(color: Colors.grey),
                                  ),
                                ],
                              ),
                            );
                          }

                          return Column(
                            children: friendProvider.friends.map((friend) {
                              final isSelected = _selectedFriendIds.contains(friend.id);
                              return CheckboxListTile(
                                title: Text(friend.username),
                                subtitle: Text(friend.email),
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
                                  backgroundColor: colorScheme.primary,
                                  backgroundImage: friend.avatarUrl != null
                                      ? NetworkImage(friend.avatarUrl!)
                                      : null,
                                  child: friend.avatarUrl == null
                                      ? Text(friend.username[0].toUpperCase())
                                      : null,
                                ),
                              );
                            }).toList(),
                          );
                        },
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateNote() async {
    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Title cannot be empty'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
      return;
    }

    if (mounted) setState(() => _isLoading = true);

    try {
      final notesProvider = Provider.of<NotesProvider>(context, listen: false);

      final updatedNote = await notesProvider.updateNote(
        noteId: widget.note.id,
        title: _titleController.text.trim(),
        content: _contentController.text.trim().isEmpty
            ? null
            : _contentController.text.trim(),
        color: _selectedColor,
        shareType: _shareType,
        sharedWith: _shareType == ShareType.shared ? _selectedFriendIds : null,
        canEdit: _canEdit,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Note updated successfully'),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );
        Navigator.pop(context, updatedNote);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update note: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}