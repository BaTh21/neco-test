import 'dart:io';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/core/services/image_upload_service.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/login_screen.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';
import 'package:whisper_space_flutter/features/feed/presentation/providers/feed_provider.dart';
import 'package:whisper_space_flutter/features/home/presentation/widgets/profile_image_picker.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';
import 'package:whisper_space_flutter/features/settings/screens/settings_screen.dart';
import 'package:whisper_space_flutter/core/constants/api_constants.dart';

class ProfileTab extends StatefulWidget {
  final int? userId;
  final VoidCallback? onEditProfile;

  const ProfileTab({super.key, this.userId, this.onEditProfile});

  @override
  State<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends State<ProfileTab> {
  bool _isUploadingImage = false;
  bool _isUpdatingUsername = false;
  late ImageUploadService _imageUploadService;

  @override
  void initState() {
    super.initState();
    _imageUploadService = ImageUploadService(
      baseUrl: '${ApiConstants.baseUrl}/api/v1/avatars',
    );
  }

  Future<void> _handleImageChange(String? imagePath) async {
    if (imagePath == null) {
      await _removeProfileImage();
    } else {
      await _uploadProfileImage(File(imagePath));
    }
  }

  Future<void> _uploadProfileImage(File imageFile) async {
    setState(() => _isUploadingImage = true);
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = await _getToken();
      final avatarUrl = await _imageUploadService.uploadProfileImage(imageFile, token);
      if (avatarUrl != null && mounted) {
        await authProvider.updateProfileImage(avatarUrl);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile picture updated successfully!'), backgroundColor: Colors.green),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to upload image: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isUploadingImage = false);
    }
  }

  Future<String> _getToken() async {
    final storage = context.read<StorageService>();
    return storage.getToken() ?? '';
  }

  Future<void> _removeProfileImage() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;
    if (user?.avatarUrl == null || user!.avatarUrl!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No profile picture to remove'), backgroundColor: Colors.orange),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove Profile Picture'),
        content: const Text('Are you sure you want to remove your profile picture?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Remove', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() => _isUploadingImage = true);
    try {
      final token = await _getToken();
      final success = await _imageUploadService.deleteProfileImage(token);
      if (success) {
        await authProvider.refreshCurrentUser();
        PaintingBinding.instance.imageCache.clear();
        if (mounted) setState(() {});
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile picture removed'), backgroundColor: Colors.green),
        );
      } else {
        throw Exception('Deletion failed');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to remove image: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isUploadingImage = false);
    }
  }

  Future<void> _editUsername() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final currentUsername = authProvider.currentUser?.username ?? '';
    final controller = TextEditingController(text: currentUsername);
    final newUsername = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Username'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(
            labelText: 'Username',
            hintText: 'Enter new username',
            helperText: 'Only letters, numbers, and underscores',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    if (newUsername == null || newUsername.isEmpty || newUsername == currentUsername) return;

    setState(() => _isUpdatingUsername = true);
    try {
      await authProvider.updateUsername(newUsername);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Username updated successfully'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isUpdatingUsername = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        final user = authProvider.currentUser;
        if (user == null) {
          return const Center(child: CircularProgressIndicator());
        }

        return SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            children: [
              Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      ProfileImagePicker(
                        key: ValueKey(user.avatarUrl ?? 'no_avatar'),
                        currentImageUrl: user.avatarUrl,
                        username: user.username,
                        onImageChanged: _handleImageChange,
                        isUploading: _isUploadingImage,
                      ),
                      const SizedBox(height: 16),
                      GestureDetector(
                        onTap: _isUpdatingUsername ? null : _editUsername,
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              user.username,
                              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 8),
                            if (_isUpdatingUsername)
                              const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                            else
                              const Icon(Icons.edit, size: 18, color: Colors.grey),
                          ],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(user.email, style: const TextStyle(fontSize: 16, color: Colors.grey)),
                      if (user.bio != null && user.bio!.isNotEmpty) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            user.bio!,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 14, color: Colors.black87, fontStyle: FontStyle.italic),
                          ),
                        ),
                      ],
                      if (user.avatarUrl != null && user.avatarUrl!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: TextButton.icon(
                            onPressed: _isUploadingImage ? null : _removeProfileImage,
                            icon: const Icon(Icons.delete_outline, size: 18, color: Colors.red),
                            label: const Text('Remove Photo', style: TextStyle(color: Colors.red)),
                            style: TextButton.styleFrom(
                              minimumSize: Size.zero,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),
              // Stats section with live data
              Consumer2<FeedProvider, NotesProvider>(
                builder: (context, feedProvider, notesProvider, child) {
                  final userPosts = feedProvider.diaries.where((d) => d.author.id == user.id).length;
                  final userNotes = notesProvider.notes.length;
                  int totalLikes = 0;
                  for (var diary in feedProvider.diaries.where((d) => d.author.id == user.id)) {
                    totalLikes += diary.likes.length;
                  }
                  return Card(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          _StatItem(value: userPosts.toString(), label: 'Posts'),
                          _StatItem(value: '0', label: 'Friends'), // Replace with actual data if available
                          _StatItem(value: userNotes.toString(), label: 'Notes'),
                          _StatItem(value: totalLikes.toString(), label: 'Likes'),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 20),
              Card(
                child: ListTile(
                  leading: const Icon(Icons.settings, color: Color(0xFF6C63FF)),
                  title: const Text('Settings'),
                  trailing: const Icon(Icons.chevron_right, color: Colors.grey),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const SettingsScreen()),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () async {
                    await authProvider.logout();
                    if (mounted) {
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(builder: (context) => const LoginScreen()),
                      );
                    }
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('Logout'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFFFEBEE),
                    foregroundColor: Colors.red,
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _StatItem extends StatelessWidget {
  final String value;
  final String label;
  const _StatItem({required this.value, required this.label});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF6C63FF)),
        ),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
      ],
    );
  }
}