import axios from "axios";

export interface Player {
  userId: string;
  nickname: string;
}

export interface GameRecord {
  userNum: number;
  nickname: string;
  gameId: number;
  seasonId: number;
  matchingMode: number;
  matchingTeamMode: number;
  characterNum: number;
  skinCode: number;
  characterLevel: number;
  gameRank: number;
  playerKill: number;
  playerAssistant: number;
  monsterKill: number;
  bestWeapon: number;
  bestWeaponLevel: number;
  masteryLevel: { [key: string]: number };
  equipment: { [key: string]: number };
  versionMajor: number;
  versionMinor: number;
  playTime: number;
  mmrBefore: number;
  mmrGain: number;
  mmrAfter: number;
  startDtm: string;
  damageToPlayer: number;
  traitFirstCore: number;
  traitFirstSub: number[];
  tacticalSkillGroup: number;
  teamKill: number;
  playerDeaths: number;
  teamNumber: number;
}

// Helper function to handle retries for 429 errors
const fetchWithRetry = async (url: string, config?: any, retries = 3, delay = 1000): Promise<any> => {
  try {
    return await axios.get(url, config);
  } catch (error: any) {
    if (error.response && error.response.status === 429 && retries > 0) {
      console.warn(`Rate limited (429). Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, config, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const erApi = {
  getPlayerByNickname: async (nickname: string): Promise<Player | null> => {
    try {
      const response = await fetchWithRetry(`/v1/user/nickname?query=${encodeURIComponent(nickname)}`);
      if (response.data.code === 200) {
        return response.data.user;
      }
      return null;
    } catch (error) {
      console.error("Error fetching player:", error);
      return null;
    }
  },

  getGames: async (userId: string, next?: number): Promise<{ userGames: GameRecord[], next?: number } | null> => {
    try {
      const response = await fetchWithRetry(`/v1/user/games/uid/${userId}`, { params: { next } });
      if (response.data.code === 200) {
        return {
          userGames: response.data.userGames,
          next: response.data.next
        };
      }
      return null;
    } catch (error) {
      console.error("Error fetching games:", error);
      return null;
    }
  },

  getMatchDetails: async (gameId: number): Promise<GameRecord[] | null> => {
    try {
      const response = await fetchWithRetry(`/v1/games/${gameId}`);
      if (response.data.code === 200) {
        return response.data.userGames;
      }
      return null;
    } catch (error) {
      console.error("Error fetching match details:", error);
      return null;
    }
  },

  getMetaData: async (metaType: string): Promise<any[] | null> => {
    try {
      const response = await fetchWithRetry(`/v2/data/${metaType}`);
      if (response.data.code === 200) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`Error fetching meta data ${metaType}:`, error);
      return null;
    }
  }
};
