import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';

class EditDiaryFullScreen extends StatefulWidget {
  final DiaryModel diary;
  final Function(DiaryModel) onUpdate;
  final List<Group> availableGroups;

  final FeedApiService? feedApiService;
  final Function(int)? onDelete;

  const EditDiaryFullScreen({
    super.key,
    required this.diary,
    required this.onUpdate,
    this.availableGroups = const [],
    this.feedApiService,
    this.onDelete,
  });

  @override
  State<EditDiaryFullScreen> createState() => _EditDiaryFullScreenState();
}

class _EditDiaryFullScreenState extends State<EditDiaryFullScreen> {
  late TextEditingController _titleController;
  late TextEditingController _contentController;
  late String _shareType;
  bool _isLoading = false;

  List<String> _currentImages = [];
  List<String> _currentVideos = [];
  final List<File> _newImages = [];
  final List<File> _newVideos = [];

  List<int> _selectedGroupIds = [];
  final ImagePicker _picker = ImagePicker();

  List<Group> _availableGroups = [];
  bool _isDeleting = false;
  bool _showGroupSelection = false;

  @override
  void initState() {
    super.initState();
    _titleController = TextEditingController(text: widget.diary.title);
    _contentController = TextEditingController(text: widget.diary.content);
    _shareType = widget.diary.shareType;
    _showGroupSelection = (_shareType == 'group');
    _currentImages = List.from(widget.diary.images);
    _currentVideos = List.from(widget.diary.videos);
    _selectedGroupIds = widget.diary.groups.map((g) => g.id).toList();
    _availableGroups = widget.availableGroups;
  }

  Future<void> _deleteDiary() async {
    if (_isDeleting ||
        widget.feedApiService == null ||
        widget.onDelete == null) {
      return;
    }

    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Delete Diary', style: textTheme.titleMedium),
        content: Text(
          'Are you sure you want to delete this diary? This action cannot be undone.',
          style: textTheme.bodyMedium
              ?.copyWith(color: colorScheme.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel',
                style: TextStyle(color: colorScheme.onSurfaceVariant)),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(context);

              if (mounted) {
                setState(() => _isDeleting = true);
              }

              try {
                await widget.feedApiService!.deleteDiary(widget.diary.id);

                if (mounted) {
                  widget.onDelete!(widget.diary.id);

                  _showSnackBar('Diary deleted successfully!', false);

                  await Future.delayed(const Duration(milliseconds: 1500));

                  Navigator.pop(context, null);
                }
              } catch (e) {
                if (mounted) {
                  setState(() => _isDeleting = false);
                  _showSnackBar('Failed to delete diary: $e', true);
                }
              }
            },
            child: const Text(
              'Delete',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _pickImages() async {
    try {
      final pickedFiles = await _picker.pickMultiImage(
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );
      if (pickedFiles != null && pickedFiles.isNotEmpty) {
        setState(() {
          _newImages.addAll(pickedFiles.map((file) => File(file.path)));
        });
        _showSnackBar('Added ${pickedFiles.length} new photo(s)', false);
      }
    } catch (e) {
      _showSnackBar('Failed to pick images: $e', true);
    }
  }

  Future<void> _pickVideos() async {
    try {
      final pickedFile = await _picker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 10),
      );
      if (pickedFile != null) {
        setState(() {
          _newVideos.add(File(pickedFile.path));
        });
        _showSnackBar('Added video', false);
      }
    } catch (e) {
      _showSnackBar('Failed to pick video: $e', true);
    }
  }

