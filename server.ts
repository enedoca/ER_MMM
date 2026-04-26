import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const API_KEY = process.env.ETERNAL_RETURN_API_KEY || "VyS7QQNynL8ulPd8AuC1v3M4AFSkZbzl3achqjtI";
  const BASE_URL = "https://open-api.bser.io";

  app.use(express.json());

  // API Proxy Routes
  app.get("/v1/user/nickname", async (req, res) => {
    try {
      const { query } = req.query;
      const response = await axios.get(`${BASE_URL}/v1/user/nickname`, {
        params: { query },
        headers: { "x-api-key": API_KEY }
      });
      
      if (response.data.user) {
        const user = response.data.user;
        const userIdStr = (user.uid || user.userId || user.userNum)?.toString();
        
        if (userIdStr) {
          // Sync to Player table immediately on search
          await prisma.player.upsert({
            where: { userId: userIdStr },
            update: { nickname: user.nickname },
            create: { userId: userIdStr, nickname: user.nickname }
          }).catch(err => console.error("[DB Sync Error] Failed to sync player on search:", err.message));
        }
      }
      
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
    }
  });

  app.get("/v1/games/:gameId", async (req, res) => {
    try {
      const { gameId } = req.params;
      const response = await axios.get(`${BASE_URL}/v1/games/${gameId}`, {
        headers: { "x-api-key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
    }
  });

  app.get("/v1/user/games/uid/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { next } = req.query;
      const response = await axios.get(`${BASE_URL}/v1/user/games/uid/${userId}`, {
        params: { next },
        headers: { "x-api-key": API_KEY }
      });
      
      // Filter out only Ranked Games (matchingMode === 3)
      if (response.data.userGames) {
        const allGames = response.data.userGames;
        response.data.userGames = allGames.filter((g: any) => g.matchingMode === 3);
        
        // Sync match and 24 players into PostgeSQL DB asynchronously
        syncMatchDataInBackground(allGames);
      }
      
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
    }
  });

  app.get("/v2/user/stats/uid/:userId/:seasonId/:matchingMode", async (req, res) => {
    try {
      const { userId, seasonId, matchingMode } = req.params;
      const response = await axios.get(`${BASE_URL}/v2/user/stats/uid/${userId}/${seasonId}/${matchingMode}`, {
        headers: { "x-api-key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
    }
  });

  app.get("/v2/data/:metaType", async (req, res) => {
    try {
      const { metaType } = req.params;
      const response = await axios.get(`${BASE_URL}/v2/data/${metaType}`, {
        headers: { "x-api-key": API_KEY }
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json(error.response?.data || { message: "Internal Server Error" });
    }
  });

  app.post("/api/jobs/sync-top-rankers", async (req, res) => {
    // Fire and forget background job
    res.json({ message: "Sync job for top rankers started in the background." });
    
    (async () => {
      try {
        const seasonId = req.body.seasonId || 29; // Needs latest season id
        console.log(`[Job] Fetching Top 1000 Rankers for season ${seasonId}...`);
        
        // 1. Fetch Top Rankers
        let allRankers: any[] = [];
        const response = await axios.get(`${BASE_URL}/v1/rank/top/${seasonId}/3`, {
          headers: { "x-api-key": API_KEY }
        });
        
        if (response.data?.topRanks) {
          allRankers = response.data.topRanks;
        }

        console.log(`[Job] Found ${allRankers.length} top rankers. Fetching matches within 30 days...`);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // 2. Fetch match history sequentially to respect rate limits
        for (const ranker of allRankers) {
          let nextKey = "";
          let keepFetching = true;
          let userGamesToSync = [];
          
          while (keepFetching) {
            await new Promise(r => setTimeout(r, 1500)); // Respect rate limits
            try {
               const histRes = await axios.get(`${BASE_URL}/v1/user/games/${ranker.userNum}`, {
                 params: { next: nextKey || undefined },
                 headers: { "x-api-key": API_KEY }
               });
               
               const games = histRes.data?.userGames || [];
               if (games.length === 0) break;
               
               for (const g of games) {
                 if (g.matchingMode !== 3) continue; // Only ranked
                 
                 const matchDate = g.startDtm ? new Date(g.startDtm) : new Date();
                 if (matchDate < thirtyDaysAgo) {
                   keepFetching = false;
                   break;
                 }
                 userGamesToSync.push(g);
               }
               
               nextKey = histRes.data?.next;
               if (!nextKey) keepFetching = false;
               
            } catch (err: any) {
               console.error(`[Job Error] Failed to fetch games for ranker ${ranker.userNum}:`, err.message);
               // If 429 wait and retry, otherwise break
               if (err.response?.status === 429) {
                 await new Promise(r => setTimeout(r, 3000));
               } else {
                 break;
               }
            }
          }
          
          if (userGamesToSync.length > 0) {
             console.log(`[Job] Found ${userGamesToSync.length} relevant games for ranker ${ranker.userNum}. Syncing...`);
             await syncMatchDataInBackground(userGamesToSync);
          }
        }
        console.log(`[Job] Completed top ranker sync successfully.`);
      } catch (error: any) {
        console.error(`[Job Error] Top ranker sync failed:`, error.message);
      }
    })();
  });

  app.get("/api/stats/summary", async (req, res) => {
    try {
       const stats: any[] = await prisma.$queryRawUnsafe(`
         SELECT 
           "characterNum", 
           "bestWeapon",
           CAST(COUNT(*) AS INT) as "matchCount",
           CAST(COALESCE(AVG("damageToPlayer"), 0) AS INT) as "avgDamageToPlayer",
           CAST(COALESCE(AVG("damageToMonster"), 0) AS INT) as "avgDamageToMonster",
           CAST(COALESCE(AVG("teamKill"), 0) AS FLOAT) as "avgTeamKill",
           CAST(COALESCE(AVG("playerAssistant"), 0) AS FLOAT) as "avgPlayerAssistant",
           CAST(COALESCE(AVG("playerKill"), 0) AS FLOAT) as "avgPlayerKill",
           CAST(COALESCE(AVG("playerDeaths"), 0) AS FLOAT) as "avgPlayerDeaths",
           CAST(COALESCE(AVG("viewContribution"), 0) AS FLOAT) as "avgViewContribution",
           CAST(COALESCE(AVG("totalGainVFCredit"), 0) AS INT) as "avgTotalGainVFCredit",
           CAST(COALESCE(AVG("mmrGain"), 0) AS FLOAT) as "avgMmrGain",
           
           (CAST(SUM(CASE WHEN "gameRank" = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100 as "winRate",
           (CAST(SUM(CASE WHEN "gameRank" <= 3 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100 as "top3Rate",
           (CAST(SUM(CASE WHEN "mmrGain" > 0 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100 as "positiveMmrRate"
         FROM "PlayerGameRecord"
         GROUP BY "characterNum", "bestWeapon"
         HAVING COUNT(*) > 0
         ORDER BY "matchCount" DESC
       `);
       
       const jsonResponse = JSON.stringify(stats, (key, value) => 
         typeof value === 'bigint' ? Number(value) : value
       );
       res.setHeader('Content-Type', 'application/json');
       res.send(jsonResponse);
    } catch (error: any) {
       console.error("Stats query error:", error);
       res.status(500).json({ message: "Failed to generate stats" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

async function syncMatchDataInBackground(games: any[]) {
  const API_KEY = process.env.ETERNAL_RETURN_API_KEY || "VyS7QQNynL8ulPd8AuC1v3M4AFSkZbzl3achqjtI";
  const BASE_URL = "https://open-api.bser.io";

  const rankedGames = games.filter(g => g.matchingMode === 3);
  if (!rankedGames.length) return;

  for (const match of rankedGames) {
    let retries = 3;
    while (retries > 0) {
      try {
        const existingGame = await prisma.game.findUnique({ where: { gameId: match.gameId } });
        if (existingGame) break; // Already saved, move to next match in the for loop
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // Respect Rate Limits (Increased from 0.5s to 1.5s)
        
        const res = await axios.get(`${BASE_URL}/v1/games/${match.gameId}`, {
          headers: { "x-api-key": API_KEY }
        });
        
        const participants = res.data.userGames || [];
        if (!participants.length) break;
        
        await prisma.$transaction(async (tx) => {
          const game = await tx.game.upsert({
            where: { gameId: match.gameId },
            update: {},
            create: {
              gameId: match.gameId,
              seasonId: match.seasonId,
              matchingMode: match.matchingMode,
              startDtm: match.startDtm ? new Date(match.startDtm) : null
            }
          });
          
          let playersCreated = 0;
          for (const p of participants) {
            const userIdStr = (p.userNum || p.userId || p.userUid)?.toString();
            
            if (userIdStr) {
              await tx.player.upsert({
                where: { userId: userIdStr },
                update: { nickname: p.nickname },
                create: { userId: userIdStr, nickname: p.nickname }
              });
              playersCreated++;
            }

            await tx.playerGameRecord.create({
              data: {
                userId: userIdStr || null,
                gameId: game.gameId,
                nickname: p.nickname,
                characterNum: p.characterNum,
                characterLevel: p.characterLevel,
                gameRank: p.gameRank,
                playerKill: p.playerKill || 0,
                playerAssistant: p.playerAssistant || 0,
                monsterKill: p.monsterKill || 0,
                damageToPlayer: p.damageToPlayer || 0,
                damageToMonster: p.damageToMonster || 0,
                viewContribution: p.viewContribution || 0,
                totalGainVFCredit: p.totalGainVFCredit || 0,
                teamKill: p.teamKill || 0,
                playerDeaths: p.playerDeaths || 0,
                bestWeapon: p.bestWeapon || 0,
                mmrGain: p.mmrGain,
                mmrAfter: p.mmrAfter,
                rawStats: p
              }
            });
          }
          console.log(`[DB Sync] Game ${match.gameId}: Saved ${playersCreated} players to Player table.`);
        }, {
          maxWait: 10000,
          timeout: 20000
        });
        console.log(`[DB Sync] Game ${match.gameId} with ${participants.length} players populated.`);
        break; // Success, break the retry loop and move to next game
      } catch (err: any) {
        if (err.response?.status === 429) {
          retries--;
          console.warn(`[DB Sync Warn] 429 Rate Limit for game ${match.gameId}. Retrying... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, 3000)); // wait longer (3s) before retrying
        } else {
          console.error(`[DB Sync Error] Failed to sync game ${match.gameId}:`, err.message);
          break; // Unhandled error, break retry loop and move to next game
        }
      }
    }
  }
}

startServer();
