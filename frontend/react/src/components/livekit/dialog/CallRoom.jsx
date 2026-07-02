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

const PAGE_SIZE = 6;

function FloatingLocalVideo({ trackRef, participantInfo }) {
  const [pos, setPos] = useState({ x: 20, y: 20 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const videoPublication = trackRef?.publication;
  const isVideoOn = !videoPublication?.isMuted;

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
        background: "#111",
        border: "2px solid #333",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          width: "100%",
          height: "100%",
          position: "relative",
        }}
      >
        {isVideoOn ? (
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
              background: "#222",
            }}
          >
            {participantInfo?.avatar_url ? (
              <img
                src={participantInfo.avatar_url}
                alt=""
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "#555",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  fontWeight: 700,
                }}
              >
                {participantInfo?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}

            <div style={{ marginTop: 6, fontSize: 12 }}>
              {participantInfo?.username ?? "Me"}
            </div>
          </div>
        )}

        {/* label overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 6,
            padding: "4px 8px",
            background: "rgba(0,0,0,.45)",
            color: "#fff",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          You
        </div>
      </div>
    </div>
  );
}

function ParticipantTile({ trackRef, participantInfo }) {
  const videoPublication = trackRef?.publication;
  const hasVideo = videoPublication?.isMuted === false;

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
        <FloatingLocalVideo
          trackRef={localTrack}
          participantInfo={participants.find(
            p => String(p.user_id) === localTrack.participant.identity
          )}
        />
      )}
    </div>
  );
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