  void _removeMedia(String url, bool isVideo) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Remove Media', style: textTheme.titleMedium),
        content: Text(
          'Remove this ${isVideo ? 'video' : 'image'}?',
          style: textTheme.bodyMedium
              ?.copyWith(color: colorScheme.onSurfaceVariant),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text('Cancel',
                style: TextStyle(color: colorScheme.onSurfaceVariant)),
          ),
          TextButton(
            onPressed: () {
              setState(() {
                if (isVideo) {
                  _currentVideos.remove(url);
                } else {
                  _currentImages.remove(url);
                }
              });
              Navigator.pop(context);
              _showSnackBar('Removed ${isVideo ? 'video' : 'image'}', false);
            },
            child: const Text('Remove', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  void _removeNewMedia(File file, bool isVideo) {
    setState(() {
      if (isVideo) {
        _newVideos.remove(file);
      } else {
        _newImages.remove(file);
      }
    });
    _showSnackBar('Removed new ${isVideo ? 'video' : 'image'}', false);
  }

  Future<void> _saveChanges() async {
    if (_titleController.text.trim().isEmpty) {
      _showSnackBar('Please enter a title', true);
      return;
    }

    if (_contentController.text.trim().isEmpty) {
      _showSnackBar('Please enter content', true);
      return;
    }

    if (_shareType == 'group' && _selectedGroupIds.isEmpty) {
      _showSnackBar('Please select at least one group', true);
      return;
    }

    setState(() => _isLoading = true);

    try {
      final groups = _availableGroups
          .where((group) => _selectedGroupIds.contains(group.id))
          .toList();

      final updatedDiary = DiaryModel(
        id: widget.diary.id,
        author: widget.diary.author,
        title: _titleController.text.trim(),
        content: _contentController.text.trim(),
        shareType: _shareType,
        groups: groups,
        images: _currentImages,
        videos: _currentVideos,
        videoThumbnails: widget.diary.videoThumbnails,
        mediaType: widget.diary.mediaType,
        likes: widget.diary.likes,
        isDeleted: widget.diary.isDeleted,
        createdAt: widget.diary.createdAt,
        updatedAt: DateTime.now(),
        favoritedUserIds: widget.diary.favoritedUserIds,
        comments: widget.diary.comments,
      );

      await widget.onUpdate(updatedDiary);

      _showSnackBar('Diary updated successfully!', false);

      if (mounted) {
        Navigator.pop(context, updatedDiary);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
      _showSnackBar('Failed to save: $e', true);
    }
  }

  void _showSnackBar(String message, bool isError) {
    if (!mounted) return;

    final colorScheme = Theme.of(context).colorScheme;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? colorScheme.error : colorScheme.primary,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  // Privacy dropdown (matching the create screen)
  Widget _buildPrivacyDropdown() {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return DropdownButtonFormField<String>(
      value: _shareType,
      isExpanded: true,
      decoration: InputDecoration(
        labelText: 'Privacy *',
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
        ),
        filled: true,
        fillColor: colorScheme.surfaceContainerHighest,
      ),
      items: const [
        DropdownMenuItem(
          value: 'personal',
          child: Row(
            children: [
              Icon(Icons.lock, size: 18, color: Colors.red),
              SizedBox(width: 8),
              Expanded(
                child: Text('Private – Only you can see this'),
              ),
            ],
          ),
        ),
        DropdownMenuItem(
          value: 'public',
          child: Row(
            children: [
              Icon(Icons.public, size: 18, color: Colors.green),
              SizedBox(width: 8),
              Expanded(
                child: Text('Public – Everyone can see this'),
              ),
            ],
          ),
        ),
        DropdownMenuItem(
          value: 'friends',
          child: Row(
            children: [
              Icon(Icons.people, size: 18, color: Colors.blue),
              SizedBox(width: 8),
              Expanded(
                child: Text('Friends – Only your friends can see this'),
              ),
            ],
          ),
        ),
        DropdownMenuItem(
          value: 'group',
          child: Row(
            children: [
              Icon(Icons.group, size: 18, color: Colors.purple),
              SizedBox(width: 8),
              Expanded(
                child: Text('Selected Groups – Only specific groups'),
              ),
            ],
          ),
        ),
      ],
      onChanged: (_isLoading || _isDeleting)
          ? null
          : (newValue) {
              if (newValue != null) {
                setState(() {
                  _shareType = newValue;
                  _showGroupSelection = (newValue == 'group');
                  if (newValue != 'group') {
                    _selectedGroupIds.clear();
                  }
                });
              }
            },
      validator: (value) {
        if (value == null) return 'Please select privacy level';
        return null;
      },
    );
  }

  Widget _buildCurrentMediaItem(String url, bool isVideo, int index) {
    final colorScheme = Theme.of(context).colorScheme;

    return Stack(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            border: Border.all(color: colorScheme.outlineVariant),
            borderRadius: BorderRadius.circular(8),
          ),
          child: isVideo
              ? Container(
                  color: colorScheme.surfaceContainerHighest,
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.videocam,
                            size: 24, color: colorScheme.onSurfaceVariant),
                        const SizedBox(height: 4),
                        Text('Video',
                            style: TextStyle(
                                fontSize: 10,
                                color: colorScheme.onSurfaceVariant)),
                      ],
                    ),
                  ),
                )
              : Image.network(
                  url,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: colorScheme.surfaceContainerHighest,
                      child: Center(
                        child: Icon(Icons.broken_image,
                            color: colorScheme.onSurfaceVariant),
                      ),
                    );
                  },
                ),
        ),
        Positioned(
          top: 0,
          right: 0,
          child: GestureDetector(
            onTap: (_isLoading || _isDeleting)
                ? null
                : () => _removeMedia(url, isVideo),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close,
                size: 14,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildNewMediaItem(File file, bool isVideo, int index) {
    final colorScheme = Theme.of(context).colorScheme;

    return Stack(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            border: Border.all(
              color: isVideo ? colorScheme.tertiary : colorScheme.secondary,
            ),
            borderRadius: BorderRadius.circular(8),
            color: isVideo
                ? colorScheme.tertiaryContainer
                : colorScheme.secondaryContainer,
          ),
          child: isVideo
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.videocam,
                          size: 24, color: colorScheme.onTertiaryContainer),
                      const SizedBox(height: 4),
                      Text('Video',
                          style: TextStyle(
                              fontSize: 10,
                              color: colorScheme.onTertiaryContainer)),
                    ],
                  ),
                )
              : Image.file(
                  file,
                  width: 80,
                  height: 80,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) {
                    return Container(
                      color: colorScheme.secondaryContainer,
                      child: Center(
                        child: Icon(Icons.broken_image,
                            color: colorScheme.onSecondaryContainer),
                      ),
                    );
                  },
                ),
        ),
        Positioned(
          top: 0,
          right: 0,
          child: GestureDetector(
            onTap: (_isLoading || _isDeleting)
                ? null
                : () => _removeNewMedia(file, isVideo),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.close,
                size: 14,
                color: Colors.white,
              ),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      resizeToAvoidBottomInset: true, // ensure keyboard doesn't cover content
      appBar: AppBar(
        title: Text(
          'Edit Diary',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.onPrimary),
        ),
        leading: IconButton(
          icon: Icon(Icons.close, color: colorScheme.onPrimary),
          onPressed: (_isLoading || _isDeleting)
              ? null
              : () {
                  if (_titleController.text != widget.diary.title ||
                      _contentController.text != widget.diary.content ||
                      _newImages.isNotEmpty ||
                      _newVideos.isNotEmpty) {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text('Discard Changes?',
                            style: textTheme.titleMedium),
                        content: Text(
                          'You have unsaved changes. Are you sure you want to discard?',
                          style: textTheme.bodyMedium
                              ?.copyWith(color: colorScheme.onSurfaceVariant),
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context),
                            child: Text('Cancel',
                                style: TextStyle(
                                    color: colorScheme.onSurfaceVariant)),
                          ),
                          TextButton(
                            onPressed: () {
                              Navigator.pop(context);
                              Navigator.pop(context);
                            },
                            child: const Text(
                              'Discard',
                              style: TextStyle(color: Colors.red),
                            ),
                          ),
                        ],
                      ),
                    );
                  } else {
                    Navigator.pop(context);
                  }
                },
        ),
        actions: [
          if (widget.feedApiService != null && widget.onDelete != null)
            IconButton(
              icon: const Icon(Icons.delete_outline, color: Colors.red),
              onPressed: (_isLoading || _isDeleting) ? null : _deleteDiary,
              tooltip: 'Delete Diary',
            ),
        ],
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            // Increased bottom padding to avoid keyboard overlap
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 40),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                TextFormField(
                  controller: _titleController,
                  decoration: InputDecoration(
                    labelText: 'Title *',
                    hintText: 'Give your diary a title',
                    labelStyle: textTheme.bodyLarge
                        ?.copyWith(color: colorScheme.onSurface),
                    hintStyle: textTheme.bodyMedium
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    filled: true,
                    fillColor: colorScheme.surfaceContainerHighest,
                  ),
                  style: textTheme.bodyLarge
                      ?.copyWith(color: colorScheme.onSurface),
                  maxLength: 255,
                ),

                const SizedBox(height: 16),

                // Content
                TextFormField(
                  controller: _contentController,
                  decoration: InputDecoration(
                    labelText: 'Content *',
                    hintText: 'Write your thoughts here...',
                    labelStyle: textTheme.bodyLarge
                        ?.copyWith(color: colorScheme.onSurface),
                    hintStyle: textTheme.bodyMedium
                        ?.copyWith(color: colorScheme.onSurfaceVariant),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                    alignLabelWithHint: true,
                    filled: true,
                    fillColor: colorScheme.surfaceContainerHighest,
                  ),
                  style: textTheme.bodyLarge
                      ?.copyWith(color: colorScheme.onSurface),
                  maxLines: 8,
                  minLines: 4,
                ),

                const SizedBox(height: 16),

                // Privacy Dropdown
                _buildPrivacyDropdown(),
                const SizedBox(height: 8),

                // Helper text (optional)
                if (_shareType == 'personal')
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Text(
                      '🔒 Only you will see this diary entry.',
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else if (_shareType == 'public')
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Text(
                      '🌍 Anyone can view and interact with this diary.',
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else if (_shareType == 'friends')
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Text(
                      '👥 Only your friends can see this diary.',
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  )
                else if (_shareType == 'group')
                  Padding(
                    padding: const EdgeInsets.only(left: 12),
                    child: Text(
                      '👥 Only members of the selected groups will see this.',
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),
                  ),

                const SizedBox(height: 16),

                // Group selection (only when _shareType == 'group')
                if (_availableGroups.isNotEmpty && _shareType == 'group')
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Select Groups:',
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _availableGroups.map((group) {
                          final isSelected =
                              _selectedGroupIds.contains(group.id);
                          return FilterChip(
                            label: Text(group.name),
                            selected: isSelected,
                            onSelected: (_isLoading || _isDeleting)
                                ? null
                                : (selected) {
                                    setState(() {
                                      if (selected) {
                                        _selectedGroupIds.add(group.id);
                                      } else {
                                        _selectedGroupIds.remove(group.id);
                                      }
                                    });
                                  },
                            selectedColor: colorScheme.primaryContainer,
                            backgroundColor:
                                colorScheme.surfaceContainerHighest,
                            labelStyle: TextStyle(
                              color: isSelected
                                  ? colorScheme.onPrimaryContainer
                                  : colorScheme.onSurface,
                            ),
                            avatar: CircleAvatar(
                              backgroundColor: isSelected
                                  ? colorScheme.primary
                                  : colorScheme.surfaceContainerHighest,
                              radius: 12,
                              child: Text(
                                group.name.substring(0, 1).toUpperCase(),
                                style: TextStyle(
                                  fontSize: 12,
                                  color: isSelected
                                      ? colorScheme.onPrimary
                                      : colorScheme.onSurface,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                      if (_selectedGroupIds.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Text(
                          'Selected: ${_selectedGroupIds.length} group(s)',
                          style: textTheme.bodyMedium?.copyWith(
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ],
                  ),

                const SizedBox(height: 16),

                // Current Media
                if (_currentImages.isNotEmpty || _currentVideos.isNotEmpty)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            'Current Media:',
                            style: textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Chip(
                            label: Text(
                                '${_currentImages.length + _currentVideos.length}'),
                            backgroundColor:
                                colorScheme.surfaceContainerHighest,
                            labelStyle: textTheme.labelSmall
                                ?.copyWith(color: colorScheme.onSurface),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      if (_currentImages.isNotEmpty) ...[
                        Text(
                          'Images:',
                          style: textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _currentImages.asMap().entries.map((entry) {
                            final index = entry.key;
                            final url = entry.value;
                            return _buildCurrentMediaItem(url, false, index);
                          }).toList(),
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (_currentVideos.isNotEmpty) ...[
                        Text(
                          'Videos:',
                          style: textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: _currentVideos.asMap().entries.map((entry) {
                            final index = entry.key;
                            final url = entry.value;
                            return _buildCurrentMediaItem(url, true, index);
                          }).toList(),
                        ),
                      ],
                    ],
                  ),

                const SizedBox(height: 16),

                // Add New Media
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Add More Media (optional):',
                      style: textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: (_isLoading || _isDeleting)
                                ? null
                                : _pickImages,
                            icon: const Icon(Icons.photo_library),
                            label: const Text('Add Photos'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              backgroundColor: colorScheme.secondaryContainer,
                              foregroundColor: colorScheme.onSecondaryContainer,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: (_isLoading || _isDeleting)
                                ? null
                                : _pickVideos,
                            icon: const Icon(Icons.video_library),
                            label: const Text('Add Video'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              backgroundColor: colorScheme.tertiaryContainer,
                              foregroundColor: colorScheme.onTertiaryContainer,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Max 10 images total, Max 3 videos total',
                      style: textTheme.bodySmall
                          ?.copyWith(color: colorScheme.onSurfaceVariant),
                    ),

                    // New Images
                    if (_newImages.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Text(
                            'New Photos:',
                            style: textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Chip(
                            label: Text('${_newImages.length}'),
                            backgroundColor: colorScheme.secondaryContainer,
                            labelStyle: textTheme.labelSmall?.copyWith(
                                color: colorScheme.onSecondaryContainer),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _newImages.asMap().entries.map((entry) {
                          final index = entry.key;
                          final file = entry.value;
                          return _buildNewMediaItem(file, false, index);
                        }).toList(),
                      ),
                    ],

                    // New Videos
                    if (_newVideos.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Text(
                            'New Videos:',
                            style: textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w500,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Chip(
                            label: Text('${_newVideos.length}'),
                            backgroundColor: colorScheme.tertiaryContainer,
                            labelStyle: textTheme.labelSmall?.copyWith(
                                color: colorScheme.onTertiaryContainer),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _newVideos.asMap().entries.map((entry) {
                          final index = entry.key;
                          final file = entry.value;
                          return _buildNewMediaItem(file, true, index);
                        }).toList(),
                      ),
                    ],
                  ],
                ),

                const SizedBox(height: 32),

                // Update Button
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed:
                        (_isLoading || _isDeleting) ? null : _saveChanges,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 12),
                      textStyle: const TextStyle(
                          fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    child: _isLoading
                        ? CircularProgressIndicator(
                            color: colorScheme.onPrimary)
                        : const Text(
                            'Update Diary',
                            softWrap: true,
                            textAlign: TextAlign.center,
                            overflow: TextOverflow.visible,
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ),

                // Delete Button
                if (widget.feedApiService != null &&
                    widget.onDelete != null) ...[
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed:
                          (_isLoading || _isDeleting) ? null : _deleteDiary,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: colorScheme.error,
                        foregroundColor: colorScheme.onError,
                      ),
                      child: _isDeleting
                          ? CircularProgressIndicator(
                              color: colorScheme.onError)
                          : const Text('Delete Diary',
                              style: TextStyle(fontSize: 16)),
                    ),
                  ),
                ],

                // Extra spacer to ensure the button is fully visible
                const SizedBox(height: 40),
              ],
            ),
          ),

          // Loading Overlay
          if (_isLoading || _isDeleting)
            Container(
              color: colorScheme.surface.withOpacity(0.7),
              child: const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: Colors.white),
                    SizedBox(height: 16),
                    Text(
                      'Processing...',
                      style: TextStyle(color: Colors.white, fontSize: 16),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    super.dispose();
  }
}
