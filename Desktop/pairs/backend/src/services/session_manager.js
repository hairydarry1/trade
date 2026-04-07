const SESSIONS = {
  tokyo: { name: "Tokyo", start: 0, end: 8 },
  london: { name: "London", start: 8, end: 16 },
  ny: { name: "New York", start: 13, end: 21 },
};

export function getCurrentSession() {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sessions = [];

  for (const [key, s] of Object.entries(SESSIONS)) {
    if (utcHour >= s.start && utcHour < s.end) {
      sessions.push(key);
    }
  }

  if (sessions.length === 0) return "closed";
  return sessions.join("+");
}

export function getSessionInfo() {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const active = [];
  const upcoming = [];

  for (const [key, s] of Object.entries(SESSIONS)) {
    if (utcHour >= s.start && utcHour < s.end) {
      active.push({ ...s, key, hoursLeft: s.end - utcHour });
    } else {
      let hoursUntil = s.start - utcHour;
      if (hoursUntil < 0) hoursUntil += 24;
      upcoming.push({ ...s, key, hoursUntil });
    }
  }

  const isOverlap = active.length > 1;
  const isHighLiquidity = active.some(s => s.key === "london") && active.some(s => s.key === "ny");

  return {
    active,
    upcoming,
    isOverlap,
    isHighLiquidity,
    currentSession: getCurrentSession(),
    utcTime: now.toISOString(),
  };
}

export function isGoodTradingSession() {
  const info = getSessionInfo();
  return info.active.length > 0;
}

export function getMinutesUntilSession(targetSession) {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const s = SESSIONS[targetSession];
  if (!s) return -1;
  let targetMinutes = s.start * 60;
  let diff = targetMinutes - utcMinutes;
  if (diff < 0) diff += 1440;
  return diff;
}
