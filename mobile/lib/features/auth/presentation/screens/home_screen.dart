import 'dart:async';

import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:whisper_space_flutter/core/providers/theme_provider.dart';
import 'package:whisper_space_flutter/core/services/storage_service.dart';
import 'package:whisper_space_flutter/features/auth/data/models/diary_model.dart';
import 'package:whisper_space_flutter/features/auth/presentation/screens/providers/auth_provider.dart';
import 'package:whisper_space_flutter/features/chat/chat_api_service.dart';
import 'package:whisper_space_flutter/features/chat/chat_screen.dart';
import 'package:whisper_space_flutter/features/feed/data/datasources/feed_api_service.dart';
import 'package:whisper_space_flutter/features/feed/presentation/providers/feed_provider.dart';
import 'package:whisper_space_flutter/features/feed/presentation/screens/create_diary_screen.dart';
import 'package:whisper_space_flutter/features/home/presentation/tabs/feed_tab.dart';
import 'package:whisper_space_flutter/features/home/presentation/tabs/friends_tab.dart';
import 'package:whisper_space_flutter/features/home/presentation/tabs/messages_tab.dart';
import 'package:whisper_space_flutter/features/home/presentation/tabs/profile_tab.dart';
import 'package:whisper_space_flutter/features/home/presentation/widgets/right_slide_page_route.dart';
import 'package:whisper_space_flutter/features/inbox/inbox_api_service.dart';
import 'package:whisper_space_flutter/features/inbox/inbox_screen.dart';
import 'package:whisper_space_flutter/features/livekit/call_screen.dart';
import 'package:whisper_space_flutter/features/notes/presentation/providers/notes_provider.dart';
import 'package:whisper_space_flutter/features/notes/presentation/screens/notes_tab.dart';
import 'package:whisper_space_flutter/features/websocket/global_websocket.dart';
import 'package:livekit_client/livekit_client.dart';
import 'package:whisper_space_flutter/core/constants/api_constants.dart';

enum CallStatus {
  idle,
  incoming,
  calling,
  ringing,
  busy,
  offline,
  connecting,
  active,
  reconnecting,
  ended,
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  int _selectedIndex = 0;
  int? _currentUserId;
  late final InboxAPISource inboxApi;
  bool isLoading = true;
  String? error;
  int _unreadCount = 0;
  List<Widget> _screens = [];
  final List<String> _appBarTitles = [
    'Feed',
    'Messages',
    'Friends',
    'Notes',
    'Profile',
  ];

  GlobalWebsocket? _ws;
  late StorageService storageService;
  bool _manuallyDisconnected = false;
  Room? _room;
  late ChatAPISource chatApi;
  StreamSubscription? _wsSubscription;
  bool _wsConnected = false;
  LocalParticipant? participant;
  bool _alreadyJoinedCall = false;
  bool _callScreenOpen = false;
  bool _connectingDialogShown = false;

  bool _callingDialogOpen = false;
  CallStatus _callStatus = CallStatus.idle;
  String? _callingName;
  String? _callingAvatar;
  bool _callingVideo = false;
  final GlobalKey<CallScreenState> callScreenKey = GlobalKey<CallScreenState>();
  String _currentCallType = "voice";

  void setCallRequestState(
    CallStatus state, {
    String? userName,
    String? avatar,
    bool isVideo = false,
  }) {
    if (!mounted) return;

    setState(() {
      _callStatus = state;
      _callingName = userName;
      _callingAvatar = avatar;
      _callingVideo = isVideo;
    });
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initApp();
  }

  Future<void> _initApp() async {
    await _loadCurrentUser();
    await _initServicesAndLoad();

    if (!mounted) return;
    _initializeScreens();

    setState(() {});
  }

  void _initializeScreens() {
    if (_ws == null || _currentUserId == null) return;

    _screens = [
      const FeedTab(),
      MessagesTab(ws: _ws!, onCallStateChanged: setCallRequestState),
      FriendsTab(ws: _ws!, onCallStateChanged: setCallRequestState),
      const NotesTab(),
      ProfileTab(userId: _currentUserId),
    ];
  }

  Future<void> _loadCurrentUser() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;

