import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';
import 'package:whisper_space_flutter/features/notes/data/models/note_model.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';
import 'package:whisper_space_flutter/features/notes/presentation/screens/create_note_screen.dart';
import 'package:whisper_space_flutter/features/notes/presentation/screens/share_note_screen.dart';
import 'package:whisper_space_flutter/features/notes/presentation/widgets/note_card.dart';

class NotesTab extends StatefulWidget {
  const NotesTab({super.key});

  @override
  State<NotesTab> createState() => _NotesTabState();
}

class _NotesTabState extends State<NotesTab>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isInitialized = false;
  int? _currentUserId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadCurrentUser();
      _initializeNotes();
    });
  }

  void _loadCurrentUser() {
    if (!mounted) return;
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;
    if (user != null) {
      setState(() {
        _currentUserId = user.id;
      });

      final notesProvider = Provider.of<NotesProvider>(context, listen: false);
      notesProvider.setCurrentUserId(user.id);
    }
  }

  Future<void> _initializeNotes() async {
    if (!mounted) return;

    try {
      final notesProvider = Provider.of<NotesProvider>(context, listen: false);
      await Future.wait([
        notesProvider.loadNotes(),
        notesProvider.loadSharedNotes(),
      ]);
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    } catch (e) {
      print('Failed to initialize notes: $e');
      if (mounted) {
        setState(() => _isInitialized = true);
      }
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final tabBarBgColor =
        isDarkMode ? const Color(0xFF2C2C2C) : const Color(0xFFE0C3FF);
    final indicatorColor =
        isDarkMode ? const Color(0xFF00BCD4) : const Color(0xFF6A11CB);
    final unselectedColor = isDarkMode ? Colors.white54 : Colors.grey.shade600;

    return Scaffold(
      body: _isInitialized
          ? Column(
              children: [
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  margin:
                      const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: tabBarBgColor,
                    borderRadius: BorderRadius.circular(30),
                  ),
                  child: TabBar(
                    indicatorColor: Colors.transparent,
                    dividerColor: Colors.transparent,
                    controller: _tabController,
                    isScrollable: false,
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
                          child: Text("All Notes", textAlign: TextAlign.center),
                        ),
                      ),
                      Tab(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Text("Shared", textAlign: TextAlign.center),
                        ),
                      ),
                      Tab(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 12),
                          child: Text("Archived", textAlign: TextAlign.center),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _AllNotesTab(),
                      _SharedNotesTab(),
                      _ArchivedNotesTab(),
                    ],
                  ),
                ),
              ],
            )
          : const Center(
              child: CircularProgressIndicator(),
            ),
      floatingActionButton: FloatingActionButton(
        elevation: 6,
        onPressed: _createNewNote,
        backgroundColor:
            isDarkMode ? const Color(0xFF00BCD4) : const Color(0xFF6A11CB),
        child: const Icon(Icons.add, size: 28),
      ),
    );
  }

  Future<void> _refreshNotes() async {
    final provider = Provider.of<NotesProvider>(context, listen: false);
    await provider.loadNotes();
    await provider.loadSharedNotes();
  }

  void _createNewNote() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateNoteScreen(
          onNoteCreated: () {
            _refreshNotes();
          },
        ),
      ),
    );
  }
}

class _AllNotesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey;
    final errorColor = isDarkMode ? Colors.red.shade300 : Colors.red;

    return Consumer<NotesProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: errorColor),
                const SizedBox(height: 16),
                Text(
                  provider.error!,
                  style: TextStyle(color: errorColor),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    provider.clearError();
                    provider.loadNotes();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final notes = provider.notes.where((note) => !note.isArchived).toList();
        final currentUserId = provider.currentUserId;

        if (notes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.note_outlined, size: 80, color: subtitleColor),
                const SizedBox(height: 16),
                Text(
                  'No notes yet',
                  style: TextStyle(fontSize: 20, color: subtitleColor),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create your first note',
                  style: TextStyle(color: subtitleColor),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => CreateNoteScreen(
                          onNoteCreated: () {
                            provider.loadNotes();
                          },
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.add),
                  label: const Text('Create Note'),
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadNotes(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: notes.length,
            itemBuilder: (context, index) {
              final note = notes[index];
              final isOwner = provider.isOwner(note);
              final isSharedWithMe = !isOwner &&
                  note.shareType == ShareType.shared &&
                  note.sharedWith.contains(currentUserId);

              return NoteCard(
                note: note,
                isOwner: isOwner,
                canEdit: provider.canEdit(note),
                onPinToggle: () => provider.togglePin(note.id),
                onArchiveToggle: () => provider.toggleArchive(note.id),
                onDelete: () async {
                  try {
                    await provider.deleteNote(note.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Note deleted'),
                          backgroundColor:
                              isDarkMode ? Colors.green.shade800 : Colors.green,
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Failed to delete: $e'),
                          backgroundColor:
                              isDarkMode ? Colors.red.shade800 : Colors.red,
                        ),
                      );
                    }
                  }
                },
                onShare: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ShareNoteScreen(note: note),
                    ),
                  ).then((_) => provider.loadNotes());
                },
                // ✅ Leave callback for shared notes
                onLeave: isSharedWithMe
                    ? () async {
                        try {
                          await provider.leaveSharedNote(note.id);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: const Text('Left shared note'),
                                backgroundColor: isDarkMode
                                    ? Colors.green.shade800
                                    : Colors.green,
                              ),
                            );
                          }
                        } catch (e) {
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Failed to leave: $e'),
                                backgroundColor: isDarkMode
                                    ? Colors.red.shade800
                                    : Colors.red,
                              ),
                            );
                          }
                        }
                      }
                    : null,
              );
            },
          ),
        );
      },
    );
  }
}

