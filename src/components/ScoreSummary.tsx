import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import { Trophy, Coins, Home, Star, User, Loader2, History, Calendar, Zap, CheckSquare as CheckSquareIcon, Square as SquareIcon, Clock, Sword, Cuboid } from 'lucide-react';
import { calculateScore } from '../utils/scoring';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { subscribeToGlobalStats, GlobalStats } from '../services/statsService';
import { userService } from '../services/userService';
import { Users, PlayCircle, Medal } from 'lucide-react';

interface Props {
  gameState: GameState;
  onPlayAgain: () => void;
  onClose: () => void;
  onContinueToEraII?: () => void;
  viewOnly?: boolean;
  userRole?: string | null;
}

interface GameHistoryEntry {
  id: string;
  userId: string;
  gameId: string;
  score: number;
  timestamp: any;
  cheatsUsed: boolean;
  gameType: string;
}

export const ScoreSummary: React.FC<Props> = ({ gameState, onPlayAgain, onClose, onContinueToEraII, viewOnly = false, userRole }) => {
  const { 
    totalVP, 
    era1Score, era1RoomVP, era1GoldVP,
    era2Score, era2RoomVP, era2WeaponVP, era2GoldVP, era2IronVP 
  } = calculateScore(gameState);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [userStats, setUserStats] = useState<{ gamesFinished: number } | null>(null);
  const [showCheats, setShowCheats] = useState(true);

  useEffect(() => {
    if (auth.currentUser) {
      userService.getUserStats(auth.currentUser.uid).then(setUserStats);
    }
  }, [auth.currentUser]);

  const [activeTab, setActiveTab] = useState<string>(
    gameState.uiState.gameType === 'ERA_II_DRAFT' ? 'ERA_II' : (gameState.uiState.gameType || 'ERA_I')
  );

  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const unsubStats = subscribeToGlobalStats(setGlobalStats);
    return () => unsubStats();
  }, [isAdmin]);

  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoadingHistory(false);
      return;
    }

    setIsLoadingHistory(true);
    let currentUnsub: (() => void) | undefined;

    const setupListener = () => {
      // Filter by activeTab
      const gameTypes = activeTab === 'ERA_II' ? ['ERA_II', 'ERA_II_DRAFT'] : [activeTab];
      const q = query(
        collection(db, 'game_logs'), 
        where('userId', '==', auth.currentUser!.uid),
        where('gameType', 'in', gameTypes),
        orderBy('score', 'desc'),
        limit(10)
      );
      
      currentUnsub = onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameHistoryEntry[];
        
        const sortedEntries = [...entries].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
          const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
          return timeB - timeA;
        });
        
        setHistory(sortedEntries);
        setIsLoadingHistory(false);
      }, (error) => {
        console.error("History error:", error);
        
        // Fallback: If the ordered query fails (likely due to missing index),
        // try a simpler query and sort client-side.
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          if (currentUnsub) currentUnsub();
          
          const gameTypes = activeTab === 'ERA_II' ? ['ERA_II', 'ERA_II_DRAFT'] : [activeTab];
          const fallbackQ = query(
            collection(db, 'game_logs'),
            where('userId', '==', auth.currentUser!.uid),
            where('gameType', 'in', gameTypes),
            limit(100)
          );
          
          currentUnsub = onSnapshot(fallbackQ, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as GameHistoryEntry[];
            
            const sortedEntries = [...entries].sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              const timeA = a.timestamp?.toMillis?.() || a.timestamp?.seconds * 1000 || 0;
              const timeB = b.timestamp?.toMillis?.() || b.timestamp?.seconds * 1000 || 0;
              return timeB - timeA;
            });
            
            setHistory(sortedEntries.slice(0, 10));
            setIsLoadingHistory(false);
          }, (fallbackError) => {
            console.error("Fallback history error:", fallbackError);
            setIsLoadingHistory(false);
          });
        } else {
          setIsLoadingHistory(false);
        }
      });
    };

    setupListener();

    return () => {
      if (currentUnsub) currentUnsub();
    };
  }, [auth.currentUser, activeTab]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      if (typeof timestamp.toDate === 'function') {
        const date = timestamp.toDate();
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (timestamp.seconds) {
        const date = new Date(timestamp.seconds * 1000);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      const date = new Date(timestamp);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Unknown date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[500] p-4 overflow-y-auto">
      <div className="bg-stone-800 border-2 border-orange-500/50 rounded-2xl p-8 max-w-4xl w-full shadow-2xl my-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4 border border-orange-500/50">
              <Trophy className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-3xl font-bold text-stone-100">{gameState.uiState.mode === 'GAME_OVER' ? 'Game Over' : 'Current Standing'}</h2>
            <p className="text-stone-400 mt-2">{gameState.uiState.mode === 'GAME_OVER' ? 'Final Score Breakdown' : 'Your progress so far'}</p>
          </div>

          <div className="space-y-6 mb-8">
            {/* Era I Section */}
            <div className="bg-stone-900/40 rounded-xl border border-stone-700/50 overflow-hidden">
              <div className="bg-stone-700/30 px-4 py-2 border-b border-stone-700/50 flex items-center gap-2">
                <Clock className="w-4 h-4 text-orange-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Era I: The Stone Age</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex justify-between items-center text-stone-300">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-blue-400" />
                    <span className="text-sm">Room VP</span>
                  </div>
                  <span className="font-mono font-bold">{era1RoomVP}</span>
                </div>
                <div className="flex justify-between items-center text-stone-300">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm">Gold (1 VP each)</span>
                  </div>
                  <span className="font-mono font-bold">{era1GoldVP}</span>
                </div>
                <div className="pt-2 border-t border-stone-700/50 flex justify-between items-center">
                  <span className="text-sm font-bold text-orange-200">Era I Score</span>
                  <span className="text-xl font-black text-orange-400">{era1Score}</span>
                </div>
              </div>
            </div>

            {/* Era II Section */}
            {gameState.era === 2 && (
              <div className="bg-stone-900/40 rounded-xl border border-stone-700/50 overflow-hidden">
                <div className="bg-stone-700/30 px-4 py-2 border-b border-stone-700/50 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-stone-400">Era II: The Iron Age</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-stone-300">
                    <div className="flex items-center gap-2">
                      <Home className="w-4 h-4 text-blue-400" />
                      <span className="text-sm">Room VP</span>
                    </div>
                    <span className="font-mono font-bold">{era2RoomVP}</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-300">
                    <div className="flex items-center gap-2">
                      <Sword className="w-4 h-4 text-red-400" />
                      <span className="text-sm">Weapon (1 VP each)</span>
                    </div>
                    <span className="font-mono font-bold">{era2WeaponVP}</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-300">
                    <div className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm">Gold (0.5 VP each)</span>
                    </div>
                    <span className="font-mono font-bold">{era2GoldVP}</span>
                  </div>
                  <div className="flex justify-between items-center text-stone-300">
                    <div className="flex items-center gap-2">
                      <Cuboid className="w-4 h-4 text-blue-300" />
                      <span className="text-sm">Iron (0.5 VP each)</span>
                    </div>
                    <span className="font-mono font-bold">{era2IronVP}</span>
                  </div>
                  <div className="pt-2 border-t border-stone-700/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-purple-200">Era II Score</span>
                    <span className="text-xl font-black text-purple-400">{era2Score}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-orange-900/20 rounded-xl border border-orange-500/30 mb-8">
            <div className="flex items-center justify-between">
              <span className="text-xl font-bold text-orange-200">Total Score</span>
              <span className="text-4xl font-black text-orange-400">{totalVP}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {gameState.uiState.mode === 'GAME_OVER' && gameState.era === 1 && onContinueToEraII && (
              <button
                onClick={onContinueToEraII}
                className="w-full py-4 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2 border border-purple-500/20"
              >
                <Zap className="w-5 h-5" />
                Continue to Era II
              </button>
            )}
            {gameState.uiState.mode === 'GAME_OVER' && (
              <button
                onClick={onPlayAgain}
                className="w-full py-4 bg-stone-700 hover:bg-stone-600 text-white font-bold rounded-xl transition-colors shadow-lg border border-orange-500/20"
              >
                Play Again
              </button>
            )}
            <button
              onClick={onClose}
              className={`w-full py-3 font-medium rounded-xl transition-colors border ${
                gameState.uiState.mode !== 'GAME_OVER' 
                  ? 'bg-orange-600 hover:bg-orange-500 text-white border-orange-500' 
                  : 'bg-stone-700 hover:bg-stone-600 text-stone-200 border-stone-600'
              }`}
            >
              {gameState.uiState.mode !== 'GAME_OVER' ? 'Back to Game' : 'Review Board'}
            </button>
          </div>
        </div>

        <div className="flex-1 border-l border-stone-700 pl-0 md:pl-8 pt-8 md:pt-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-orange-400" />
              <h3 className="text-xl font-bold text-stone-100">High Scores</h3>
            </div>
            {auth.currentUser && (
              <button 
                onClick={() => setShowCheats(!showCheats)}
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-500 hover:text-stone-300 transition-colors"
              >
                {showCheats ? <CheckSquareIcon className="w-3.5 h-3.5 text-orange-500" /> : <SquareIcon className="w-3.5 h-3.5" />}
                Show Cheats
              </button>
            )}
          </div>

          <div className="flex gap-1 mb-4 bg-stone-900/80 p-1 rounded-lg border border-stone-700">
            {[
              { id: 'ERA_I', label: 'Era I' },
              { id: 'ERA_II', label: 'Era II' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
                  activeTab === tab.id
                    ? 'bg-stone-700 text-orange-400 shadow-sm'
                    : 'text-stone-500 hover:text-stone-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {!auth.currentUser ? (
            <div className="bg-stone-900/50 rounded-xl p-6 text-center border border-stone-700">
              <User className="w-12 h-12 text-stone-600 mx-auto mb-3" />
              <p className="text-stone-400 text-sm mb-4">Sign in to save your scores and see your high scores!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-stone-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No high scores yet.</p>
                </div>
              ) : (
                history
                  .filter(entry => showCheats || !entry.cheatsUsed)
                  .map((entry, idx) => {
                    const isCurrentGame = entry.gameId === gameState.gameId;
                    return (
                      <div 
                        key={entry.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          isCurrentGame 
                            ? 'bg-orange-900/40 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
                            : 'bg-stone-900/50 border-stone-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 text-center font-bold ${
                            idx === 0 ? 'text-yellow-400' : 
                            idx === 1 ? 'text-stone-300' : 
                            idx === 2 ? 'text-orange-400' : 'text-stone-500'
                          }`}>
                            {idx + 1}
                          </span>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="text-stone-400 text-[10px]">
                                {formatDate(entry.timestamp)}
                              </span>
                              {entry.gameType === 'ERA_II_DRAFT' && (
                                <span className="text-[8px] font-bold text-purple-400 uppercase tracking-wider bg-purple-400/10 px-1.5 py-0.5 rounded">
                                  Draft
                                </span>
                              )}
                              {entry.cheatsUsed && (
                                <span className="text-[8px] font-bold text-yellow-500 uppercase tracking-wider bg-yellow-500/10 px-1.5 py-0.5 rounded">
                                  Cheats
                                </span>
                              )}
                            </div>
                            <span className={`font-medium ${isCurrentGame ? 'text-orange-200' : 'text-stone-200'}`}>
                              Score: <span className={`font-bold ${isCurrentGame ? 'text-orange-400' : 'text-orange-400'}`}>{entry.score}</span>
                            </span>
                          </div>
                        </div>
                        {isCurrentGame && (
                          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider bg-orange-400/10 px-2 py-0.5 rounded">
                            Current Game
                          </span>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {((globalStats && isAdmin) || userStats) && (
            <div className="mt-8 pt-6 border-t border-stone-700 space-y-6">
              {userStats && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <Medal className="w-4 h-4 text-orange-400" />
                    <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Your Career</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-stone-900/40 p-3 rounded-lg border border-orange-500/20">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">Games Completed</span>
                      </div>
                      <div className="text-lg font-black text-orange-400 tracking-tight">
                        {userStats.gamesFinished.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {globalStats && isAdmin && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <History className="w-4 h-4 text-stone-500" />
                    <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">Global Statistics</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-stone-900/40 p-3 rounded-lg border border-stone-700/50">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">Total Visits</span>
                      </div>
                      <div className="text-lg font-black text-stone-300 tracking-tight">
                        {globalStats.visits.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-stone-900/40 p-3 rounded-lg border border-stone-700/50">
                      <div className="flex items-center gap-2 text-stone-500 mb-1">
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-bold uppercase tracking-tight">Games Finished</span>
                      </div>
                      <div className="text-lg font-black text-stone-300 tracking-tight">
                        {globalStats.gamesFinished.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
