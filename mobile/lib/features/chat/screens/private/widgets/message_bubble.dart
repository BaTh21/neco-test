import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../../model/private_message_model/private_message_model.dart';
import 'image_viewer.dart';
import 'package:whisper_space_flutter/features/chat/video_player.dart';
import 'package:whisper_space_flutter/features/chat/voice_player.dart';
import 'package:dio/dio.dart';
import 'dart:io';

class MessageBubble extends StatefulWidget {
  final PrivateMessageModel message;
  final bool isMe;
  final int? currentUserId;
  final VoidCallback? onPlayAudio;
  final bool isPlaying;
  final double? playingProgress;
  final VoidCallback? onRetry;
  final bool showStatus;
  final void Function(String, PrivateMessageModel message)? onAction;

  const MessageBubble(
      {super.key,
      required this.message,
      required this.isMe,
      this.currentUserId,
      this.onPlayAudio,
      this.isPlaying = false,
      this.playingProgress,
      this.onRetry,
      this.showStatus = true,
      this.onAction});

  @override
  State<MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<MessageBubble> {
  VideoPlayerController? _videoController;
  bool _isDownloading = false;
  double _progress = 0.0;

  @override
  void initState() {
    super.initState();
    if (widget.message.isVideo && widget.message.content != null) {
      _initializeVideo();
    }
  }

  Future<void> _initializeVideo() async {
    _videoController = VideoPlayerController.networkUrl(
      Uri.parse(widget.message.content!),
    );
    try {
      await _videoController!.initialize();
    } catch (e) {
      debugPrint('Video init failed: $e');
    }
  }

  @override
  void dispose() {
    _videoController?.dispose();
    super.dispose();
  }

  void _handleAction(String action) {
    switch (action) {
      case 'pin':
        _pinMessage();
        break;
      case 'react':
        _showReactions();
        break;
      case 'forward':
        _forwardMessage();
        break;
      case 'reply':
        _replyMessage();
        break;
      case 'save':
        _saveMessage();
        break;
      case 'preview':
        _previewMessage();
        break;
      case 'replace':
        _replaceMessage();
      case 'edit':
        _editMessage();
        break;
      case 'delete':
        _deleteMessage();
        break;
    }
  }

  void _pinMessage() {
    if (widget.onAction != null) {
      widget.onAction!("pin", widget.message);
    }
  }

  void _showReactions() {
    if (widget.onAction != null) {
      widget.onAction!("react", widget.message);
    }
  }

  void _forwardMessage() {
    if (widget.onAction != null) {
      widget.onAction!("forward", widget.message);
    }
  }

  void _replyMessage() {
    if (widget.onAction != null) {
      widget.onAction!("reply", widget.message);
    }
  }

  Future<void> _saveMessage() async {
    try {
      final url = widget.message.content;
      if (url == null) return;

      final fileName = url.split('/').last;

      final dir = Directory('/storage/emulated/0/Download');
      final filePath = '${dir.path}/$fileName';

      setState(() {
        _isDownloading = true;
        _progress = 0;
      });

      await Dio().download(
        url,
        filePath,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            setState(() {
              _progress = received / total;
            });
          }
        },
      );

      setState(() {
        _isDownloading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Saved to Downloads')),
      );
    } catch (e, stack) {
      print("❌ ERROR: $e");
      print("STACK: $stack");

      setState(() {
        _isDownloading = false;
      });

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed: $e')),
      );
    }
  }

  void _previewMessage() {
    if (widget.message.isImage && widget.message.content != null) {
      Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => ImageViewer(imageUrl: widget.message.content!)));
    } else if (widget.message.isVideo && widget.message.content != null) {
      Navigator.push(
          context,
          MaterialPageRoute(
              builder: (_) => VideoMessagePlayer(
                  url: widget.message.content!, isOwn: widget.isMe)));
    }
  }

  void _editMessage() {
    if (widget.onAction != null) {
      widget.onAction!("edit", widget.message);
    }
  }

  void _deleteMessage() {
    if (widget.onAction != null) {
      widget.onAction!("delete", widget.message);
    }
  }

  void _replaceMessage() {
    if (widget.onAction != null) {
      widget.onAction!("replace", widget.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    final alignment =
        widget.isMe ? Alignment.centerRight : Alignment.centerLeft;
    final color = widget.isMe
        ? Theme.of(context).primaryColor
        : Theme.of(context).brightness == Brightness.dark
            ? Colors.grey[800]
            : Colors.grey[200];
    final isMedia = widget.message.hasFile &&
        (widget.message.isImage || widget.message.isVideo);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
      child: Align(
        alignment: alignment,
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: MediaQuery.of(context).size.width * 0.75,
          ),
          child: Column(
            crossAxisAlignment:
                widget.isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
            children: [
              if (widget.message.isForwarded &&
                  widget.message.originalSender != null)
                ConstrainedBox(
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.5,
                  ),
                  child: _buildForwardLabel(widget.message, isMe: widget.isMe),
                ),
              if (isMedia)
                GestureDetector(
                  onLongPress: _showMessageOptions,
                  child: Column(
                    crossAxisAlignment: widget.isMe
                        ? CrossAxisAlignment.end
                        : CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (widget.message.replyTo != null)
                        ConstrainedBox(
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.of(context).size.width * 0.5,
                          ),
                          child: _buildReplyLabel(
                            widget.message,
                            isMe: widget.isMe,
                          ),
                        ),
                      const SizedBox(height: 4),
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          _buildContent(),
                          Positioned(
                            bottom: 6,
                            right: 6,
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.black54,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (widget.message.hasReactions) _buildReactions(),
                                  Text(
                                    widget.message.isEdited
                                        ? "${_formatTime(widget.message.createdAt)} (edited)"
                                        : _formatTime(widget.message.createdAt),
                                    style: const TextStyle(
                                      fontSize: 10,
                                      color: Colors.white,
                                    ),
                                  ),
                                  if (widget.isMe && widget.showStatus) ...[
                                    const SizedBox(width: 4),
                                    _buildStatusIconInline(),
                                  ],
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                )
              else
                GestureDetector(
                  onLongPress: _showMessageOptions,
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    constraints: const BoxConstraints(minHeight: 40),
                    child: Column(
                      crossAxisAlignment: widget.isMe
                          ? CrossAxisAlignment.end
                          : CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (widget.message.replyTo != null)
                          ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: MediaQuery.of(context).size.width * 0.5,
                            ),
                            child: _buildReplyLabel(widget.message,
                                isMe: widget.isMe),
                          ),
                        _buildContent(),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            if (widget.message.hasReactions) _buildReactions(),
                            Text(
                              widget.message.isEdited
                                  ? "${_formatTime(widget.message.createdAt)} (edited)"
                                  : _formatTime(widget.message.createdAt),
                              style: TextStyle(
                                fontSize: 10,
                                color:
                                    widget.isMe ? Colors.white : Colors.black54,
                              ),
                            ),
                            if (widget.isMe && widget.showStatus) ...[
                              const SizedBox(width: 4),
                              _buildStatusIconInline(),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildContent() {
    Widget content;

    if (widget.message.status == MessageStatus.failed &&
        widget.message.content?.isNotEmpty == true) {
      content = Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(
            child: Text(
              widget.message.content!,
              style: TextStyle(color: widget.isMe ? Colors.white : null),
            ),
          ),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: widget.onRetry,
            child: const Icon(Icons.refresh, size: 16),
          ),
        ],
      );
    } else if (widget.message.isAudio) {
      if (widget.message.status == MessageStatus.sending) {
        content = _buildSendingVoice();
      } else if (widget.message.status == MessageStatus.failed) {
        content = _buildFailedVoice();
      } else {
        content = VoiceMessagePlayer(
          url: widget.message.content!,
          isOwn: widget.isMe,
        );
      }
    } else if (widget.message.hasFile) {
      if (widget.message.isImage) {
        content = _buildImageContent();
      } else if (widget.message.isVideo && widget.message.content != null) {
        content = VideoMessagePlayer(
            url: widget.message.content!, isOwn: widget.isMe);
      } else if (widget.message.isAudio && widget.message.content != null) {
        content = VoiceMessagePlayer(
            url: widget.message.content!, isOwn: widget.isMe);
      } else {
        content = _buildFile();
      }
    } else {
      content = Text(
        widget.message.content ?? '',
        style: TextStyle(color: widget.isMe ? Colors.white : null),
      );
    }

    return GestureDetector(
      onLongPress: _showMessageOptions,
      child: _buildDownloadingOverlay(content),
    );
  }

  void _showMessageOptions() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).brightness == Brightness.dark
          ? Colors.grey[900]
          : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
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
            if (!widget.message.hasFile)
              {'icon': Icons.copy, 'label': 'Copy', 'value': 'copy'},
            if (widget.message.hasFile)
              {'icon': Icons.autorenew, 'label': 'Replace', 'value': 'replace'},
            if (widget.message.hasFile &&
                widget.message.messageType != 'file' &&
                widget.message.messageType != 'voice')
              {
                'icon': Icons.visibility,
                'label': 'Preview',
                'value': 'preview'
              },
            if (widget.message.hasFile)
              {'icon': Icons.save_alt, 'label': 'Save', 'value': 'save'},
            if (widget.isMe && !widget.message.hasFile)
              {'icon': Icons.edit, 'label': 'Edit', 'value': 'edit'},
            if (widget.isMe)
              {'icon': Icons.delete, 'label': 'Delete', 'value': 'delete'},
          ];

          final actionsToShow =
              showMore ? [...mainActions, ...moreActions] : mainActions;

          return Container(
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
                        _handleAction(action['value'].toString());
                      },
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircleAvatar(
                            radius: 28,
                            backgroundColor:
                                Theme.of(context).brightness == Brightness.dark
                                    ? Colors.grey[800]
                                    : Colors.grey.shade200,
                            child: Icon(
                              action['icon'] as IconData,
                              size: 28,
                              color: Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? Colors.white
                                  : Colors.black87,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            action['label'].toString(),
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context).brightness ==
                                      Brightness.dark
                                  ? Colors.white
                                  : Colors.black87,
                            ),
                          ),
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

  Widget _buildImageContent() {
    if (widget.message.status == MessageStatus.sending) {
      return Container(
        width: 200,
        height: 200,
        color: Colors.grey[300],
        child: const Center(child: CircularProgressIndicator()),
      );
    }
    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => ImageViewer(imageUrl: widget.message.content!),
        ),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: widget.message.content!,
          placeholder: (_, __) => Container(
            width: 200,
            height: 200,
            color: Colors.grey[300],
            child: const Center(child: CircularProgressIndicator()),
          ),
          errorWidget: (_, __, ___) => Container(
            width: 200,
            height: 200,
            color: Colors.grey[300],
            child: const Icon(Icons.error),
          ),
          width: 200,
          height: 200,
          fit: BoxFit.cover,
        ),
      ),
    );
  }

  Widget _buildFile() {
    final fileName = widget.message.content?.split('/').last ?? 'File';

    return Container(
      width: 220,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color:
            widget.isMe ? Theme.of(context).primaryColor : Colors.grey.shade200,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          const Icon(Icons.insert_drive_file, size: 30),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              fileName,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                color: widget.isMe ? Colors.white : Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusIconInline() {
    switch (widget.message.status) {
      case MessageStatus.sending:
        return const SizedBox(
          width: 10,
          height: 10,
          child: CircularProgressIndicator(strokeWidth: 1.5),
        );

      case MessageStatus.failed:
        return GestureDetector(
          onTap: widget.onRetry,
          child: const Icon(Icons.error, size: 12, color: Colors.red),
        );

      case MessageStatus.sent:
        return Icon(
          Icons.done,
          size: 12,
          color: widget.isMe ? Colors.white70 : Colors.grey,
        );

      case MessageStatus.delivered:
        return Icon(
          Icons.done_all,
          size: 12,
          color: widget.isMe ? Colors.white70 : Colors.grey,
        );

      case MessageStatus.read:
        return const Icon(
          Icons.done_all,
          size: 12,
          color: Colors.blue,
        );
    }
  }

  Widget _buildSendingVoice() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color:
            widget.isMe ? Theme.of(context).primaryColor : Colors.grey.shade300,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          ),
          const SizedBox(width: 8),
          Text(
            "Sending voice...",
            style: TextStyle(
              color: widget.isMe ? Colors.white : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFailedVoice() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.red.shade100,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.error, size: 16, color: Colors.red),
          const SizedBox(width: 6),
          const Text("Failed"),
          const SizedBox(width: 8),
          GestureDetector(
            onTap: widget.onRetry,
            child: const Icon(Icons.refresh, size: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildReplyLabel(PrivateMessageModel msg, {required bool isMe}) {
    final isMedia =
        msg.hasFile && (widget.message.isImage || widget.message.isVideo);
    final parent = msg.replyTo!;
    final username = parent.senderUsername;

    Widget contentWidget;
    switch (parent.messageType) {
      case 'text':
        contentWidget = Text(
          parent.content,
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

  Widget _buildForwardLabel(
    PrivateMessageModel message, {
    required bool isMe,
  }) {
    final isForwardedByMe = message.forwardedFromId == widget.currentUserId;

    final displayName =
        isForwardedByMe ? 'You' : (message.originalSender ?? 'Unknown');

    final avatarUrl = message.originalSenderAvatar;

    final textColor = isMe ? Colors.black87 : Colors.black87;

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.forward, size: 14, color: textColor),
          const SizedBox(width: 4),
          Flexible(
            child: Wrap(
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: 4,
              children: [
                Text(
                  'Forwarded from',
                  style: TextStyle(
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                    color: textColor,
                  ),
                ),
                if (!isForwardedByMe &&
                    avatarUrl != null &&
                    avatarUrl.isNotEmpty)
                  CircleAvatar(
                    radius: 8,
                    backgroundImage: NetworkImage(avatarUrl),
                  ),
                Text(
                  displayName,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: textColor,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildReactions() {
    final reactions = widget.message.reactions;

    if (reactions.isEmpty) return const SizedBox();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 3, vertical: 1),
      margin: const EdgeInsets.only(right: 2),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 3,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: reactions.map((r) {
          return Padding(
            padding: const EdgeInsets.symmetric(horizontal: 2),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(r.emoji, style: const TextStyle(fontSize: 12)),
                if (r.count > 1) ...[
                  const SizedBox(width: 2),
                  Text(
                    '${r.count}',
                    style: const TextStyle(fontSize: 10),
                  ),
                ]
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildDownloadingOverlay(Widget child) {
    if (!_isDownloading) return child;

    return Stack(
      alignment: Alignment.center,
      children: [
        child,
        Container(
          color: Colors.black.withOpacity(0.4),
        ),
        Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(value: _progress),
            const SizedBox(height: 8),
            Text(
              "${(_progress * 100).toStringAsFixed(0)}%",
              style: const TextStyle(color: Colors.white),
            ),
          ],
        ),
      ],
    );
  }

  String _formatTime(DateTime dateTime) {
    final diff = DateTime.now().difference(dateTime);
    if (diff.inDays > 0) return '${diff.inDays}d ago';
    if (diff.inHours > 0) return '${diff.inHours}h ago';
    if (diff.inMinutes > 0) return '${diff.inMinutes}m ago';
    return 'Just now';
  }
}
