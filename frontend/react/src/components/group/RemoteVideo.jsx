import { useEffect, useRef } from "react";

export default function RemoteVideo ({ stream, style })  {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={false}
      style={style}
    />
  );
};
