import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';

class CreateDiaryScreen extends StatefulWidget {
  final FeedApiService feedApiService;
  final Function(DiaryModel)? onDiaryCreated;

  const CreateDiaryScreen({
    super.key,
    required this.feedApiService,
    this.onDiaryCreated,
  });

  @override
  State<CreateDiaryScreen> createState() => _CreateDiaryScreenState();
}

class _CreateDiaryScreenState extends State<CreateDiaryScreen> {
  final GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _contentController = TextEditingController();

  String _shareType = 'personal';
  final List<int> _selectedGroupIds = [];
  final List<File> _selectedImages = [];
  final List<File> _selectedVideos = [];

  bool _isLoading = false;
  bool _uploadingMedia = false;
  bool _showGroupSelection = false;
  bool _loadingGroups = false;

  List<Group> _availableGroups = [];
  final ImagePicker _imagePicker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _loadUserGroups();
  }

  Future<void> _loadUserGroups() async {
    if (_loadingGroups) return;

    setState(() => _loadingGroups = true);

    try {
      final groups = await widget.feedApiService.getUserGroups();
      setState(() {
        _availableGroups = groups;
      });
    } catch (e) {
      print('Failed to load groups: $e');
    } finally {
      setState(() => _loadingGroups = false);
    }
  }

  Future<void> _pickImages() async {
    try {
      final List<XFile>? pickedFiles = await _imagePicker.pickMultiImage(
        maxWidth: 1920,
        maxHeight: 1080,
        imageQuality: 85,
      );

      if (pickedFiles != null && pickedFiles.isNotEmpty) {
        setState(() {
          for (final xfile in pickedFiles) {
            if (_selectedImages.length < 10) {
              _selectedImages.add(File(xfile.path));
            }
          }
        });
        _showSnackBar('Added ${pickedFiles.length} image(s)', isError: false);
      }
    } catch (e) {
      _showSnackBar('Failed to pick images: $e', isError: true);
    }
  }

  Future<void> _pickVideo() async {
    try {
      final XFile? pickedFile = await _imagePicker.pickVideo(
        source: ImageSource.gallery,
        maxDuration: const Duration(minutes: 5),
      );

      if (pickedFile != null) {
        final file = File(pickedFile.path);

        final fileSize = await file.length();
        if (fileSize > 50 * 1024 * 1024) {
          _showSnackBar('Video file too large. Maximum size is 50MB.',
              isError: true);
          return;
        }

        setState(() {
          if (_selectedVideos.length < 3) {
            _selectedVideos.add(file);
          } else {
            _showSnackBar('Maximum 3 videos allowed', isError: true);
          }
        });
      }
    } catch (e) {
      _showSnackBar('Failed to pick video: $e', isError: true);
    }
  }

  Future<void> _submitDiary() async {
    if (!_formKey.currentState!.validate()) {
      _showSnackBar('Please fix the errors in the form', isError: true);
      return;
    }

    final title = _titleController.text.trim();
    final content = _contentController.text.trim();

    if (title.isEmpty || content.isEmpty) {
      _showSnackBar('Please enter both title and content', isError: true);
      return;
    }

    if (title.length < 3) {
      _showSnackBar('Title must be at least 3 characters', isError: true);
      return;
    }

    if (content.length < 10) {
      _showSnackBar('Content must be at least 10 characters', isError: true);
      return;
    }

    if (_shareType == 'group') {
      if (_selectedGroupIds.isEmpty) {
        _showSnackBar('Please select at least one group', isError: true);
        return;
      }

      if (_availableGroups.isEmpty) {
        _showSnackBar('No groups available. Create a group first.',
            isError: true);
        return;
      }
    }

    setState(() => _isLoading = true);

    try {
      List<String> imageUrls = [];
      List<String> videoUrls = [];

      if (_selectedImages.isNotEmpty || _selectedVideos.isNotEmpty) {
        setState(() => _uploadingMedia = true);

        for (int i = 0; i < _selectedImages.length; i++) {
          final image = _selectedImages[i];
          try {
            final url =
                await widget.feedApiService.uploadMedia(image, isVideo: false);
            imageUrls.add(url);
          } catch (e) {
            print('Failed to upload image: $e');
          }
        }

        for (int i = 0; i < _selectedVideos.length; i++) {
          final video = _selectedVideos[i];
          try {
            final url =
                await widget.feedApiService.uploadMedia(video, isVideo: true);
            videoUrls.add(url);
          } catch (e) {
            print('Failed to upload video: $e');
          }
        }

        setState(() => _uploadingMedia = false);
      }

      final diary = await widget.feedApiService.createDiary(
        title: title,
        content: content,
        shareType: _shareType,
        groupIds: _selectedGroupIds,
        imageUrls: imageUrls,
        videoUrls: videoUrls,
      );

      _showSnackBar('Diary created successfully!', isError: false);

      if (widget.onDiaryCreated != null) {
        widget.onDiaryCreated!(diary);
      }

      if (mounted) {
        Navigator.of(context).pop(diary);
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _uploadingMedia = false;
      });

      print('Create diary error: $e');
      _showSnackBar('Failed to create diary: ${e.toString()}', isError: true);
    }
  }

  void _showSnackBar(String message, {required bool isError}) {
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

  Widget _buildGroupSelectionSection() {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 16),
        Row(
          children: [
            Text(
              'Select Groups:',
              style: textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: colorScheme.onSurface,
              ),
            ),
            const Spacer(),
            if (_loadingGroups)
              SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: colorScheme.primary,
                ),
              )
            else
              IconButton(
                icon:
                    Icon(Icons.refresh, size: 20, color: colorScheme.onSurface),
                onPressed: _loadUserGroups,
                tooltip: 'Refresh groups',
              ),
          ],
        ),
        const SizedBox(height: 8),
        if (_availableGroups.isEmpty)
          Padding(
            padding: const EdgeInsets.all(8.0),
            child: Column(
              children: [
                Icon(Icons.group,
                    size: 48, color: colorScheme.onSurface.withOpacity(0.5)),
                const SizedBox(height: 8),
                Text(
                  'No groups available',
                  style: textTheme.bodyMedium
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
                const SizedBox(height: 4),
                Text(
                  'Create a group first or join existing ones',
                  style: textTheme.bodySmall
                      ?.copyWith(color: colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          )
        else
          Column(
            children: [
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _availableGroups.map((group) {
                  final isSelected = _selectedGroupIds.contains(group.id);
                  return FilterChip(
                    label: Text(group.name),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        if (selected) {
                          _selectedGroupIds.add(group.id);
                        } else {
                          _selectedGroupIds.remove(group.id);
                        }
                      });
                    },
                    selectedColor: colorScheme.primaryContainer,
                    backgroundColor: colorScheme.surfaceContainerHighest,
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
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: Text(
          'Create New Diary',
          style: textTheme.titleLarge?.copyWith(color: colorScheme.onPrimary),
        ),
        leading: IconButton(
          icon: Icon(Icons.close, color: colorScheme.onPrimary),
          onPressed: _isLoading
              ? null
              : () {
                  if (_titleController.text.isNotEmpty ||
                      _contentController.text.isNotEmpty ||
                      _selectedImages.isNotEmpty ||
                      _selectedVideos.isNotEmpty) {
                    showDialog(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: Text('Discard Diary?',
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
      ),
      body: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
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
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter a title';
                      }
                      if (value.trim().length < 3) {
                        return 'Title must be at least 3 characters';
                      }
                      return null;
                    },
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
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Please enter some content';
                      }
                      if (value.trim().length < 10) {
                        return 'Content must be at least 10 characters';
                      }
                      return null;
                    },
                  ),

                  const SizedBox(height: 16),

                  // Privacy Dropdown
                  DropdownButtonFormField<String>(
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
                    items: [
                      const DropdownMenuItem(
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
                      const DropdownMenuItem(
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
                      const DropdownMenuItem(
                        value: 'friends',
                        child: Row(
                          children: [
                            Icon(Icons.people, size: 18, color: Colors.blue),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                  'Friends – Only your friends can see this'),
                            ),
                          ],
                        ),
                      ),
                      const DropdownMenuItem(
                        value: 'group',
                        child: Row(
                          children: [
                            Icon(Icons.group, size: 18, color: Colors.purple),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                  'Selected Groups – Only specific groups'),
                            ),
                          ],
                        ),
                      ),
                    ],
                    onChanged: _isLoading
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
                  ),
                  const SizedBox(height: 8),
                  if (_shareType == 'personal')
                    Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: Text(
                        '🔒 Only you will see this diary entry.',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  else if (_shareType == 'public')
                    Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: Text(
                        '🌍 Anyone can view and interact with this diary.',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  else if (_shareType == 'friends')
                    Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: Text(
                        '👥 Only your friends can see this diary.',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    )
                  else if (_shareType == 'group')
                    Padding(
                      padding: const EdgeInsets.only(left: 12),
                      child: Text(
                        '👥 Only members of the selected groups will see this.',
                        style: textTheme.bodySmall?.copyWith(
                          color: colorScheme.onSurfaceVariant,
                        ),
                      ),
                    ),

                  // Group Selection
                  if (_showGroupSelection) _buildGroupSelectionSection(),

                  const SizedBox(height: 16),

                  // Media Section
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Media (optional):',
                        style: textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          Flexible(
                            child: ElevatedButton.icon(
                              onPressed: _isLoading ? null : _pickImages,
                              icon: const Icon(Icons.photo_library),
                              label: const Text('Add Photos',
                                  overflow: TextOverflow.ellipsis),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    vertical: 12, horizontal: 8),
                                backgroundColor: colorScheme.secondaryContainer,
                                foregroundColor:
                                    colorScheme.onSecondaryContainer,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Flexible(
                            child: ElevatedButton.icon(
                              onPressed: _isLoading ? null : _pickVideo,
                              icon: const Icon(Icons.video_library),
                              label: const Text('Add Video',
                                  overflow: TextOverflow.ellipsis),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(
                                    vertical: 12, horizontal: 8),
                                backgroundColor: colorScheme.tertiaryContainer,
                                foregroundColor:
                                    colorScheme.onTertiaryContainer,
                              ),
                            ),
                          ),
                        ],
                      ),

                      // Selected Images
                      if (_selectedImages.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Selected Images:',
                          style: textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children:
                              _selectedImages.asMap().entries.map((entry) {
                            final index = entry.key;
                            final image = entry.value;
                            return Stack(
                              children: [
                                Container(
                                  width: 80,
                                  height: 80,
                                  decoration: BoxDecoration(
                                    border: Border.all(
                                        color: colorScheme.outlineVariant),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Image.file(
                                    image,
                                    width: 80,
                                    height: 80,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  top: 0,
                                  right: 0,
                                  child: GestureDetector(
                                    onTap: () {
                                      setState(() {
                                        _selectedImages.removeAt(index);
                                      });
                                    },
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
                          }).toList(),
                        ),
                      ],

                      // Selected Videos
                      if (_selectedVideos.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Selected Videos:',
                          style: textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w500,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Column(
                          children:
                              _selectedVideos.asMap().entries.map((entry) {
                            final index = entry.key;
                            final video = entry.value;
                            return Card(
                              color: colorScheme.surfaceContainerHighest,
                              child: ListTile(
                                leading: Container(
                                  width: 40,
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: colorScheme.tertiaryContainer,
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Icon(Icons.videocam,
                                      color: colorScheme.onTertiaryContainer),
                                ),
                                title: Text(
                                  video.path.split('/').last,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: textTheme.bodyMedium
                                      ?.copyWith(color: colorScheme.onSurface),
                                ),
                                subtitle: Text(
                                  'Video',
                                  style: textTheme.bodySmall?.copyWith(
                                      color: colorScheme.onSurfaceVariant),
                                ),
                                trailing: IconButton(
                                  icon: const Icon(Icons.close,
                                      color: Colors.red),
                                  onPressed: () {
                                    setState(() {
                                      _selectedVideos.removeAt(index);
                                    });
                                  },
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                      ],
                    ],
                  ),

                  const SizedBox(height: 32),

                  // Submit Button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _submitDiary,
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
                              'Create Diary',
                              softWrap: true,
                              textAlign: TextAlign.center,
                              overflow: TextOverflow.visible,
                              style: TextStyle(fontWeight: FontWeight.bold),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Loading overlay
          if (_isLoading || _uploadingMedia)
            Container(
              color: colorScheme.surface.withOpacity(0.7),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: colorScheme.primary),
                    const SizedBox(height: 16),
                    Text(
                      _uploadingMedia
                          ? 'Uploading media...'
                          : 'Creating diary...',
                      style: textTheme.titleMedium
                          ?.copyWith(color: colorScheme.onSurface),
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
