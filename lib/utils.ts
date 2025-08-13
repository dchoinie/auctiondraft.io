import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface RosterInfo {
  qbSlots: number;
  rbSlots: number;
  wrSlots: number;
  teSlots: number;
  flexSlots: number;
  dstSlots: number;
  kSlots: number;
  benchSlots: number;
  totalRosterSize: number;
}

export function calculateRosterInfo(leagueSettings: {
  qbSlots?: number;
  rbSlots?: number;
  wrSlots?: number;
  teSlots?: number;
  flexSlots?: number;
  dstSlots?: number;
  kSlots?: number;
  benchSlots?: number;
}): RosterInfo {
  const qbSlots = leagueSettings.qbSlots ?? 1;
  const rbSlots = leagueSettings.rbSlots ?? 2;
  const wrSlots = leagueSettings.wrSlots ?? 2;
  const teSlots = leagueSettings.teSlots ?? 1;
  const flexSlots = leagueSettings.flexSlots ?? 1;
  const dstSlots = leagueSettings.dstSlots ?? 1;
  const kSlots = leagueSettings.kSlots ?? 1;
  const benchSlots = leagueSettings.benchSlots ?? 7;

  const totalRosterSize = qbSlots + rbSlots + wrSlots + teSlots + flexSlots + dstSlots + kSlots + benchSlots;

  return {
    qbSlots,
    rbSlots,
    wrSlots,
    teSlots,
    flexSlots,
    dstSlots,
    kSlots,
    benchSlots,
    totalRosterSize,
  };
}
