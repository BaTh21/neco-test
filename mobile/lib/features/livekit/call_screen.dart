import 'package:flutter/material.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:whisper_space_flutter/features/auth/data/models/participant_model.dart';

int _calculateCrossAxisCount(int count) {
  if (count <= 1) return 1;
  if (count == 2) return 1;
  if (count <= 4) return 2;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

class _CallEventMessage {
  final String text;
  final bool joined;

  _CallEventMessage({
    required this.text,
    required this.joined,
  });
}

class CallScreen extends StatefulWidget {
  final Room room;
  final Future<void> Function() onEndCall;
  final bool isVideoCall;

  const CallScreen(
      {super.key,
      required this.room,
      required this.onEndCall,
      required this.isVideoCall});

  @override
  State<CallScreen> createState() => CallScreenState();
}

class CallScreenState extends State<CallScreen> {
  late final EventsListener<RoomEvent> _listener;
  Offset localPosition = const Offset(20, 100);
  bool isMicEnabled = true;
  bool isCameraEnabled = true;
  bool showStatusOverlay = false;
  IconData? statusIcon;
  String statusText = '';
  List<_CallEventMessage> _messages = [];

  void _showStatus(IconData icon, String text) {
    setState(() {
      statusIcon = icon;
      statusText = text;
      showStatusOverlay = true;
    });

    Future.delayed(const Duration(seconds: 1), () {
      if (mounted) {
        setState(() {
          showStatusOverlay = false;
        });
      }
    });
  }

  void showParticipantMessage(
      {required String username, required bool joined}) {
    final message = _CallEventMessage(
        text: joined ? '$username joined the call' : '$username left the call',
        joined: joined);

    setState(() {
      _messages.add(message);
    });

    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;

      setState(() {
        _messages.remove(message);
      });
    });
  }

  Future<void> _toggleMic() async {
    final localParticipant = widget.room.localParticipant;

    if (isMicEnabled) {
      await localParticipant?.setMicrophoneEnabled(false);

      _showStatus(Icons.mic_off, "Microphone Off");
    } else {
      await localParticipant?.setMicrophoneEnabled(true);

      _showStatus(Icons.mic, "Microphone On");
    }

    setState(() {
      isMicEnabled = !isMicEnabled;
    });
  }

  Future<void> _toggleCamera() async {
    final localParticipant = widget.room.localParticipant;

    if (isCameraEnabled) {
      await localParticipant?.setCameraEnabled(false);

      _showStatus(Icons.videocam_off, "Camera Off");
    } else {
      await localParticipant?.setCameraEnabled(true);

      _showStatus(Icons.videocam, "Camera On");
    }

    setState(() {
      isCameraEnabled = !isCameraEnabled;
    });
  }

  @override
  void initState() {
    super.initState();

    Future.microtask(() async {
      final participant = widget.room.localParticipant;

      Future.microtask(() async {
        final participant = widget.room.localParticipant;

        await participant?.setMicrophoneEnabled(true);

        if (widget.isVideoCall) {
          await participant?.setCameraEnabled(true);
        } else {
          await participant?.setCameraEnabled(false);
        }

        if (mounted) {
          setState(() {
            isCameraEnabled = widget.isVideoCall;
            isMicEnabled = true;
          });
        }
      });
      await participant?.setMicrophoneEnabled(true);

      if (mounted) {
        setState(() {
          isCameraEnabled = true;
          isMicEnabled = true;
        });
      }
    });

    _listener = widget.room.createListener();

    _listener
      ..on<LocalTrackPublishedEvent>((event) {
        setState(() {});
      })
      ..on<LocalTrackUnpublishedEvent>((event) {
        setState(() {});
      })
      ..on<TrackSubscribedEvent>((event) {
        setState(() {});
      })
      ..on<ParticipantConnectedEvent>((event) {
        setState(() {});
      })
      ..on<ParticipantDisconnectedEvent>((event) {
        setState(() {});
      })
      ..on<TrackSubscribedEvent>((event) {
        setState(() {});
      })
      ..on<TrackUnsubscribedEvent>((event) {
        setState(() {});
      })
      ..on<TrackMutedEvent>((event) {
        setState(() {});
      })
      ..on<TrackUnmutedEvent>((event) {
        setState(() {});
      })
      ..on<LocalTrackPublishedEvent>((event) {
        setState(() {});
      })
      ..on<LocalTrackUnpublishedEvent>((event) {
        setState(() {});
      });
  }

  @override
  void dispose() {
    _listener.dispose();
    super.dispose();
  }

  Widget _buildFloatingLocalPreview() {
    final localParticipant = widget.room.localParticipant;
    final localInfo = ParticipantInfo.fromParticipant(
      widget.room.localParticipant!,
    );

    LocalVideoTrack? localTrack;
    bool localCameraMuted = true;

    for (final pub in localParticipant?.videoTrackPublications ?? []) {
      final track = pub.track;

      if (track is LocalVideoTrack) {
        localTrack = track;
        localCameraMuted = pub.muted;
        break;
      }
    }

    return Positioned(
      left: localPosition.dx,
      top: localPosition.dy,
      child: GestureDetector(
        onPanUpdate: (details) {
          final size = MediaQuery.of(context).size;

          setState(() {
            localPosition += details.delta;

            localPosition = Offset(
              localPosition.dx.clamp(0, size.width - 120),
              localPosition.dy.clamp(0, size.height - 180),
            );
          });
        },
        child: Container(
          width: 120,
          height: 180,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: Colors.white,
              width: 2,
            ),
            color: Colors.black,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.4),
                blurRadius: 10,
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Stack(
              fit: StackFit.expand,
              children: [
                // CAMERA ON
                if (localTrack != null && isCameraEnabled)
                  VideoTrackRenderer(
                    localTrack,
                    fit: VideoViewFit.cover,
                    mirrorMode: VideoViewMirrorMode.mirror,
                  )

                // CAMERA OFF
                else
                  Container(
                    color: Colors.grey.shade900,
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          localInfo.avatarUrl.isNotEmpty
                              ? CircleAvatar(
                                  radius: 32,
                                  backgroundImage: NetworkImage(
                                    localInfo.avatarUrl,
                                  ),
                                )
                              : CircleAvatar(
                                  radius: 32,
                                  child: Text(
                                    localInfo.username
                                        .substring(0, 1)
                                        .toUpperCase(),
                                  ),
                                ),
                          const SizedBox(height: 12),
                          Text(
                            localInfo.username,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.black54,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.videocam_off,
                                  color: Colors.white,
                                  size: 16,
                                ),
                                SizedBox(width: 6),
                                Text(
                                  "Camera Off",
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                // Username overlay when camera ON
                if (localTrack != null && isCameraEnabled && !localCameraMuted)
                  Positioned(
                    left: 8,
                    bottom: 8,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        localInfo.username,
                        style: const TextStyle(
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final remoteParticipants = widget.room.remoteParticipants.values.toList();

    final List<Widget> remoteTiles = [];

    for (final participant in remoteParticipants) {
      VideoTrack? remoteTrack;
      bool cameraOff = true;

      for (final pub in participant.videoTrackPublications) {
        final track = pub.track;

        if (track != null && pub.subscribed) {
          remoteTrack = track;
          cameraOff = false;
          break;
        }
      }

      final info = ParticipantInfo.fromParticipant(participant);

      remoteTiles.add(
        _ParticipantTile(
          participant: info,
          track: remoteTrack,
          cameraOff: cameraOff,
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        title: const Text("Live Call"),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_end, color: Colors.red),
            onPressed: () async {
              await widget.onEndCall();

              if (mounted) {
                Navigator.pop(context);
              }
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          // REMOTE GRID
          Positioned.fill(
            child: remoteTiles.isEmpty
                ? const Center(
                    child: Text(
                      "Waiting for participants...",
                      style: TextStyle(color: Colors.white),
                    ),
                  )
                : GridView.builder(
                    padding: const EdgeInsets.all(4),
                    itemCount: remoteTiles.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount:
                          _calculateCrossAxisCount(remoteTiles.length),
                      crossAxisSpacing: 4,
                      mainAxisSpacing: 4,
                      childAspectRatio: 9 / 16,
                    ),
                    itemBuilder: (_, index) {
                      return remoteTiles[index];
                    },
                  ),
          ),

          // STATUS OVERLAY
          if (showStatusOverlay)
            Center(
              child: AnimatedOpacity(
                duration: const Duration(milliseconds: 250),
                opacity: showStatusOverlay ? 1 : 0,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 18,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black87,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        statusIcon,
                        color: Colors.white,
                        size: 40,
                      ),
                      const SizedBox(height: 10),
                      Text(
                        statusText,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // PARTICIPANT EVENTS
          Positioned(
            top: 80,
            left: 20,
            right: 20,
            child: Column(
              children: _messages.map((msg) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 250),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      color: msg.joined
                          ? Colors.green.withOpacity(0.9)
                          : Colors.red.withOpacity(0.9),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          msg.joined ? Icons.login : Icons.logout,
                          color: Colors.white,
                        ),
                        const SizedBox(width: 10),
                        Flexible(
                          child: Text(
                            msg.text,
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
            ),
          ),

          // LOCAL FLOATING PREVIEW
          _buildFloatingLocalPreview(),

          Positioned(
            left: 0,
            right: 0,
            bottom: 30,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // MIC BUTTON
                GestureDetector(
                  onTap: _toggleMic,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isMicEnabled ? Colors.white24 : Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isMicEnabled ? Icons.mic : Icons.mic_off,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),

                const SizedBox(width: 24),

                // CAMERA BUTTON
                GestureDetector(
                  onTap: _toggleCamera,
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: isCameraEnabled ? Colors.white24 : Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      isCameraEnabled ? Icons.videocam : Icons.videocam_off,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),

                const SizedBox(width: 24),

                // END CALL
                GestureDetector(
                  onTap: () async {
                    await widget.onEndCall();

                    if (mounted) {
                      Navigator.pop(context);
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.call_end,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ParticipantTile extends StatelessWidget {
  final ParticipantInfo participant;
  final VideoTrack? track;
  final bool cameraOff;

  const _ParticipantTile({
    required this.participant,
    required this.track,
    required this.cameraOff,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.grey.shade900,
        borderRadius: BorderRadius.circular(12),
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: Stack(
          fit: StackFit.expand,
          children: [
            if (track != null && !cameraOff)
              AspectRatio(
                aspectRatio: 9 / 16,
                child: VideoTrackRenderer(
                  track!,
                  fit: VideoViewFit.cover,
                ),
              )
            else
              Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    participant.avatarUrl.isNotEmpty
                        ? CircleAvatar(
                            radius: 42,
                            backgroundImage: NetworkImage(
                              participant.avatarUrl,
                            ),
                          )
                        : CircleAvatar(
                            radius: 42,
                            child: Text(
                              participant.username
                                  .substring(0, 1)
                                  .toUpperCase(),
                            ),
                          ),
                    const SizedBox(height: 14),
                    Text(
                      participant.username,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.videocam_off,
                            color: Colors.white,
                            size: 16,
                          ),
                          SizedBox(width: 6),
                          Text(
                            "Camera Off",
                            style: TextStyle(
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            Positioned(
              left: 8,
              bottom: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.black54,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (participant.avatarUrl.isNotEmpty)
                      CircleAvatar(
                        radius: 10,
                        backgroundImage: NetworkImage(
                          participant.avatarUrl,
                        ),
                      ),
                    if (participant.avatarUrl.isNotEmpty)
                      const SizedBox(width: 6),
                    Text(
                      participant.username,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
