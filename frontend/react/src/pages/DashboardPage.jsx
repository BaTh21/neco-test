import {
  Alert,
  Backdrop,
  Box,
  CircularProgress,
  Collapse
} from '@mui/material';
import { useCallback, useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CreateGroupDialog from '../components/CreateGroupDialog';
import FeedTab from '../components/dashboard/FeedTab';
import FriendsTab from '../components/dashboard/FriendsTab';
import NotesTab from '../components/dashboard/NotesTab';
import ProfileSection from '../components/dashboard/ProfileSection';
import CreateDiaryDialog from '../components/dialogs/CreateDiaryDialog';
import ViewGroupDialog from '../components/dialogs/ViewGroupDialog';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getFeed, getFriends, getMe, getPendingRequests, getUserGroups, getSuggestFriends, getPendingFriends, getBlockedUsers, getAllSatusFriends, getLivekitToken } from '../services/api';
import ChatTab from '../components/dashboard/ChatTab';
import SettingTab from '../components/dashboard/SettingTab';
import IncomingCallDialog from '../components/livekit/dialog/IncomingCallDialog';
import ActiveCallDialog from '../components/livekit/dialog/ActiveCallDialog';
import CallRequest from '../components/livekit/dialog/CallRequest';
import { useGlobalWebsocket } from '../hooks/useGlobalWebsocket';
import { useUnreadMessages } from "../context/unreadMessagesContext";

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`main-tabpanel-${index}`}
      aria-labelledby={`main-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: { xs: 2, sm: 3 } }}>{children}</Box>}
    </div>
  );
}

const DashboardPage = ({ defaultTab = 0 }) => {
  const { isAuthenticated, auth } = useAuth();
  const user = auth.user;
  const navigate = useNavigate();
  const location = useLocation();
  const [profile, setProfile] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [friends, setFriends] = useState([]);
  const [pendingFriends, setPendingFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [diaries, setDiaries] = useState([]);
  const [groups, setGroups] = useState([]);

  const [diaryDialogOpen, setDiaryDialogOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [viewGroupDialogOpen, setViewGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [suggestFriends, setSuggestFriends] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [allSatusFriends, setAllSatusFriends] = useState([]);
  const token = localStorage.getItem('accessToken');

  const { setUnreadMessages } = useUnreadMessages();

  const [chats, setChats] = useState([]);

  // for call
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState({
    status: "idle", // idle | ringing | incoming | connecting | active
    room: null,
    token: null,
    url: null,
    target: null,
  });
  const [callRequest, setCallRequest] = useState(null);
  const callStateRef = useRef(callState);
  const pendingRoomRef = useRef(null);
  const [userStatus, setUserStatus] = useState(null);
  const joiningRef = useRef(false);
  const [participants, setParticipants] = useState([]);

  // Map URL paths to tab indices
  const pathToTabMap = {
    '/feed': 0,
    '/messages': 1,
    '/friends': 2,
    '/notes': 3,
    '/profile': 4,
    '/setting': 5,
  };

  // Map tab indices to URL paths
  const tabToPathMap = {
    0: '/feed',
    1: '/messages',
    2: '/friends',
    3: '/notes',
    4: '/profile',
    5: '/setting',
  };

  // Handle URL-based tab navigation
  useEffect(() => {
    const currentTab = pathToTabMap[location.pathname] || 0;
    setActiveTab(currentTab);
  }, [location.pathname]);

  // Update URL when tab changes
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newPath = tabToPathMap[newTab] || '/feed';
    navigate(newPath);
  };

  // Initial data fetch - ONLY on component mount
  const fetchDashboardData = useCallback(async () => {
    try {
      let profileData = auth?.user;
      if (!profileData) {
        profileData = await getMe();
        setProfile(profileData);

      } else {
        setProfile(profileData);
      }

      const [friendsData, pendingData, feedData, groupsData, suggestFriendData, pendingFriendData, blockUserData, allSatusFriendData] = await Promise.all([
        getFriends().catch(() => []),
        getPendingRequests().catch(() => []),
        getFeed(25, 0).catch(() => []),
        getUserGroups().catch(() => []),
        getSuggestFriends().catch(() => []),
        getPendingFriends().catch(() => []),
        getBlockedUsers().catch(() => []),
        getAllSatusFriends().catch(() => []),

      ]);

      setFriends(friendsData);
      setPendingRequests(pendingData);
      setDiaries(feedData);
      setGroups(groupsData);
      setSuggestFriends(suggestFriendData);
      setPendingFriends(pendingFriendData);
      setBlockedUsers(blockUserData);
      setAllSatusFriends(allSatusFriendData);

    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setInitialLoading(false);
    }
  }, [auth?.user]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchDashboardData();
  }, [isAuthenticated, navigate, fetchDashboardData]);

  const handleWSMessage = async (data) => {
    console.log("WS message:", data);

    const type = data.type;

    if (type === "incoming_call") {
      pendingRoomRef.current = data.room;

      setIncomingCall({
        type: "private",
        from: data.from,
        name: data.username,
        avatar_url: data.avatar_url,
        room: data.room,
        room_type: data.room_type,
        call_type: data.call_type ?? 'voice'
      });

      setCallState(prev => ({
        ...prev,
        status: "incoming",
      }));
    }

    if (type === "group_call_started") {
      pendingRoomRef.current = data.room;

      setIncomingCall({
        type: "group",
        from: data.from,
        name: data.username,
        avatar_url: data.avatar_url,
        room: data.room,
        groupId: data.group_id,
        room_type: data.room_type,
        call_type: data.call_type ?? 'voice'
      });

      setCallState(prev => ({
        ...prev,
        status: "incoming",
      }));
    }

    if (type === "call_created") {
      pendingRoomRef.current = data.room;

      setCallRequest(prev => ({
        ...prev,
        room: data.room,
        status: "calling"
      }));
    }

    if (type === "already_in_call") {
      setCallRequest(prev => ({
        ...prev,
        status: "User is in another call"
      }))
    }
    if (type === "ringing") {
      setCallRequest(prev => ({
        ...prev,
        status: "ringing"
      }))
    }
    if (type === "call_busy") {
      setCallRequest(prev => ({
        ...prev,
        status: "busy"
      }));
    }
    if (type === "user_offline") {
      setCallRequest(prev => ({
        ...prev,
        status: 'offline'
      }))
    }

    if (type === "call_accepted") {
      const room = data.room;

      if (pendingRoomRef.current !== room) return;

      if (joiningRef.current) return;

      if (callStateRef.current.status === "active") return;

      joiningRef.current = true;

      try {
        const { token, url } = await getLivekitToken(room);

        if (pendingRoomRef.current !== room) return;

        const joinedParticipants = [
          ...(data.already_joined || []),
          {
            user_id: data.by,
            username: data.username,
            avatar_url: data.avatar_url,
          }
        ];

        setParticipants(prev => {
          const merged = [...prev, ...joinedParticipants];

          return merged.filter(
            (p, index, self) =>
              index === self.findIndex(x => x.user_id === p.user_id)
          );
        });

        setCallState({
          status: "active",
          room,
          token,
          url,
          target: data.by,
          room_type: incomingCall?.room_type || "private"
        });

        setIncomingCall(null);
        setCallRequest(null);
      } catch (err) {
        console.error(err);

        cleanupCall();

        setError("Failed to join call");
      } finally {
        joiningRef.current = false;
      }
    }
    if (type === "participant_joined") {
      setParticipants(prev => {
        const exists = prev.some(
          p => p.user_id === data.participant.user_id
        );

        if (exists) return prev;

        return [...prev, data.participant];
      });
    }
    if (type === "participant_left") {
      removeParticipant(
        data.user_id,
        `${data.username} left the call.`
      );
    }
    if (type === "call_timeout") {
      cleanupCall();
    }
    if (type === "call_rejected") {
      cleanupCall();
    }
    if (type === "call_cancelled") {
      cleanupCall();
    }
    if (type === "call_ended") {
      setTimeout(cleanupCall, 3000);
    }
    if (type === "disconnected") {
      removeParticipant(
        data.user_id,
        `${data.username} disconnected from the call.`
      );
    }
    if (type === "chat_list_update") {
      applyChatUpdate(data.chat);
    }
    if (type === "error") {
      setError(data.message);
    }
  };

  const applyChatUpdate = useCallback((chat) => {
    setChats(prev => {
      const existing = prev.find(
        c => c.id === chat.id &&
          c.type === chat.type
      );

      const merged = {
        ...(existing || {}),
        ...chat,
        unread_count: chat.increment_unread
          ? (existing?.unread_count ?? 0) + 1
          : (existing?.unread_count ?? 0),
      };

      return [
        merged,
        ...prev.filter(
          c => !(c.id === chat.id && c.type === chat.type)
        ),
      ];
    });

    if (chat.increment_unread) {
      setUnreadMessages(prev => prev + 1);
    }
  }, [setUnreadMessages]);

  const { send, isConnected } = useGlobalWebsocket({
    token,
    WS_BASE_URI: import.meta.env.VITE_API_URL.replace(/^http/, "ws"),
    onMessage: handleWSMessage,
  });

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (!isConnected && callState.status === "active") {
      setError("Connection lost");
    }
  }, [isConnected]);

  const acceptCall = () => {
    if (!incomingCall || !isConnected) return;

    send({
      type: "call_accept",
      scope: "private",
      room: incomingCall.room,
    });

    setIncomingCall(null);
  };

  const rejectCall = () => {
    if (!incomingCall || !isConnected) return;

    send({
      type: "call_reject",
      scope: "private",
      room: incomingCall.room,
    });

    setIncomingCall(null);
  };

  const cancelCall = () => {
    if (!callRequest) return;

    send({
      type: "call_cancel",
      scope: "private",
      room: callRequest.room,
    });

    cleanupCall();
  };

  const leaveCall = () => {
    if (!callState.room || !isConnected) return;

    send({
      type: "call_end",
      scope: callState.room_type,
      room: callState.room,
    });

    cleanupCall();
  };

  const removeParticipant = (userId, message) => {
    setParticipants(prev => {
      const updated = prev.filter(
        p => p.user_id !== userId
      );

      const remainingOthers = updated.filter(
        p => p.user_id !== user.id
      );

      if (remainingOthers.length === 0) {
        cleanupCall();
      }

      return updated;
    });

    setUserStatus(message);
  };

  const handleRoomDisconnected = () => {
    cleanupCall();
  };

  const cleanupCall = () => {
    pendingRoomRef.current = null;
    joiningRef.current = false;

    setIncomingCall(null);

    setCallState(prev => {
      if (prev.status === "idle") return prev;

      return {
        status: "idle",
        room: null,
        token: null,
        url: null,
        target: null,
        room_type: null,
      };
    });

    setCallRequest(null);
    setParticipants([]);
    setUserStatus(null);
  };

  if (initialLoading) {
    return (
      <Layout>
        <Backdrop open={true} sx={{ zIndex: 1300, color: '#40C4FF' }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </Layout>
    );
  }

  if (!isAuthenticated || !profile) {
    return (
      <Layout>
        <Backdrop open={true} sx={{ zIndex: 1300, color: '#40C4FF' }}>
          <CircularProgress color="inherit" />
        </Backdrop>
      </Layout>
    );
  }

  return (
    <>
      <Layout onProfileClick={handleTabChange} setNewActiveTab={handleTabChange}>
        <Collapse in={!!error}>
          <Alert
            severity="error"
            sx={{
              position: "fixed",
              top: 20,
              right: 20,
              zIndex: 2000,
              borderRadius: 2,
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        </Collapse>

        <Collapse in={!!success}>
          <Alert
            severity="success"
            sx={{
              position: "fixed",
              top: 20,
              right: 20,
              zIndex: 2000,
              borderRadius: 2,
            }}
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        </Collapse>
        <Box
          sx={{
            display: "flex",
            justifyContent: 'space-between',
            height: "100vh",
            bgcolor: "#f4f6f8",
            overflowY: "hidden",
          }}
        >

          <Box sx={{
            width: '100%',
            mt: 6
          }}>
            <TabPanel value={activeTab} index={0}>
              <FeedTab
                diaries={diaries}
                profile={profile}
                groups={groups}
                onNewDiary={() => setDiaryDialogOpen(true)}
                setError={setError}
                setSuccess={setSuccess}
                onDataUpdate={fetchDashboardData}
                friends={allSatusFriends}
                pendingRequests={pendingRequests}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1} >
              <ChatTab
                friends={friends}
                profile={profile}
                error={error}
                setError={setError}
                setSuccess={setSuccess}
                setCallRequest={setCallRequest}
                send={send}
                chats={chats}
                setChats={setChats}
                setUnreadMessages={setUnreadMessages}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
              <FriendsTab
                friends={friends}
                pendingRequests={pendingRequests}
                profile={profile}
                setActiveTab={handleTabChange}
                setError={setError}
                setSuccess={setSuccess}
                onDataUpdate={fetchDashboardData}
                suggestFriends={suggestFriends}
                pendingFriends={pendingFriends}
                blockedUsers={blockedUsers}
                currentUserId={user.id}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={3}>
              <NotesTab
                setError={setError}
                setSuccess={setSuccess}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={4}>
              <ProfileSection
                profile={profile}
                setProfile={setProfile}
                error={error}
                success={success}
                setError={setError}
                setSuccess={setSuccess}
                onDataUpdate={fetchDashboardData}
                friends={allSatusFriends}
                onNewDiary={() => setDiaryDialogOpen(true)}
                groups={groups}
                onSetting={() => navigate('/setting')}
              />
            </TabPanel>
            <TabPanel value={activeTab} index={5}>
              <SettingTab profile={profile} onDataUpdate={fetchDashboardData} />
            </TabPanel>
          </Box>
        </Box>

        <CreateDiaryDialog
          open={diaryDialogOpen}
          onClose={() => setDiaryDialogOpen(false)}
          groups={groups}
          onSuccess={() => {
            setDiaryDialogOpen(false);
            fetchDashboardData();
            setSuccess('Diary created successfully');
            setTimeout(() => {
              setSuccess('');
            }, 2000);
          }}
          setError={setError}
        />

        <CreateGroupDialog
          open={groupDialogOpen}
          onClose={() => setGroupDialogOpen(false)}
          onSuccess={(newGroup) => {
            setGroups(prev => [...prev, newGroup]);
            setGroupDialogOpen(false);
            setSuccess('Group created successfully!');
            fetchDashboardData();
          }}
          friends={friends}
        />

        <ViewGroupDialog
          open={viewGroupDialogOpen}
          onClose={() => setViewGroupDialogOpen(false)}
          group={selectedGroup}
          profile={profile}
          onJoinSuccess={() => {
            setViewGroupDialogOpen(false);
            fetchDashboardData();
            setSuccess('Successfully joined the group!');
          }}
          setError={setError}
          setSuccess={setSuccess}
        />

      </Layout>
      <IncomingCallDialog incomingCall={incomingCall} onAccept={acceptCall} onReject={rejectCall} />
      <ActiveCallDialog
        activeCall={callState.status === "active" ? callState : null}
        participants={participants}
        onEndCall={leaveCall}
        onDisconnected={handleRoomDisconnected}
        userStatus={userStatus}
      />
      <CallRequest callRequest={callRequest} onCancel={cancelCall} />
    </>
  );
};

export default DashboardPage;