/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, Trophy, Users, Search, Loader2, AlertCircle, RefreshCw, BarChart2 } from "lucide-react";
import { erApi, GameRecord, Player } from "./services/erApi";

const TEST_NICKNAMES = [
  '삼대독자엄준식', '피닉스박93', '0RC4', '카밀로는댄스머신', 'acidmana', '내내일', '도숙자', 
  '눈꽃맛코코아', '노원빈어머니', '노력하는공룡', '설표범', 
  'EScaper', '파륜', '카밀로는', '非酋本非丶'
];

interface ImageSlotProps {
  className?: string;
  title?: string;
  src?: string;
  size?: "sm" | "md" | "lg";
  key?: string | number;
}

function ImageSlot({ className, title, src, size = "md" }: ImageSlotProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12"
  };
  
  return (
    <div className={`image-slot ${sizeClasses[size as keyof typeof sizeClasses]} ${className}`} title={title}>
      <div className="layer-bg" />
      <div className="layer-top" />
      {src && <img src={src} alt={title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />}
    </div>
  );
}

function MatchCard({ game, key }: { game: GameRecord; key?: string | number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [matchDetails, setMatchDetails] = useState<GameRecord[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const isVictory = game.gameRank === 1;
  const bgColor = isVictory ? "bg-[#f0f7ff]" : "bg-white";
  const borderColor = isVictory ? "border-[#3d95e5]" : "border-[#e5e5e5]";
  const rankColor = isVictory ? "text-[#3d95e5]" : "text-[#777]";
  
  const timeAgo = new Date(game.startDtm).toLocaleDateString();
  const mode = game.matchingMode === 3 ? "랭크 대전" : "일반 대전";

  const handleExpand = async () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded && !matchDetails) {
      setLoadingDetails(true);
      const details = await erApi.getMatchDetails(game.gameId);
      if (details) {
        details.sort((a, b) => a.gameRank - b.gameRank);
        setMatchDetails(details);
      }
      setLoadingDetails(false);
    }
  };

  return (
    <div className="flex flex-col w-[850px] mb-2 shadow-sm rounded-md overflow-hidden group hover:shadow-md transition-shadow">
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className={`w-full border-l-4 ${borderColor} ${bgColor} flex items-center h-[96px] relative z-10`}
      >
        {/* Left: Rank & Mode */}
        <div className="w-[100px] flex flex-col items-center justify-center border-r border-gray-100 h-full">
          <div className={`text-lg font-black ${rankColor}`}>#{game.gameRank}</div>
          <div className="text-[11px] font-bold text-gray-400 uppercase">{mode}</div>
          <div className="text-[10px] text-gray-400 mt-1">{timeAgo}</div>
        </div>

        {/* Character & Level */}
        <div className="flex items-center px-4 gap-3">
          <div className="relative">
            <ImageSlot size="lg" className="rounded-full border-2 border-white shadow-sm" title={`Character ${game.characterNum}`} />
            <div className="absolute -bottom-1 -right-1 bg-black text-white text-[9px] font-bold px-1 rounded border border-white">
              {game.characterLevel || 0}
            </div>
          </div>
          
          {/* Skills & Traits */}
          <div className="flex flex-col gap-1">
            <div className="flex gap-1">
              <ImageSlot size="sm" className="rounded-md" title={`Weapon ${game.equipment?.["0"] || "None"}`} />
              <ImageSlot size="sm" className="rounded-md" title={`Tactical Skill ${game.tacticalSkillGroup || "None"}`} />
            </div>
            <div className="flex gap-1">
              <ImageSlot size="sm" className="rounded-full" title={`Core Trait ${game.traitFirstCore || "None"}`} />
              <ImageSlot size="sm" className="rounded-full" title={`Sub Trait ${game.traitFirstSub?.[0] || "None"}`} />
            </div>
          </div>
        </div>

        {/* KDA & Damage */}
        <div className="flex flex-col items-center justify-center min-w-[120px] px-4">
          <div className="text-sm font-bold text-gray-800">
            {game.teamKill ?? 0} <span className="text-gray-300 mx-0.5">/</span> {game.playerKill ?? 0} <span className="text-gray-300 mx-0.5">/</span> {game.playerDeaths ?? 0} <span className="text-gray-300 mx-0.5">/</span> {game.playerAssistant ?? 0}
          </div>
          <div className="text-[11px] font-medium text-gray-500 mt-1">
            KDA <span className="text-gray-800 font-bold">{((game.playerKill + game.playerAssistant) / Math.max(1, game.playerDeaths || 1)).toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-400" style={{ width: `${Math.min(100, ((game.damageToPlayer || 0) / 30000) * 100)}%` }} />
            </div>
            <span className="text-[10px] font-bold text-red-500">{(game.damageToPlayer || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="grid grid-cols-3 gap-1">
            {["0", "1", "2", "3", "4", "5"].map((slot) => (
              <ImageSlot key={slot} size="sm" className="rounded-sm bg-gray-50" title={game.equipment?.[slot] ? `Item ${game.equipment[slot]}` : "Empty Slot"} />
            ))}
          </div>
        </div>

        {/* RP Change */}
        <div className="w-[120px] flex flex-col items-center justify-center border-l border-gray-100 h-full">
          <div className={`text-base font-black ${game.mmrGain >= 0 ? "text-red-500" : "text-blue-500"}`}>
            {game.mmrGain >= 0 ? `+${game.mmrGain}` : game.mmrGain}
          </div>
          <div className="text-[11px] font-bold text-gray-400 uppercase">RP</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{game.mmrAfter}</div>
        </div>

        {/* Expand */}
        <div onClick={handleExpand} className="w-8 flex items-center justify-center hover:bg-gray-50 cursor-pointer h-full transition-colors border-l border-gray-100">
          <ChevronRight className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </div>
      </motion.div>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-x border-b border-[#e5e5e5] bg-[#fafafa] rounded-b-md"
          >
            {loadingDetails ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : matchDetails ? (
              <div className="p-4 flex flex-col gap-3">
                {Array.from(new Set(matchDetails.map(m => m.teamNumber))).map(teamNum => {
                  const teamMembers = matchDetails.filter(m => m.teamNumber === teamNum);
                  const teamRank = teamMembers[0].gameRank;
                  return (
                    <div key={teamNum} className="bg-white rounded-md border border-gray-200 overflow-hidden shadow-sm">
                      <div className="flex bg-gray-50 px-4 py-1.5 border-b border-gray-200 items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                        <div className="flex items-center gap-2 text-xs">
                          <span className={teamRank === 1 ? 'text-[#3d95e5]' : 'text-gray-500'}>#{teamRank}</span>
                          <span className="text-gray-400">Team {teamNum}</span>
                        </div>
                        <div className="flex gap-4 pr-1">
                          <span className="w-16 text-center">피해량</span>
                          <span className="w-24 text-center">TK/K/D/A</span>
                          <span className="w-24 text-center">특성/전술</span>
                          <span className="w-32 text-center">착용 아이템</span>
                        </div>
                      </div>
                      {teamMembers.map(member => (
                        <div key={member.userNum} className={`flex items-center justify-between px-4 py-2 border-b last:border-0 border-gray-100 ${member.userNum === game.userNum ? 'bg-blue-50' : ''}`}>
                          <div className="flex items-center gap-3 w-40">
                            <ImageSlot size="md" className="rounded-full shadow-sm" title={`Char ${member.characterNum}`} />
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-gray-800 truncate max-w-[100px]" title={member.nickname}>{member.nickname}</span>
                              <span className="text-[10px] text-gray-500 font-bold">Lv.{member.characterLevel}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-4 items-center">
                            {/* Damage */}
                            <div className="w-16 flex items-center justify-center text-[11px] font-bold text-red-500">
                              {(member.damageToPlayer || 0).toLocaleString()}
                            </div>
                            
                            {/* KDA */}
                            <div className="w-24 flex items-center justify-center text-[11px] font-bold text-gray-600 tracking-wider">
                              {member.teamKill ?? 0}/{member.playerKill ?? 0}/{member.playerDeaths ?? 0}/{member.playerAssistant ?? 0}
                            </div>
                            
                            {/* Traits & Tactical Skills */}
                            <div className="w-24 flex items-center justify-center gap-1">
                              <ImageSlot size="sm" className="rounded-full bg-gray-100" title={`Core Trait ${member.traitFirstCore || "None"}`} />
                              <ImageSlot size="sm" className="rounded-full bg-gray-100" title={`Sub Trait ${member.traitFirstSub?.[0] || "None"}`} />
                              <ImageSlot size="sm" className="rounded-md bg-gray-100 ml-1" title={`Tactical Skill ${member.tacticalSkillGroup || "None"}`} />
                            </div>

                            {/* Items */}
                            <div className="w-32 flex items-center justify-end gap-0.5">
                              {["0", "1", "2", "3", "4"].map((slot) => (
                                <ImageSlot key={slot} size="sm" className="rounded-sm bg-gray-100" title={member.equipment?.[slot] ? `Item ${member.equipment[slot]}` : "Empty"} />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-red-500 font-bold">데이터를 불러오지 못했습니다.</div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import StatsPage from "./StatsPage";

function SearchHome() {
  const [nickname, setNickname] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      navigate(`/er/players/${encodeURIComponent(nickname.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center justify-center py-10 font-sans text-[#333]">
      {/* Top Banner Navigation */}
      <div className="w-[850px] flex justify-end mb-4">
        <Link to="/stats" className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors shadow-sm">
          <BarChart2 className="w-4 h-4" />
          통계 확인 (In 1000)
        </Link>
      </div>

      <div className="w-[850px] mb-8">
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center shadow-lg">
              <Trophy className="text-white w-10 h-10" />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tighter">전적 검색</h1>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Eternal Return Player Stats</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSearch} className="relative group">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="플레이어 닉네임 입력..."
            className="w-full h-16 pl-6 pr-32 bg-white border-2 border-gray-200 rounded-2xl text-xl font-bold focus:border-black focus:outline-none transition-all shadow-sm group-hover:shadow-md"
          />
          <button
            type="submit"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            검색
          </button>
        </form>

        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase mr-2 self-center">추천 검색:</span>
          {TEST_NICKNAMES.slice(0, 8).map((name) => (
            <button
              key={name}
              onClick={() => navigate(`/er/players/${encodeURIComponent(name)}`)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-bold text-gray-600 transition-colors"
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlayerProfile() {
  const { nickname } = useParams<{ nickname: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [player, setPlayer] = useState<Player | null>(null);
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<number | undefined>(undefined);

  const fetchPlayerData = useCallback(async (targetNickname: string) => {
    setLoading(true);
    setError(null);
    try {
      const playerData = await erApi.getPlayerByNickname(targetNickname);
      if (playerData) {
        setPlayer(playerData);
        
        // Add a 1 second delay to prevent 429 Too Many Requests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const gameData = await erApi.getGames(playerData.userId);
        if (gameData) {
          setGames(gameData.userGames);
          setNext(gameData.next);
        }
      } else {
        setError("플레이어를 찾을 수 없습니다.");
        setPlayer(null);
        setGames([]);
      }
    } catch (err) {
      setError("데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (nickname) {
      fetchPlayerData(nickname);
      setSearchInput(nickname);
    }
  }, [nickname, fetchPlayerData]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      navigate(`/er/players/${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const loadMore = async () => {
    if (!player || !next || loading) return;
    setLoading(true);
    try {
      const gameData = await erApi.getGames(player.userId, next);
      if (gameData) {
        setGames(prev => [...prev, ...gameData.userGames]);
        setNext(gameData.next);
      }
    } catch (err) {
      setError("추가 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center py-10 font-sans text-[#333]">
      {/* Header with small search */}
      <div className="w-[850px] mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">ER STATS</h1>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="relative w-[400px]">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="다른 플레이어 검색..."
            className="w-full h-12 pl-4 pr-12 bg-white border-2 border-gray-200 rounded-xl text-sm font-bold focus:border-black focus:outline-none transition-all shadow-sm"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2">
            <Search className="w-5 h-5 text-gray-400 hover:text-black transition-colors" />
          </button>
        </form>
      </div>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-[850px] mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600 font-bold"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Player Info Summary */}
      {player && (
        <div className="w-[850px] mb-6 flex items-center justify-between p-6 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center border-4 border-gray-50 shadow-inner">
              <Users className="w-10 h-10 text-gray-300" />
            </div>
            <div>
              <div className="text-3xl font-black tracking-tight">{player.nickname}</div>
              <div className="text-sm font-bold text-gray-400 mt-1">Player ID: {player.userId}</div>
            </div>
          </div>
          <button
            onClick={() => nickname && fetchPlayerData(nickname)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            전적 갱신
          </button>
        </div>
      )}

      {/* Match List */}
      <div className="flex flex-col">
        {games.length > 0 && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-500">최근 매치 기록</span>
          </div>
        )}
        {games.map((game, idx) => (
          <MatchCard key={`${game.gameId}-${idx}`} game={game} />
        ))}
      </div>

      {/* Load More */}
      {next && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-6 w-[850px] py-4 bg-white border-2 border-gray-200 rounded-2xl text-sm font-black text-gray-500 hover:border-black hover:text-black transition-all shadow-sm flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "매치 더 불러오기"}
        </button>
      )}

      {/* Empty State */}
      {!loading && games.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Search className="w-16 h-16 mb-4 opacity-20" />
          <p className="font-bold">검색 결과가 없습니다.</p>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchHome />} />
        <Route path="/er/players/:nickname" element={<PlayerProfile />} />
        <Route path="/stats" element={<StatsPage />} />
      </Routes>
    </BrowserRouter>
  );
}
