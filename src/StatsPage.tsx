import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trophy, BarChart2, Loader2, ArrowLeft } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

const WEAPON_NAMES: Record<number, string> = {
  1: "글러브",
  2: "톤파",
  3: "방망이",
  4: "채찍",
  5: "투척",
  6: "암기",
  7: "활",
  8: "석궁",
  9: "권총",
  10: "돌격 소총",
  11: "저격총",
  13: "망치",
  14: "도끼",
  15: "단검",
  16: "양손검",
  18: "쌍검",
  19: "창",
  20: "쌍절곤",
  21: "레이피어",
  22: "기타",
  23: "카메라",
  24: "아르카나",
  25: "VF의수",
};

const CHARACTER_NAMES: Record<number, string> = {
  0: "무작위", 1: "재키", 2: "아야", 3: "피오라", 4: "매그너스", 5: "자히르", 6: "나딘", 7: "현우", 8: "하트", 9: "아이솔", 10: "리 다이린", 11: "유키", 12: "혜진", 13: "쇼우", 14: "키아라", 15: "시셀라", 16: "실비아", 17: "아드리아나", 18: "쇼이치", 19: "엠마", 20: "레녹스", 21: "로지", 22: "루크", 23: "캐시", 24: "아델라", 25: "버니스", 26: "바바라", 27: "알렉스", 28: "수아", 29: "레온",
  30: "일레븐", 31: "리오", 32: "윌리엄", 33: "니키", 34: "나타폰", 35: "얀", 36: "이바", 37: "다니엘", 38: "제니", 39: "카밀로", 40: "클로에", 41: "요한", 42: "비앙카", 43: "셀린", 44: "에키온", 45: "마이", 46: "에이든", 47: "라우라", 48: "띠아", 49: "펠릭스", 50: "엘레나", 51: "프리야", 52: "아디나", 53: "마커스", 54: "칼라", 55: "에스텔", 56: "피올로", 57: "마르티나", 58: "헤이즈", 59: "아이작",
  60: "타지아", 61: "이렘", 62: "테오도르", 63: "이안", 64: "바냐", 65: "데비&마를렌", 66: "아르다", 67: "아비게일", 68: "알론소", 69: "레니", 70: "츠바메", 71: "케네스", 72: "카티야", 73: "샬럿", 74: "다르코", 75: "르노어", 76: "가넷", 77: "유민", 78: "히스이", 79: "유스티나", 80: "이슈트반", 81: "니아", 82: "슈린", 83: "헨리", 84: "블레어", 85: "미르카", 86: "펜리르", 87: "코렐라인",
  9998: "Dr. 하나", 9999: "나쟈"
};

