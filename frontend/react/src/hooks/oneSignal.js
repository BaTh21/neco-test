import OneSignal from "react-onesignal";

let initialized = false;

export const initOneSignal = async () => {
  if (initialized) return;

  await OneSignal.init({
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID,
    notifyButton: { enable: false },
    allowLocalhostAsSecureOrigin: true,
  });

  initialized = true;
};