class _SharedNotesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey;
    final errorColor = isDarkMode ? Colors.red.shade300 : Colors.red;

    return Consumer<NotesProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: errorColor),
                const SizedBox(height: 16),
                Text(
                  provider.error!,
                  style: TextStyle(color: errorColor),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    provider.clearError();
                    provider.loadSharedNotes();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (provider.sharedNotes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.people_outline, size: 80, color: subtitleColor),
                const SizedBox(height: 16),
                Text(
                  'No shared notes',
                  style: TextStyle(fontSize: 20, color: subtitleColor),
                ),
                const SizedBox(height: 8),
                Text(
                  'Notes shared with you will appear here',
                  style: TextStyle(color: subtitleColor),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadSharedNotes(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.sharedNotes.length,
            itemBuilder: (context, index) {
              final note = provider.sharedNotes[index];
              final canEdit = provider.canEdit(note);

              return NoteCard(
                note: note,
                isOwner: false,
                canEdit: canEdit,
                onLeave: () async {
                  try {
                    await provider.leaveSharedNote(note.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Left shared note'),
                          backgroundColor:
                              isDarkMode ? Colors.green.shade800 : Colors.green,
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Failed to leave: $e'),
                          backgroundColor:
                              isDarkMode ? Colors.red.shade800 : Colors.red,
                        ),
                      );
                    }
                  }
                },
              );
            },
          ),
        );
      },
    );
  }
}

class _ArchivedNotesTab extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final isDarkMode = Theme.of(context).brightness == Brightness.dark;
    final subtitleColor = isDarkMode ? Colors.white70 : Colors.grey;
    final errorColor = isDarkMode ? Colors.red.shade300 : Colors.red;

    return Consumer<NotesProvider>(
      builder: (context, provider, child) {
        if (provider.isLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (provider.error != null) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, size: 64, color: errorColor),
                const SizedBox(height: 16),
                Text(
                  provider.error!,
                  style: TextStyle(color: errorColor),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () {
                    provider.clearError();
                    provider.loadNotes();
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        if (provider.archivedNotes.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.archive_outlined, size: 80, color: subtitleColor),
                const SizedBox(height: 16),
                Text(
                  'No archived notes',
                  style: TextStyle(fontSize: 20, color: subtitleColor),
                ),
                const SizedBox(height: 8),
                Text(
                  'Archived notes will appear here',
                  style: TextStyle(color: subtitleColor),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          );
        }

        return RefreshIndicator(
          onRefresh: () => provider.loadNotes(),
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.archivedNotes.length,
            itemBuilder: (context, index) {
              final note = provider.archivedNotes[index];
              final isOwner = provider.isOwner(note);
              final canEdit = provider.canEdit(note);

              return NoteCard(
                note: note,
                isOwner: isOwner,
                canEdit: canEdit,
                onPinToggle: () => provider.togglePin(note.id),
                onArchiveToggle: () => provider.toggleArchive(note.id),
                onDelete: () async {
                  try {
                    await provider.deleteNote(note.id);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: const Text('Note deleted'),
                          backgroundColor:
                              isDarkMode ? Colors.green.shade800 : Colors.green,
                        ),
                      );
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Failed to delete: $e'),
                          backgroundColor:
                              isDarkMode ? Colors.red.shade800 : Colors.red,
                        ),
                      );
                    }
                  }
                },
              );
            },
          ),
        );
      },
    );
  }
}