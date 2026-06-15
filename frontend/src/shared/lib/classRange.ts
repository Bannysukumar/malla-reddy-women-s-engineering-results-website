const MAX_CLASS_RANGE = 70;

export interface ClassTicketRange {
  prefix: string;
  startRoll: number;
  endRoll: number;
  rollDigits: number;
  sampleTicket: string;
  firstTicket: string;
  lastTicket: string;
  total: number;
}

export function parseClassTicketRange(firstTicket: string, lastTicket: string): ClassTicketRange {
  const first = firstTicket.trim().toUpperCase();
  const last = lastTicket.trim().toUpperCase();

  if (!first || !last) {
    throw new Error("Enter both the first and last hall ticket numbers");
  }

  if (first.length !== last.length) {
    throw new Error("Both hall tickets must be the same length (same section prefix)");
  }

  for (const rollDigits of [2, 3, 4]) {
    if (first.length <= rollDigits) continue;

    const prefix = first.slice(0, -rollDigits);
    if (prefix !== last.slice(0, -rollDigits)) continue;

    const rollA = parseInt(first.slice(-rollDigits), 10);
    const rollB = parseInt(last.slice(-rollDigits), 10);
    if (Number.isNaN(rollA) || Number.isNaN(rollB)) continue;

    const startRoll = Math.min(rollA, rollB);
    const endRoll = Math.max(rollA, rollB);
    const total = endRoll - startRoll + 1;

    if (total > MAX_CLASS_RANGE) {
      throw new Error(`Maximum ${MAX_CLASS_RANGE} students per scrape (${total} requested)`);
    }

    return {
      prefix,
      startRoll,
      endRoll,
      rollDigits,
      sampleTicket: first,
      firstTicket: first,
      lastTicket: last,
      total,
    };
  }

  throw new Error("Could not parse hall ticket range — use tickets from the same section");
}

export function toClassPayload(range: ClassTicketRange) {
  return {
    prefix: range.prefix,
    sampleTicket: range.sampleTicket,
    firstTicket: range.firstTicket,
    lastTicket: range.lastTicket,
    startRoll: range.startRoll,
    endRoll: range.endRoll,
    rollDigits: range.rollDigits,
  };
}

/** Client-side safety: never show students outside the requested hall ticket range. */
export function filterClassResultToRange<T extends { students?: { hallTicket: string }[]; failed?: { hallTicket: string }[] }>(
  result: T,
  range: ClassTicketRange
): T {
  const tickets = new Set<string>();
  for (let roll = range.startRoll; roll <= range.endRoll; roll += 1) {
    const suffix = String(roll).padStart(range.rollDigits, "0");
    tickets.add(`${range.prefix}${suffix}`.toUpperCase());
  }
  return {
    ...result,
    students: (result.students || []).filter((s) => tickets.has(s.hallTicket.toUpperCase())),
    failed: (result.failed || []).filter((f) => tickets.has(f.hallTicket.toUpperCase())),
  };
}

export function rangeFromPayload(payload: {
  prefix: string;
  startRoll: number;
  endRoll: number;
  rollDigits: number;
  sampleTicket: string;
  firstTicket: string;
  lastTicket: string;
}): ClassTicketRange {
  return {
    prefix: payload.prefix,
    startRoll: payload.startRoll,
    endRoll: payload.endRoll,
    rollDigits: payload.rollDigits,
    sampleTicket: payload.sampleTicket,
    firstTicket: payload.firstTicket,
    lastTicket: payload.lastTicket,
    total: payload.endRoll - payload.startRoll + 1,
  };
}
