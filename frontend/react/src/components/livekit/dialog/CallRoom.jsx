import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { useMemo, useState, useRef, useEffect } from "react";
import { Track } from "livekit-client";
import CallButton from "./CallButton";
import { useRoomContext } from "@livekit/components-react";
import { RoomEvent } from "livekit-client";

const PAGE_SIZE = 6;

function FloatingLocalVideo({ trackRef }) {
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const onMouseDown = (e) => {
    dragging.current = true;
    offset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  const onMouseMove = (e) => {
    if (!dragging.current) return;
    setPos({
      x: e.clientX - offset.current.x,
      y: e.clientY - offset.current.y,
    });
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  return (
    <div
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: 180,
        height: 120,
        zIndex: 9999,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "grab",
        background: "black",
        border: "2px solid #333",
      }}
    >
      <div onMouseDown={onMouseDown} style={{ width: "100%", height: "100%" }}>
        <VideoTrack
          trackRef={trackRef}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>
  );
}

function ParticipantTile({ trackRef, participantInfo }) {
  const hasVideo = !!trackRef?.publication?.track;

  console.log({
    identity: trackRef.participant.identity,
    isSubscribed: trackRef.publication?.isSubscribed,
    isMuted: trackRef.publication?.isMuted,
    track: trackRef.publication?.track,
    kind: trackRef.publication?.kind,
    source: trackRef.publication?.source,
  });

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 12,
        background: "#1f1f1f",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: '100%',
      }}
    >
      {hasVideo ? (
        <VideoTrack
          trackRef={trackRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
          }}
        >
          {participantInfo?.avatar_url ? (
            <img
              src={participantInfo.avatar_url}
              alt=""
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: "#555",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 36,
                fontWeight: 700,
              }}
            >
              {participantInfo?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}

          <div
            style={{
              marginTop: 16,
              fontSize: 16,
            }}
          >
            {participantInfo?.username ?? "?"}
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          padding: "6px 10px",
          background: "rgba(0,0,0,.45)",
          color: "#fff",
          borderRadius: 8,
        }}
      >
        {participantInfo?.username}
      </div>
    </div>
  );
}

function MyVideoConference({ participants }) {

  const tracks = useTracks([
    {
      source: Track.Source.Camera,
      withPlaceholder: true,
    },
  ]);

  useEffect(() => {
    console.log(
      tracks.map(t => ({
        identity: t.participant.identity,
        hasTrack: !!t.track,
        source: t.source,
        local: t.participant.isLocal,
      }))
    );
  }, [tracks]);

  const [page, setPage] = useState(0);

  const localTrack = useMemo(
    () => tracks.find(t => t.participant.isLocal),
    [tracks]
  );

  const remoteTracks = useMemo(
    () => tracks.filter(t => !t.participant.isLocal),
    [tracks]
  );

  const totalPages = Math.ceil(remoteTracks.length / PAGE_SIZE);

  const paginatedTracks = useMemo(() => {
    const start = page * PAGE_SIZE;
    return remoteTracks.slice(start, start + PAGE_SIZE);
  }, [remoteTracks, page]);

  const visibleTracks =
    remoteTracks.length <= PAGE_SIZE ? remoteTracks : paginatedTracks;

  const gridTemplate = useMemo(() => {
    const count = visibleTracks.length;

    if (count <= 1) return "1fr";
    if (count <= 4) return "repeat(2, 1fr)";
    if (count <= 9) return "repeat(3, 1fr)";

    return "repeat(4, 1fr)";
  }, [visibleTracks.length]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: gridTemplate,
          gap: "10px",
          height: "100%",
          padding: "10px",
        }}
      >
        {visibleTracks.length === 0 ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontSize: 24,
            }}
          >
            Waiting for participants...
          </div>
        ) : (
          visibleTracks.map((trackRef) => {
            const participantInfo = participants.find(
              p => String(p.user_id) === trackRef.participant.identity
            );

            return (
              <ParticipantTile
                key={trackRef.participant.sid}
                trackRef={trackRef}
                participantInfo={participantInfo}
              />
            );
          })
        )}
      </div>

      {remoteTracks.length > PAGE_SIZE && (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            right: 20,
            display: "flex",
            gap: "10px",
          }}
        >
          <button
            onClick={() => setPage(p => Math.max(p - 1, 0))}
            disabled={page === 0}
          >
            Prev
          </button>

          <button
            onClick={() => setPage(p => Math.min(p + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </button>
        </div>
      )}

      {localTrack && (
        <FloatingLocalVideo trackRef={localTrack} />
      )}
    </div>
  );
}

function RoomDebugger() {
  const room = useRoomContext();

  useEffect(() => {
    console.log("Connected room:", room.name);

    room.on(RoomEvent.ParticipantConnected, (p) => {
      console.log("Participant connected:", p.identity);
    });

    room.on(RoomEvent.ParticipantDisconnected, (p) => {
      console.log("Participant disconnected:", p.identity);
    });

    room.on(RoomEvent.TrackPublished, (pub, p) => {
      console.log("Track published:", p.identity, pub.source);
    });

    room.on(RoomEvent.TrackSubscribed, (track, pub, p) => {
      console.log("Track subscribed:", p.identity, pub.source);
    });

    console.log(room.state);
    console.log(room.localParticipant.isCameraEnabled);
    console.log(room.localParticipant.isMicrophoneEnabled);

    room.on(RoomEvent.TrackPublished, (pub, participant) => {
      console.log("Published", participant.identity, {
        source: pub.source,
        subscribed: pub.isSubscribed,
        track: pub.track,
      });
    });

    room.on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      console.log("Subscribed", participant.identity, {
        source: pub.source,
        track,
      });
    });

    return () => {
      room.removeAllListeners();
    };
  }, [room]);

  return null;
}

function PublishTracks() {
  const room = useRoomContext();

  useEffect(() => {
    async function publish() {
      await room.localParticipant.setCameraEnabled(true);
      await room.localParticipant.setMicrophoneEnabled(true);
    }

    publish();
  }, [room]);

  return null;
}

const CallRoom = ({ token, url, participants, onEndCall, onDisconnected }) => {

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      video
      audio
      adaptiveStream
      dynacast
      onDisconnected={onDisconnected}
      style={{ height: "100vh", width: "100%" }}
    >
      <RoomDebugger />

      <PublishTracks />
      {/* Plays all remote audio */}
      <RoomAudioRenderer />

      {/* Custom stream rendering */}
      <MyVideoConference participants={participants} />

      <CallButton onEndCall={onEndCall} />
    </LiveKitRoom>
  );
};

export default CallRoom;