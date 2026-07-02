import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:whisper_space_flutter/features/chat/model/group_message_model/group_message_model.dart';
import 'package:whisper_space_flutter/features/chat/voice_player.dart';
import 'package:whisper_space_flutter/features/chat/video_player.dart';

class MessageBubble extends StatelessWidget {
  final GroupMessageModel msg;
  final bool isMe;
  final int currentUserId;
  final bool isSeen;
  final Function(String action, dynamic msg)? onAction;
  final ParentMessageModel? repliedMessage;
  final bool isDownloading;
  final double progress;

  const MessageBubble(
      {super.key,
      required this.msg,
      required this.isMe,
      required this.currentUserId,
      required this.isSeen,
      this.onAction,
      this.repliedMessage,
      this.isDownloading = false,
      this.progress = 0.0});

  bool get isUploading => msg.isUploading == true || msg.id == -1;

  void _showBottomMenu(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (_) {
        bool showMore = false;

        return StatefulBuilder(builder: (context, setState) {
          List<Map<String, dynamic>> mainActions = [
            {'icon': Icons.push_pin, 'label': 'Pin', 'value': 'pin'},
            {'icon': Icons.reply, 'label': 'Reply', 'value': 'reply'},
            {'icon': Icons.emoji_emotions, 'label': 'React', 'value': 'react'},
            {'icon': Icons.forward, 'label': 'Forward', 'value': 'forward'},
          ];

          List<Map<String, dynamic>> moreActions = [
            if (msg.type == 'text')
              {'icon': Icons.copy, 'label': 'Copy', 'value': 'copy'},
            if (msg.type != 'text')
              {'icon': Icons.save_alt, 'label': 'Save', 'value': 'save'},
            if (msg.type != 'text' && msg.type != 'voice' && msg.type != 'file')
              {
                'icon': Icons.visibility,
                'label': 'Preview',
                'value': 'preview'
              },
            if (msg.type != 'text' && msg.type != 'voice')
              {'icon': Icons.autorenew, 'label': 'Replace', 'value': 'replace'},
            if (isMe && msg.type == 'text')
              {'icon': Icons.edit, 'label': 'Edit', 'value': 'edit'},
            if (isMe)
              {'icon': Icons.delete, 'label': 'Delete', 'value': 'delete'},
          ];

          final actionsToShow =
              showMore ? [...mainActions, ...moreActions] : mainActions;

          return Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Wrap(
                  spacing: 24,
                  runSpacing: 12,
                  alignment: WrapAlignment.start,
                  children: actionsToShow.map((action) {
                    return GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                        onAction?.call(action['value'].toString(), msg);
                      },
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor: Colors.grey.shade200,
                            child: Icon(
                              action['icon'] as IconData,
                              size: 28,
                              color: Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(action['label'].toString(),
                              style: const TextStyle(fontSize: 12)),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                if (!showMore && moreActions.isNotEmpty)
                  TextButton(
                    onPressed: () => setState(() => showMore = true),
                    child: const Text('More'),
                  ),
              ],
            ),
          );
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final maxWidth = MediaQuery.of(context).size.width * 0.5;

    return GestureDetector(
      onLongPress: () => _showBottomMenu(context),
      child: Align(
        alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
        child: Column(
          crossAxisAlignment:
              isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (msg.forwardedBy != null) _buildForwardLabel(msg),
            ConstrainedBox(
              constraints: BoxConstraints(maxWidth: maxWidth),
              child: Container(
                padding: EdgeInsets.symmetric(
                  horizontal:
                      (msg.type == 'video' && msg.type != 'image') ? 0 : 8,
                  vertical:
                      (msg.type == 'video' && msg.type != 'image') ? 0 : 6,
                ),
                decoration: BoxDecoration(
                  color: (msg.type == 'video' || msg.type == 'image')
                      ? Colors.transparent
                      : isMe
                          ? Theme.of(context).primaryColor
                          : Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment:
                      isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                  children: [
                    if (msg.parentMessage != null)
                      _buildReplyLabel(context, msg, isMe: isMe),
                    if (msg.type == "image" && msg.fileUrl != null)
                      _buildImage(context),
                    if (msg.type == "video" && msg.fileUrl != null)
                      _buildVideo(context),
                    if (msg.type == "file" && msg.fileUrl != null)
                      _buildFile(context),
                    if (msg.type == "voice" && msg.voiceUrl != null)
                      _buildVoice(context),
                    if (msg.type == "text" && msg.content != null)
                      _buildText(context),
                    if (msg.type != 'video' && msg.type != 'image')
                      _buildTime(context),
                  ],
                ),
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildImage(BuildContext context) {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: msg.fileUrl!.startsWith("http")
              ? CachedNetworkImage(
                  imageUrl: msg.fileUrl!,
                  width: 200,
                  height: 200,
                  fit: BoxFit.cover,
                )
              : Image.file(
                  File(msg.fileUrl!),
                  width: 200,
                  height: 200,
                  fit: BoxFit.cover,
                ),
        ),
        if (isDownloading)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black45,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(value: progress),
                  const SizedBox(height: 8),
                  Text(
                    '${(progress * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        if (isUploading) _uploadOverlay(),
        _timeOverlay(context),
      ],
    );
  }

  Widget _buildVideo(BuildContext context) {
    return Stack(
      children: [
        VideoMessagePlayer(
          key: ValueKey(msg.id),
          url: msg.fileUrl!,
          isOwn: isMe,
          width: 250,
          height: 150,
        ),
        if (isDownloading)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black45,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(value: progress),
                  const SizedBox(height: 8),
                  Text(
                    '${(progress * 100).toStringAsFixed(0)}%',
                    style: const TextStyle(color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        if (isUploading) _uploadOverlay(),
        _timeOverlay(context),
      ],
    );
  }

  Widget _buildFile(BuildContext context) {
    final fileName = msg.fileUrl!.split('/').last;

    return Stack(
      children: [
        Container(
          width: 220,
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: isMe ? Theme.of(context).primaryColor : Colors.grey.shade200,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Stack(
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.insert_drive_file, size: 30),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          fileName,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                            color: isMe ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ],
          ),
        ),
        if (isDownloading)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                color: Colors.black38,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(value: progress),
                  const SizedBox(height: 6),
                  Text(
                    '${(progress * 100).toStringAsFixed(0)}%',
                    style: TextStyle(
                      color: isMe ? Colors.white : Colors.black,
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildVoice(BuildContext context) {
    return Column(
      crossAxisAlignment:
          isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        Stack(
          children: [
            VoiceMessagePlayer(
              url: msg.voiceUrl!,
              isOwn: isMe,
            ),
          ],
        ),
        const SizedBox(height: 6),
      ],
    );
  }

  Widget _buildText(BuildContext context) {
    return Text(
      msg.content ?? '',
      style: TextStyle(
        fontSize: 16,
        color: isMe ? Colors.white : Colors.black,
      ),
    );
  }

  Widget _buildTime(BuildContext context) {
    final isEdited = msg.updatedAt != null && msg.updatedAt != msg.createdAt;
    final hasReactions = (msg.reactionSummary?.isNotEmpty ?? false);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (hasReactions) ...[
          const SizedBox(width: 6),
          _buildReactionPreview(),
        ],
        Text(
          _formatTime(msg.createdAt),
          style: TextStyle(
            fontSize: 11,
            color: isMe ? Colors.white : Colors.black,
          ),
        ),
        if (isEdited) ...[
          const SizedBox(width: 4),
          Text(
            'edited',
            style: TextStyle(
              fontSize: 10,
              fontStyle: FontStyle.italic,
              color: isMe ? Colors.white70 : Colors.grey,
            ),
          ),
        ],
        if (isMe) ...[
          const SizedBox(width: 4),
          GestureDetector(
            onTap: () {
              if ((msg.seenBy?.isNotEmpty ?? false)) {
                _showSeenUsers(context, msg.seenBy!);
              }
            },
            child: Icon(
              isSeen ? Icons.done_all : Icons.check,
              size: 14,
              color: Colors.white,
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildReactionPreview() {
    final reactions = msg.reactionSummary ?? {};

    final totalCount = reactions.values.fold<int>(0, (a, b) => a + b);

    final topReaction = reactions.entries.isNotEmpty
        ? reactions.entries.reduce((a, b) => a.value > b.value ? a : b).key
        : null;

    return GestureDetector(
      onTap: () {
        if (msg.myReaction != null && onAction != null) {
          onAction!("react_${msg.myReaction}", msg);
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
        decoration: BoxDecoration(
          color: isMe ? Colors.white24 : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (topReaction != null) Text(_emoji(topReaction)),
            const SizedBox(width: 2),
            if (totalCount > 1)
              Text(
                '$totalCount',
                style: TextStyle(
                  fontSize: 10,
                  color: isMe ? Colors.white : Colors.black,
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _uploadOverlay() {
    return Positioned.fill(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.black45,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
            SizedBox(height: 8),
            Text(
              "Uploading...",
              style: TextStyle(color: Colors.white, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReplyLabel(BuildContext context, GroupMessageModel msg,
      {required bool isMe}) {
    final parent = msg.parentMessage!;
    final username = parent.sender.username;
    final isMedia = (msg.type == 'image' || msg.type == 'video');

    Widget contentWidget;
    switch (parent.type) {
      case 'text':
        contentWidget = Text(
          parent.content ?? '',
          style: const TextStyle(fontSize: 12, color: Colors.grey),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        );
        break;
      case 'file':
        contentWidget = Row(
          children: const [
            Icon(Icons.insert_drive_file, size: 14, color: Colors.grey),
            SizedBox(width: 4),
            Text('File', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        );
        break;
      case 'voice':
        contentWidget = Row(
          children: const [
            Icon(Icons.mic, size: 14, color: Colors.grey),
            SizedBox(width: 4),
            Text('Voice Message',
                style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        );
        break;
      case 'image':
        contentWidget = Row(
          children: const [
            Icon(Icons.image, size: 14, color: Colors.grey),
            SizedBox(width: 4),
            Text('Image', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        );
        break;
      case 'video':
        contentWidget = Row(
          children: const [
            Icon(Icons.videocam, size: 14, color: Colors.grey),
            SizedBox(width: 4),
            Text('Video', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        );
        break;
      default:
        contentWidget = const Text(
          'Attachment',
          style: TextStyle(fontSize: 12, color: Colors.grey),
        );
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: isMe
            ? (isMedia
                ? Theme.of(context).primaryColor
                : Colors.white.withOpacity(0.2))
            : Colors.grey,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(8),
          topRight: Radius.circular(8),
          bottomLeft: isMedia ? Radius.circular(0) : Radius.circular(8),
          bottomRight: isMedia ? Radius.circular(0) : Radius.circular(8),
        ),
      ),
      child: Row(
        children: [
          Icon(Icons.reply,
              size: 16, color: isMe ? Colors.white : Colors.black87),
          const SizedBox(width: 4),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Reply to $username',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isMe ? Colors.white : Colors.black87,
                  ),
                ),
                const SizedBox(height: 2),
                contentWidget,
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildForwardLabel(GroupMessageModel msg) {
    if (msg.forwardedBy == null) return const SizedBox.shrink();

    final isForwardedByMe = msg.forwardedBy!.id == currentUserId;
    final displayName = isForwardedByMe ? 'You' : msg.forwardedBy!.username;
    final avatarUrl = msg.forwardedBy!.avatar;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.forward, size: 14, color: Colors.grey),
        const SizedBox(width: 4),
        Text(
          'Forwarded from ',
          style: TextStyle(
            fontSize: 12,
            fontStyle: FontStyle.italic,
            color: Colors.black87,
          ),
        ),
        if (!isForwardedByMe && avatarUrl != null)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: CircleAvatar(
              radius: 10,
              backgroundImage: NetworkImage(avatarUrl),
            ),
          ),
        Text(
          displayName,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Colors.black87,
          ),
        ),
      ],
    );
  }

  void _showSeenUsers(BuildContext context, List<SeenMessageModel> seenBy) {
    showModalBottomSheet(
      context: context,
      builder: (_) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.all(12),
                child: Text(
                  'Seen by',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ),
              ...seenBy.map((seen) {
                final username = seen.user?.username ?? 'Unknown';
                return ListTile(
                  leading: CircleAvatar(
                    backgroundImage: seen.user?.avatar != null
                        ? NetworkImage(seen.user!.avatar!)
                        : null,
                    child: seen.user?.avatar == null
                        ? const Icon(Icons.person)
                        : null,
                  ),
                  title: Text(username),
                  subtitle: Text(
                    // optional: format seenAt nicely
                    '${seen.seenAt.hour.toString().padLeft(2, '0')}:${seen.seenAt.minute.toString().padLeft(2, '0')}',
                    style: const TextStyle(fontSize: 12),
                  ),
                );
              }).toList(),
            ],
          ),
        );
      },
    );
  }

  Widget _timeOverlay(BuildContext context) {
    return Positioned(
      bottom: 4,
      right: isMe ? 6 : null,
      left: isMe ? null : 6,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: Colors.black.withOpacity(0.5),
          borderRadius: BorderRadius.circular(6),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [_buildTime(context)],
        ),
      ),
    );
  }

  String _formatTime(DateTime date) {
    return "${date.hour}:${date.minute.toString().padLeft(2, '0')}";
  }

  String _emoji(String type) {
    switch (type) {
      case 'like':
        return '👍';
      case 'love':
        return '❤️';
      case 'wow':
        return '😮';
      case 'haha':
        return '😂';
      case 'sad':
        return '😢';
      case 'angry':
        return '😡';
      default:
        return '👍';
    }
  }
}
