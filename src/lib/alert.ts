// In-app alert helpers: sound, vibration, and system notification while the app is open.
let ctx: AudioContext | null = null;

export function unlockAudio() {
  if (typeof window === "undefined") return;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!ctx && AC) ctx = new AC();
  void ctx?.resume();
}

export function playRing() {
  if (!ctx) return;
  const now = ctx.currentTime;
  for (let i = 0; i < 6; i++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "square";
    o.frequency.value = i % 2 ? 660 : 880;
    g.gain.setValueAtTime(0.0001, now + i * 0.25);
    g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.25 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(now + i * 0.25);
    o.stop(now + i * 0.25 + 0.24);
  }
  navigator.vibrate?.([300, 100, 300, 100, 300]);
}

export function systemNotify(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: `${import.meta.env.BASE_URL}icon-512.png` });
  } catch {
    /* some browsers only allow notifications via service worker */
  }
}

export async function requestNotifyPermission() {
  if (typeof Notification === "undefined") return "unsupported";
  if (window.top !== window.self) return "open-in-new-tab";
  return Notification.requestPermission();
}
