import { Room } from "livekit-client";

let roomInstance = null;

export const connectToRoom = async (url, token) => {
  roomInstance = new Room();

  await roomInstance.connect(url, token);

  console.log("Connected to room");

  // Enable mic/cam
  await roomInstance.localParticipant.enableCameraAndMicrophone();
};