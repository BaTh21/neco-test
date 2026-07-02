import 'package:flutter/material.dart';
import 'package:just_audio/just_audio.dart';

class VoiceMessagePlayer extends StatefulWidget {
  final String url;
  final bool isOwn;

  const VoiceMessagePlayer({
    super.key,
    required this.url,
    this.isOwn = false,
  });

  @override
  State<VoiceMessagePlayer> createState() => _VoiceMessagePlayerState();
}

class _VoiceMessagePlayerState extends State<VoiceMessagePlayer> {
  late final AudioPlayer _player;
  bool _isPlaying = false;
  Duration _duration = Duration.zero;
  Duration _position = Duration.zero;

  @override
  void initState() {
    super.initState();
    _player = AudioPlayer();
    _player.setUrl(widget.url).then((duration) {
      if (duration != null) {
        setState(() => _duration = duration);
      }
    });

    _player.positionStream.listen((pos) {
      setState(() => _position = pos);
    });

    _player.playerStateStream.listen((state) {
      setState(() {
        _isPlaying = state.playing;
        if (state.processingState == ProcessingState.completed) {
          _player.seek(Duration.zero);
          _player.pause();
        }
      });
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  void _togglePlay() {
    if (_isPlaying) {
      _player.pause();
    } else {
      _player.play();
    }
  }

  String _formatTime(Duration d) {
    final minutes = d.inMinutes;
    final seconds = d.inSeconds % 60;
    return "$minutes:${seconds.toString().padLeft(2, '0')}";
  }

  @override
  Widget build(BuildContext context) {
    final iconColor = widget.isOwn ? Colors.white : Colors.grey.shade700;

    return Container(
      width: 200,
      padding: const EdgeInsets.symmetric(horizontal: 0, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: _togglePlay,
            icon: Icon(_isPlaying ? Icons.pause_circle : Icons.play_circle),
            color: iconColor,
            iconSize: 28,
          ),
          Expanded(
            child: GestureDetector(
              onTapDown: (details) {
                final box = context.findRenderObject() as RenderBox;
                final tapPos = details.localPosition.dx;
                final newPos =
                    (tapPos / box.size.width) * _duration.inSeconds;
                _player.seek(Duration(seconds: newPos.toInt()));
              },
              child: Container(
                height: 6,
                decoration: BoxDecoration(
                  color: widget.isOwn
                      ? Colors.white.withOpacity(0.3)
                      : Colors.grey.shade400,
                  borderRadius: BorderRadius.circular(3),
                ),
                child: Stack(
                  children: [
                    FractionallySizedBox(
                      widthFactor: _duration.inSeconds == 0
                          ? 0
                          : _position.inSeconds / _duration.inSeconds,
                      child: Container(
                        decoration: BoxDecoration(
                          color: widget.isOwn ? Colors.white : Colors.blue,
                          borderRadius: BorderRadius.circular(3),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
          Text(
            "${_formatTime(_position)} / ${_formatTime(_duration)}",
            style: TextStyle(fontSize: 11, color: iconColor),
          ),
          const SizedBox(width: 6),
        ],
      ),
    );
  }
}
