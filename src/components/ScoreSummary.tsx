import React, { useEffect, useState } from 'react';
import { GameState } from '../types/game';
import { Trophy, Coins, Home, Star, User, Loader2, History, Calendar, Zap, CheckSquare as CheckSquareIcon, Square as SquareIcon } from 'lucide-react';
import { calculateScore } from '../utils/scoring';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { subscribeToGlobalStats, GlobalStats } from '../services/statsService';
import { Users, PlayCircle } from 'lucide-react';

interface Props {
  gameState: GameState;
  onPlayAgain: () => void;
  onClose: () => void;
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
}

export const ScoreSummary: React.FC<Props> = ({ gameState, onPlayAgain, onClose, viewOnly = false, userRole }) => {
  const { baseVP, goldVP, bonusVP, totalVP, bonusDetails } = calculateScore(gameState);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [showCheats, setShowCheats] = useState(true);

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

    let currentUnsub: (() => void) | undefined;

    const setupListener = () => {
      // We want to show the top scores. 
      // Note: This query requires a composite index on userId and score.
      const q = query(
        collection(db, 'game_logs'), 
        where('userId', '==', auth.currentUser!.uid),
        orderBy('score', 'desc'),
        limit(20)
      );
      
      currentUnsub = onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as GameHistoryEntry[];
        
        const sortedEntries = [...entries].sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          const timeA = a.timestamp?.toMillis?.() || 0;
          const timeB = b.timestamp?.toMillis?.() || 0;
          return timeB - timeA;
        });
        
        setHistory(sortedEntries.slice(0, 10));
        setIsLoadingHistory(false);
      }, (error) => {
        console.error("History error:", error);
        
        // Fallback: If the ordered query fails (likely due to missing index),
        // try a simpler query and sort client-side.
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          if (currentUnsub) currentUnsub();
          
          const fallbackQ = query(
            collection(db, 'game_logs'),
            where('userId', '==', auth.currentUser!.uid),
            limit(500)
          );
          
          currentUnsub = onSnapshot(fallbackQ, (snapshot) => {
            const entries = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as GameHistoryEntry[];
            
            const sortedEntries = [...entries].sort((a, b) => {
              if (b.score !== a.score) return b.score - a.score;
              const timeA = a.timestamp?.toMillis?.() || 0;
              const timeB = b.timestamp?.toMillis?.() || 0;
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
  }, [auth.currentUser]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-stone-800 border-2 border-orange-500/50 rounded-2xl p-8 max-w-4xl w-full shadow-2xl my-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mb-4 border border-orange-500/50">
              <Trophy className="w-8 h-8 text-orange-400" />
            </div>
            <h2 className="text-3xl font-bold text-stone-100">{gameState.uiState.mode === 'GAME_OVER' ? 'Game Over' : 'Current Standing'}</h2>
            <p className="text-stone-400 mt-2">{gameState.uiState.mode === 'GAME_OVER' ? 'Final Score Breakdown' : 'Your progress so far'}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg border border-stone-700">
              <div className="flex items-center gap-3 text-stone-300">
                <Home className="w-5 h-5 text-blue-400" />
                <span>Furnished Rooms</span>
              </div>
              <span className="font-bold text-xl text-stone-100">{baseVP}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-900/50 rounded-lg border border-stone-700">
              <div className="flex items-center gap-3 text-stone-300">
                <Coins className="w-5 h-5 text-yellow-400" />
                <span>Gold (1 VP each)</span>
              </div>
              <span className="font-bold text-xl text-stone-100">{goldVP}</span>
            </div>

            {bonusDetails.length > 0 && (
              <div className="p-3 bg-stone-900/50 rounded-lg border border-stone-700 space-y-2">
                <div className="flex items-center gap-3 text-stone-300 mb-3">
                  <Star className="w-5 h-5 text-purple-400" />
                  <span>End Game Bonuses</span>
                </div>
                {bonusDetails.map((bonus, idx) => (
                  <div key={idx} className="flex justify-between text-sm pl-8">
                    <span className="text-stone-400">{bonus.name}</span>
                    <span className="font-bold text-stone-200">+{bonus.vp}</span>
                  </div>
                ))}
                <div className="flex justify-between border-t border-stone-700 pt-2 mt-2 pl-8">
                  <span className="text-stone-300 font-medium">Total Bonus</span>
                  <span className="font-bold text-lg text-purple-400">{bonusVP}</span>
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
            {gameState.uiState.mode === 'GAME_OVER' && (
              <button
                onClick={onPlayAgain}
                className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl transition-colors shadow-lg"
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
          <div className="flex items-center justify-between mb-6">
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
                              {entry.cheatsUsed && (
                                <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" title="Cheats used" />
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

          {globalStats && isAdmin && (
            <div className="mt-8 pt-6 border-t border-stone-700">
              <div className="flex items-center gap-3 mb-4">
                <History className="w-5 h-5 text-stone-500" />
                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Global Statistics</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-stone-900/40 p-3 rounded-lg border border-stone-700/50">
                  <div className="flex items-center gap-2 text-stone-500 mb-1">
                    <Users className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Total Visits</span>
                  </div>
                  <div className="text-xl font-black text-stone-300 tracking-tight">
                    {globalStats.visits.toLocaleString()}
                  </div>
                </div>
                <div className="bg-stone-900/40 p-3 rounded-lg border border-stone-700/50">
                  <div className="flex items-center gap-2 text-stone-500 mb-1">
                    <PlayCircle className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-tighter">Games Finished</span>
                  </div>
                  <div className="text-xl font-black text-stone-300 tracking-tight">
                    {globalStats.gamesFinished.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
