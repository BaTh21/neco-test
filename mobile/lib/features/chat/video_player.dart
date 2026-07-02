import 'dart:io';
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';

class VideoMessagePlayer extends StatefulWidget {
  final String url;
  final bool isOwn;
  final double width; // custom width for chat bubble
  final double height; // custom height for chat bubble

  const VideoMessagePlayer({
    super.key,
    required this.url,
    this.isOwn = false,
    this.width = 200,
    this.height = 120, // smaller height for partial preview
  });

  @override
  State<VideoMessagePlayer> createState() => _VideoMessagePlayerState();
}

class _VideoMessagePlayerState extends State<VideoMessagePlayer> {
  late VideoPlayerController _controller;
  bool _isPlaying = false;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _controller = widget.url.startsWith('http')
        ? VideoPlayerController.network(widget.url)
        : VideoPlayerController.file(File(widget.url));

    _controller.initialize().then((_) {
      setState(() => _initialized = true);
    });

    _controller.addListener(() {
      setState(() {
        _isPlaying = _controller.value.isPlaying;
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _togglePlay() {
    if (!_initialized) return;
    _isPlaying ? _controller.pause() : _controller.play();
  }

  @override
  Widget build(BuildContext context) {
    return _initialized
        ? GestureDetector(
      onTap: _togglePlay,
      child: Stack(
        alignment: Alignment.center,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: SizedBox(
              width: widget.width,
              height: widget.height,
              child: FittedBox(
                fit: BoxFit.cover,
                clipBehavior: Clip.hardEdge,
                child: SizedBox(
                  width: _controller.value.size.width,
                  height: _controller.value.size.height,
                  child: VideoPlayer(_controller),
                ),
              ),
            ),
          ),
          if (!_isPlaying)
            const Icon(
              Icons.play_circle_fill,
              color: Colors.white,
              size: 40,
            ),
        ],
      ),
    )
        : Container(
      width: widget.width,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Center(
        child: CircularProgressIndicator(color: Colors.white),
      ),
    );
  }
}