export default function StatsPage() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [selectedWeapon, setSelectedWeapon] = useState<number | null>(null);
  
  useEffect(() => {
    fetch("/api/stats/summary")
      .then(res => res.json())
      .then(data => {
        setStats(data);
        if (data.length > 0) {
          const sortedChars = Array.from(new Set(data.map((s: any) => s.characterNum))).sort((a, b) => {
            const nameA = CHARACTER_NAMES[a as number] || `캐릭터 #${a}`;
            const nameB = CHARACTER_NAMES[b as number] || `캐릭터 #${b}`;
            return nameA.localeCompare(nameB);
          });
          const firstChar = sortedChars[0];
          const sortedWeapons = Array.from(new Set(data.filter((s: any) => s.characterNum === firstChar).map((s: any) => s.bestWeapon))).sort((a, b) => {
            const nameA = WEAPON_NAMES[a as number] || `무기군 #${a}`;
            const nameB = WEAPON_NAMES[b as number] || `무기군 #${b}`;
            return nameA.localeCompare(nameB);
          });
          
          setSelectedCharacter(firstChar as number);
          setSelectedWeapon(sortedWeapons[0] as number);
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const characters = Array.from(new Set(stats.map(s => s.characterNum))).sort((a, b) => {
    const nameA = CHARACTER_NAMES[a as number] || `캐릭터 #${a}`;
    const nameB = CHARACTER_NAMES[b as number] || `캐릭터 #${b}`;
    return nameA.localeCompare(nameB);
  });
  const weaponsForChar = selectedCharacter 
    ? Array.from(new Set(stats.filter(s => s.characterNum === selectedCharacter).map(s => s.bestWeapon))).sort((a, b) => {
        const nameA = WEAPON_NAMES[a as number] || `무기군 #${a}`;
        const nameB = WEAPON_NAMES[b as number] || `무기군 #${b}`;
        return nameA.localeCompare(nameB);
      })
    : [];

  const currentStat = stats.find(s => s.characterNum === selectedCharacter && s.bestWeapon === selectedWeapon);

  const radarData = currentStat ? [
    { subject: `TK 평균`, A: currentStat.avgTeamKill * 10, value: currentStat.avgTeamKill.toFixed(1), fullMark: 100 },
    { subject: `승률`, A: currentStat.winRate, value: `${currentStat.winRate.toFixed(1)}%`, fullMark: 100 },
    { subject: `유저 딜량`, A: Math.min(100, (currentStat.avgDamageToPlayer / 30000) * 100), value: Math.round(currentStat.avgDamageToPlayer).toLocaleString(), fullMark: 100 },
    { subject: `동물 딜량`, A: Math.min(100, (currentStat.avgDamageToMonster / 50000) * 100), value: Math.round(currentStat.avgDamageToMonster).toLocaleString(), fullMark: 100 },
    { subject: `RP 획득량`, A: Math.max(0, Math.min(100, (currentStat.avgMmrGain + 50) * 0.66)), value: Math.round(currentStat.avgMmrGain).toString(), fullMark: 100 },
    { subject: `시야 점수`, A: Math.min(100, currentStat.avgViewContribution), value: Math.round(currentStat.avgViewContribution).toString(), fullMark: 100 },
  ] : [];

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col items-center py-10 font-sans text-[#333]">
      <div className="w-[1000px] mb-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg">
            <Trophy className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter">ER STATS</h1>
          </div>
        </Link>
        <Link to="/" className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-black">
          <ArrowLeft className="w-4 h-4" />
          전적 검색으로 돌아가기
        </Link>
      </div>

      <div className="w-[1000px] bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-black" />
            <h2 className="text-xl font-bold tracking-tight">상위 1000명 통계 (최근 14일)</h2>
          </div>
          {currentStat && (
            <div className="text-sm font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
              집계된 게임 수: <span className="text-black font-black">{currentStat.matchCount}</span>건
            </div>
          )}
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : stats.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500">
            <p className="font-bold">통계 데이터가 없습니다.</p>
            <button 
              onClick={() => fetch("/api/jobs/sync-top-rankers", { method: "POST" })}
              className="mt-4 px-4 py-2 bg-black text-white text-sm font-bold rounded-lg hover:bg-gray-800"
            >
              데이터 수집 시작 (백그라운드)
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">캐릭터 선택</label>
                <select 
                  className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 font-bold"
                  value={selectedCharacter || ""}
                  onChange={e => {
                    const char = Number(e.target.value);
                    setSelectedCharacter(char);
                    const weaps = Array.from(new Set(stats.filter(s => s.characterNum === char).map(s => s.bestWeapon))).sort((a, b) => {
                      const nameA = WEAPON_NAMES[a as number] || `무기군 #${a}`;
                      const nameB = WEAPON_NAMES[b as number] || `무기군 #${b}`;
                      return nameA.localeCompare(nameB);
                    });
                    setSelectedWeapon(weaps[0] || null);
                  }}
                >
                  {characters.map(c => (
                    <option key={c} value={c}>{CHARACTER_NAMES[c as number] || `캐릭터 #${c}`}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">무기군 선택</label>
                <select 
                  className="w-full h-12 border-2 border-gray-200 rounded-xl px-4 font-bold"
                  value={selectedWeapon || ""}
                  onChange={e => setSelectedWeapon(Number(e.target.value))}
                >
                  {weaponsForChar.map(w => (
                    <option key={w} value={w}>{WEAPON_NAMES[w as number] || `무기군 #${w}`}</option>
                  ))}
                </select>
              </div>
            </div>

            {currentStat && (
              <div className="flex flex-col gap-6 mt-4">
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={350}>
                    <RadarChart cx="50%" cy="50%" outerRadius="65%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={({ payload, x, y, textAnchor, stroke, radius }) => {
                          return (
                            <text x={x} y={y} textAnchor={textAnchor} fill="#666" className="text-[11px] font-bold">
                              <tspan x={x} dy="0">{payload.value}</tspan>
                              <tspan x={x} dy="1.2em" fill="#000" className="text-[13px] font-black">
                                {radarData.find(d => d.subject === payload.value)?.value}
                              </tspan>
                            </text>
                          );
                        }} 
                      />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar name="Stats" dataKey="A" stroke="#000" fill="#000" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                      <thead className="bg-gray-50 text-gray-500 uppercase font-bold text-[11px] tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-right">TK 평균</th>
                          <th className="px-4 py-3 text-right">승률</th>
                          <th className="px-4 py-3 text-right">플레이어 딜량</th>
                          <th className="px-4 py-3 text-right">야생동물 딜량</th>
                          <th className="px-4 py-3 text-right">RP 획득량</th>
                          <th className="px-4 py-3 text-right">시야 점수</th>
                          <th className="px-4 py-3 text-right">TOP3 비율</th>
                          <th className="px-4 py-3 text-right">RP 획득률</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        <tr className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-right text-black">{currentStat.avgTeamKill.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right text-blue-600">{currentStat.winRate.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right text-red-500">{Math.round(currentStat.avgDamageToPlayer).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-orange-500">{Math.round(currentStat.avgDamageToMonster).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right text-black">{Math.round(currentStat.avgMmrGain)}</td>
                          <td className="px-4 py-3 text-right text-gray-800">{Math.round(currentStat.avgViewContribution)}</td>
                          <td className="px-4 py-3 text-right text-indigo-600">{currentStat.top3Rate.toFixed(1)}%</td>
                          <td className="px-4 py-3 text-right text-green-600">{currentStat.positiveMmrRate.toFixed(1)}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
