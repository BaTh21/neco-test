import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/features/notes/data/models/note_model.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/friend_provider.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';

class CreateNoteScreen extends StatefulWidget {
  final VoidCallback? onNoteCreated;

  const CreateNoteScreen({super.key, this.onNoteCreated});

  @override
  State<CreateNoteScreen> createState() => _CreateNoteScreenState();
}

class _CreateNoteScreenState extends State<CreateNoteScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();

  Color _selectedColor = Colors.white;
  ShareType _shareType = ShareType.private;
  bool _canEdit = false;
  List<int> _selectedFriendIds = [];
  bool _isLoading = false;

  final List<Color> _colorOptions = [
    Colors.white,
    const Color(0xFFFFF3E0),
    const Color(0xFFE8F5E9),
    const Color(0xFFE3F2FD),
    const Color(0xFFF3E5F5),
    const Color(0xFFFFF0F0),
    const Color(0xFFFFF8E1),
  ];

  @override
  void initState() {
    super.initState();
    _loadFriends();
  }

  Future<void> _loadFriends() async {
    if (!mounted) return;

    final friendProvider = Provider.of<FriendProvider>(context, listen: false);
    await friendProvider.loadFriends();
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
        title: const Text('Create New Note'),
        actions: [
          TextButton(
            onPressed: _isLoading ? null : _createNote,
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
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            TextFormField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Title',
                border: OutlineInputBorder(),
                hintText: 'Enter note title...',
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Title is required';
                }
                return null;
              },
              autofocus: true,
            ),

            const SizedBox(height: 16),

            TextFormField(
              controller: _contentController,
              decoration: const InputDecoration(
                labelText: 'Content',
                border: OutlineInputBorder(),
                hintText: 'Write your note here...',
                alignLabelWithHint: true,
              ),
              maxLines: 10,
              keyboardType: TextInputType.multiline,
            ),

            const SizedBox(height: 24),

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
                  return GestureDetector(
                    onTap: () => setState(() => _selectedColor = color),
                    child: Container(
                      width: 50,
                      decoration: BoxDecoration(
                        color: color,
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: _selectedColor == color
                              ? colorScheme.primary
                              : theme.dividerColor,
                          width: _selectedColor == color ? 3 : 1,
                        ),
                        boxShadow: _selectedColor == color
                            ? [
                                BoxShadow(
                                  color: colorScheme.primary.withOpacity(0.3),
                                  blurRadius: 8,
                                  spreadRadius: 2,
                                ),
                              ]
                            : null,
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
                      style:
                          TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
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
                        // Public option removed
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
                                color: theme.colorScheme.surfaceContainerHighest
                                    .withOpacity(0.5),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: const Column(
                                children: [
                                  Icon(Icons.people_outline,
                                      color: Colors.grey),
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
                              final isSelected =
                                  _selectedFriendIds.contains(friend.id);
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

  Future<void> _createNote() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final notesProvider = Provider.of<NotesProvider>(context, listen: false);

      final note = await notesProvider.createNote(
        title: _titleController.text.trim(),
        content: _contentController.text.trim().isEmpty
            ? null
            : _contentController.text.trim(),
        color: _selectedColor,
        shareType: _shareType,
        sharedWith: _selectedFriendIds,
        canEdit: _canEdit,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Note created successfully'),
            backgroundColor: Theme.of(context).colorScheme.primary,
          ),
        );

        if (widget.onNoteCreated != null) {
          widget.onNoteCreated!();
        }

        Navigator.pop(context, note);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to create note: $e'),
            backgroundColor: Theme.of(context).colorScheme.error,
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
