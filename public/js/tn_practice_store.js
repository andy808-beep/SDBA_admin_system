// tn_practice_store.js
// SessionStorage wrapper for TN practice data with team-based organization
//
// Provides clean API for managing practice rows per team without global refactors

const KEY_PREFIX = 'tn_practice_team_';
const CUR_KEY = 'tn.practice.current_team';
const RANK_KEY_PREFIX = 'tn_slot_ranks_';

export const getCurrentTeamKey = () => sessionStorage.getItem(CUR_KEY) || 't1';
export const setCurrentTeamKey = (k) => sessionStorage.setItem(CUR_KEY, k);

export function readTeamRows(teamKey) {
  try { 
    return JSON.parse(sessionStorage.getItem(KEY_PREFIX + teamKey)) || []; 
  } catch { 
    return []; 
  }
}

export function writeTeamRows(teamKey, rows) {
  sessionStorage.setItem(KEY_PREFIX + teamKey, JSON.stringify(rows||[]));
}

export const readTeamRanks = (k) => JSON.parse(sessionStorage.getItem(RANK_KEY_PREFIX+k) || '[]');
export const writeTeamRanks = (k, ranks) => sessionStorage.setItem(RANK_KEY_PREFIX+k, JSON.stringify(ranks||[]));