    if (user != null) {
      _currentUserId = user.id;

      final feedProvider = Provider.of<FeedProvider>(context, listen: false);
      feedProvider.setCurrentUserId(user.id);
    }
  }

  Future<void> _initServicesAndLoad() async {
    storageService = StorageService();
    await storageService.init();

    final token = storageService.getToken();
    if (token == null) {
      print(" No token → skip WS connection");
      return;
    }

    inboxApi = InboxAPISource(storageService: storageService);
    chatApi = ChatAPISource(storageService: storageService);

    _ws = GlobalWebsocket(storageService: storageService);

    await connectWebsocket();

    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final count = await inboxApi.getUnreadActivityCount();
      if (mounted) {
        setState(() {
          _unreadCount = count;
          isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          isLoading = false;
          error = e.toString();
        });
      }
    }
  }

  Future<void> _refreshNotes() async {
    final provider = Provider.of<NotesProvider>(context, listen: false);
    await provider.loadNotes();
    await provider.loadSharedNotes();
  }

  Future<void> connectWebsocket() async {
    if (_ws == null) return;

    if (_wsConnected) {
      print("WS already connected");
      return;
    }

    try {
      await _ws!.connect();
      _ws!.startHeartbeat();
      _wsConnected = true;

      _wsSubscription?.cancel();
      _wsSubscription = _ws!.stream.listen(
        (event) async {
          final type = event["type"];

          switch (type) {
            case "incoming_call":
            case "group_call_started":
              _currentCallType = event["call_type"];
              _showIncomingCall(event);
              break;

            case "call_created":
              final roomName = event["room"];

              _currentCallType = event["call_type"];

              _showCallingDialog(
                name: _callingName ?? "Unknown",
                avatar: _callingAvatar,
                isVideo: _callingVideo,
                roomName: roomName,
              );
              break;
            case "ringing":
              setCallRequestState(
                CallStatus.ringing,
              );
              break;
            case "already_in_call":
            case "call_busy":
              setCallRequestState(
                CallStatus.busy,
              );
              break;
            case "user_offline":
              setCallRequestState(
                CallStatus.offline,
              );
              break;
            case "call_accepted":
              final roomName = event["room"];

              if (!_alreadyJoinedCall && !_callScreenOpen) {
                await _joinLivekit(roomName, callType: _currentCallType);
              }
              break;
            case "participant_joined":
              if (event["participant"]["user_id"] == _currentUserId) {
                break;
              }
              final username = event["participant"]["username"];

              callScreenKey.currentState?.showParticipantMessage(
                username: username,
                joined: true,
              );
              break;
            case "participant_left":
              if (event["participant"]["user_id"] == _currentUserId) {
                break;
              }
              final username = event["username"];

              callScreenKey.currentState?.showParticipantMessage(
                username: username,
                joined: false,
              );
              break;
            case "call_rejected":
            case "call_timeout":
            case "call_cancelled":
            case "call_ended":
              _hideCallingDialog();
              _hideConnectingDialog();
              _leaveLivekit();
              break;
            case "disconnected":
              _leaveLivekit();
              break;
            case "error":
              break;
          }
        },
        onDone: () async {
          print("WS disconnected");
          await reconnectWebSocket();
        },
        onError: (e) async {
          print("WS error: $e");
          await reconnectWebSocket();
        },
      );
    } catch (e) {
      _wsConnected = false;
      print("WS Connection error: $e");
    }
  }

  Future<void> _joinLivekit(String roomName, {required String callType}) async {
    if (_callScreenOpen) return;

    CancelListenFunc? roomListenerCancel;

    try {
      _callStatus = CallStatus.connecting;

      _hideCallingDialog();
      _showConnectingDialog();

      PermissionStatus micPermission = await Permission.microphone.request();

      PermissionStatus cameraPermission = PermissionStatus.granted;

      if (callType == "video") {
        cameraPermission = await Permission.camera.request();
      }

      if (!micPermission.isGranted || !cameraPermission.isGranted) {
        throw Exception("Permissions denied");
      }

      final token = await chatApi.getLiveKitToken(roomName);

      _room = Room();                     // ✅ now initialised

      await _room!.connect(
        ApiConstants.livekitUrl,
        token,
      );

      await _enableMedia(callType);

      _alreadyJoinedCall = true;

      // WAIT FOR REMOTE PARTICIPANT
      Completer<void> remoteJoined = Completer();

      roomListenerCancel = _room!.events.listen((event) {
        if (event is ParticipantConnectedEvent) {
          if (!remoteJoined.isCompleted) {
            remoteJoined.complete();
          }
        }

        if (event is ParticipantDisconnectedEvent) {
          _leaveLivekit();
        }

        if (event is RoomDisconnectedEvent) {
          _leaveLivekit();
        }
      });

      await Future.any([
        remoteJoined.future,
        Future.delayed(const Duration(seconds: 10)),
      ]);

      _hideConnectingDialog();

      _callScreenOpen = true;

      _callStatus = CallStatus.active;

      if (!mounted) return;

      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => CallScreen(
            key: callScreenKey,
            room: _room!,
            isVideoCall: callType == 'video',
            onEndCall: () async {
              _ws!.send({
                "type": "call_end",
                "scope": "private",
                "room": roomName,
              });

              await _leaveLivekit();
            },
          ),
        ),
      );

      WidgetsBinding.instance.addPostFrameCallback((_) {
        _hideConnectingDialog();
      });
    } catch (e) {
      print("LiveKit join failed: $e");

      _hideCallingDialog();
      _hideConnectingDialog();

      setCallRequestState(CallStatus.ended);

      await _leaveLivekit();

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              e.toString().contains("Permissions")
                  ? "Camera/Microphone permission denied"
                  : "Failed to connect call",
            ),
          ),
        );
      }
    } finally {
      await roomListenerCancel?.call();

      _alreadyJoinedCall = false;
      _callScreenOpen = false;
    }
  }

  Future<void> _enableMedia(String callType) async {
    final p = _room!.localParticipant;
    if (p == null) return;

    await p.setMicrophoneEnabled(true);

    if (callType == "video") {
      await p.setCameraEnabled(true);
    } else {
      await p.setCameraEnabled(false);
    }
  }

  Future<void> _leaveLivekit() async {
    if (_room == null) return;

    await _room!.disconnect();
    _room = null;

    _alreadyJoinedCall = false;
  }

  Future<void> reconnectWebSocket() async {
    if (_manuallyDisconnected) return;

    _wsConnected = false;

    await Future.delayed(const Duration(seconds: 3));

    print("Attempting WS reconnect...");

    await connectWebsocket();
  }

  Future<void> disconnectWebsocket() async {
    _manuallyDisconnected = true;
    _wsConnected = false;

    _wsSubscription?.cancel();
    _wsSubscription = null;

    _ws!.stopHeartbeat();
    _ws!.disconnect();
  }

  void _hideCallingDialog() {
    if (_callingDialogOpen && mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      _callingDialogOpen = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      print("App paused");
      ();
    }

    if (state == AppLifecycleState.resumed) {
      print("📱 App resumed → WS reconnect");
      connectWebsocket();
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);

    _wsSubscription?.cancel();
    disconnectWebsocket();

    _room?.disconnect().catchError((_) {});

    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_ws == null || _screens.isEmpty) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(_appBarTitles[_selectedIndex]),
        centerTitle: true,
        elevation: 0,
        actions: [
          IconButton(
            tooltip: 'Inbox',
            onPressed: () async {
              await showInboxDialog(context);
              _loadData();
            },
            icon: Badge(
              isLabelVisible: _unreadCount > 0,
              label: Text(_unreadCount > 99 ? '99+' : '$_unreadCount'),
              child: const Icon(Icons.mail_outline),
            ),
          ),
          if (_selectedIndex == 3)
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed: _refreshNotes,
              tooltip: 'Refresh',
            ),
        ],
      ),
      body: _buildScreen(),
      bottomNavigationBar: _buildBottomNavBar(),
      floatingActionButton:
          _selectedIndex == 0 ? _buildFloatingActionButton(context) : null,
    );
  }

  Widget _buildScreen() {
    if (_ws == null) return const SizedBox();

    return IndexedStack(
      index: _selectedIndex,
      children: [
        const FeedTab(),
        MessagesTab(ws: _ws!, onCallStateChanged: setCallRequestState),
        FriendsTab(ws: _ws!, onCallStateChanged: setCallRequestState),
        const NotesTab(),
        ProfileTab(userId: _currentUserId),
      ],
    );
  }

  void _showConnectingDialog() {
    if (_connectingDialogShown || !mounted) return;

    _connectingDialogShown = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) {
        return const AlertDialog(
          content: Row(
            children: [
              CircularProgressIndicator(),
              SizedBox(width: 16),
              Expanded(
                child: Text("Connecting call..."),
              ),
            ],
          ),
        );
      },
    );
  }

  void _hideConnectingDialog() {
    if (!_connectingDialogShown || !mounted) return;

    Navigator.of(context, rootNavigator: true).pop();

    _connectingDialogShown = false;
  }

  void _showCallingDialog(
      {required String name,
      String? avatar,
      bool isVideo = false,
      required String roomName}) {
    if (_callingDialogOpen) return;

    _callingDialogOpen = true;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 28,
              vertical: 32,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFF1E1E2C),
                  Color(0xFF2A2A40),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(32),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.35),
                  blurRadius: 25,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Avatar
                Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: Colors.greenAccent.withOpacity(0.7),
                      width: 3,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.greenAccent.withOpacity(0.35),
                        blurRadius: 20,
                        spreadRadius: 2,
                      ),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 48,
                    backgroundImage:
                        avatar != null ? NetworkImage(avatar) : null,
                    backgroundColor: const Color(0xFF3A3A55),
                    child: avatar == null
                        ? Text(
                            name[0].toUpperCase(),
                            style: const TextStyle(
                              fontSize: 32,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          )
                        : null,
                  ),
                ),

                const SizedBox(height: 26),

                // Name
                Text(
                  name,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.3,
                  ),
                ),

                const SizedBox(height: 12),

                // Status
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 8,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        _callStatus == CallStatus.ringing
                            ? Icons.notifications_active_rounded
                            : isVideo
                                ? Icons.videocam_rounded
                                : Icons.call_rounded,
                        color: Colors.greenAccent,
                        size: 18,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _callStatus == CallStatus.ringing
                            ? "Ringing..."
                            : isVideo
                                ? "Starting video call..."
                                : "Calling...",
                        style: TextStyle(
                          color: Colors.grey.shade200,
                          fontSize: 15,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),

                // const SizedBox(height: 36),

                // // Loader
                // SizedBox(
                //   width: 34,
                //   height: 34,
                //   child: CircularProgressIndicator(
                //     strokeWidth: 3,
                //     valueColor: AlwaysStoppedAnimation<Color>(
                //       Colors.greenAccent.shade400,
                //     ),
                //   ),
                // ),

                const SizedBox(height: 40),

                // End Call Button
                GestureDetector(
                  onTap: () {
                    Navigator.pop(context);

                    _callingDialogOpen = false;

                    _ws!.send({
                      "type": "call_cancel",
                      "scope": "private",
                      "room": roomName
                    });
                  },
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFF4D67),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFF4D67).withOpacity(0.45),
                          blurRadius: 18,
                          spreadRadius: 1,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.call_end_rounded,
                      color: Colors.white,
                      size: 32,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    ).then((_) {
      _callingDialogOpen = false;
    });
  }

  void _showIncomingCall(Map<String, dynamic> event) {
    final from = event["from"].toString();
    final room = event["room"];
    final username = event["username"] ?? "Unknown User";
    final avatarUrl = event["avatar_url"];

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) {
        return Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.15),
                  blurRadius: 20,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Avatar
                CircleAvatar(
                  radius: 42,
                  backgroundColor: Colors.grey.shade200,
                  backgroundImage:
                      avatarUrl != null ? NetworkImage(avatarUrl) : null,
                  child: avatarUrl == null
                      ? const Icon(
                          Icons.person,
                          size: 42,
                          color: Colors.grey,
                        )
                      : null,
                ),

                const SizedBox(height: 18),

                // Incoming text
                const Text(
                  "Incoming Call",
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                  ),
                ),

                const SizedBox(height: 8),

                Text(
                  username,
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                  ),
                ),

                const SizedBox(height: 6),

                Text(
                  "is calling you...",
                  style: TextStyle(
                    color: Colors.grey.shade600,
                    fontSize: 15,
                  ),
                ),

                const SizedBox(height: 28),

                // Buttons
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    // Reject
                    InkWell(
                      onTap: () {
                        Navigator.pop(context);

                        _ws!.send({
                          "type": "call_reject",
                          "scope": "private",
                          "to": from,
                          "room": room,
                        });
                      },
                      borderRadius: BorderRadius.circular(50),
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: const BoxDecoration(
                          color: Colors.red,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.call_end,
                          color: Colors.white,
                          size: 30,
                        ),
                      ),
                    ),

                    // Accept
                    InkWell(
                      onTap: () async {
                        Navigator.pop(context);

                        setState(() {
                          _callStatus = CallStatus.connecting;
                        });

                        _showConnectingDialog();

                        _ws!.send({
                          "type": "call_accept",
                          "scope": "private",
                          "room": room,
                        });
                      },
                      borderRadius: BorderRadius.circular(50),
                      child: Container(
                        padding: const EdgeInsets.all(18),
                        decoration: const BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.call,
                          color: Colors.white,
                          size: 30,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildFloatingActionButton(BuildContext context) {
    return FloatingActionButton(
      onPressed: () => _createNewDiaryFromHome(context),
      heroTag: 'home_fab',
      child: const Icon(Icons.add),
    );
  }

  Future<void> showInboxDialog(BuildContext context) {
    return Navigator.of(context).push(
      RightSlidePageRoute(
        widget: InboxDialog(unreadCounts: _unreadCount),
      ),
    );
  }

  void _createNewDiaryFromHome(BuildContext context) {
    final feedProvider = Provider.of<FeedProvider>(context, listen: false);
    final feedApiService = Provider.of<FeedApiService>(context, listen: false);

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CreateDiaryScreen(
          feedApiService: feedApiService,
          onDiaryCreated: (DiaryModel diary) {
            feedProvider.diaries.insert(0, diary);
          },
        ),
      ),
    );
  }

  Widget _buildBottomNavBar() {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final isDarkMode = themeProvider.isDarkMode;
    final primaryColor =
        isDarkMode ? const Color(0xFF00BCD4) : const Color(0xFF6A11CB);

    return Padding(
      padding: const EdgeInsets.all(12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(25),
        child: Theme(
          data: Theme.of(context).copyWith(
            navigationBarTheme: NavigationBarThemeData(
              labelTextStyle: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.selected)) {
                  return TextStyle(
                      color: primaryColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 12);
                }
                return TextStyle(
                    color: isDarkMode ? Colors.white70 : Colors.grey[600],
                    fontSize: 12);
              }),
            ),
          ),
          child: NavigationBar(
            height: 70,
            backgroundColor:
                isDarkMode ? const Color(0xFF1E1E1E) : Colors.white,
            elevation: 10,
            selectedIndex: _selectedIndex,
            indicatorColor: primaryColor.withValues(alpha: 0.15),
            labelBehavior: NavigationDestinationLabelBehavior.onlyShowSelected,
            onDestinationSelected: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            destinations: [
              NavigationDestination(
                icon: Icon(Icons.home_outlined,
                    color: isDarkMode ? Colors.white70 : Colors.grey),
                selectedIcon: Icon(Icons.home, color: primaryColor),
                label: 'Feed',
              ),
              NavigationDestination(
                icon: Icon(Icons.chat_bubble_outline,
                    color: isDarkMode ? Colors.white70 : Colors.grey),
                selectedIcon: Icon(Icons.chat_bubble, color: primaryColor),
                label: 'Messages',
              ),
              NavigationDestination(
                icon: Icon(Icons.group_outlined,
                    color: isDarkMode ? Colors.white70 : Colors.grey),
                selectedIcon: Icon(Icons.group, color: primaryColor),
                label: 'Friends',
              ),
              NavigationDestination(
                icon: Icon(Icons.note_outlined,
                    color: isDarkMode ? Colors.white70 : Colors.grey),
                selectedIcon: Icon(Icons.note, color: primaryColor),
                label: 'Notes',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outlined,
                    color: isDarkMode ? Colors.white70 : Colors.grey),
                selectedIcon: Icon(Icons.person, color: primaryColor),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}