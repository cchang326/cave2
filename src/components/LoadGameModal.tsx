import React, { useEffect, useState } from 'react';
import { GameSave, saveService } from '../services/saveService';
import { X, Clock, Trophy, Play } from 'lucide-react';

interface Props {
  currentSlotId: string | null;
  onLoad: (slotId: string, save?: GameSave) => void;
  onClose: () => void;
}

export const LoadGameModal: React.FC<Props> = ({ currentSlotId, onLoad, onClose }) => {
  const [saves, setSaves] = useState<GameSave[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSaves = async () => {
      const fetchedSaves = await saveService.getSaves();
      setSaves(fetchedSaves);
      setLoading(false);
    };
    fetchSaves();
  }, []);

  const SLOTS = ['slot1', 'slot2', 'slot3'];

  const sortedSlots = [...SLOTS].sort((a, b) => {
    const saveA = saves.find(s => s.id === a);
    const saveB = saves.find(s => s.id === b);

    if (saveA && saveB) {
      const timeA = saveA.updatedAt?.toMillis?.() || (saveA.updatedAt as any)?.seconds * 1000 || 0;
      const timeB = saveB.updatedAt?.toMillis?.() || (saveB.updatedAt as any)?.seconds * 1000 || 0;
      return timeB - timeA;
    }
    if (saveA) return -1;
    if (saveB) return 1;
    return a.localeCompare(b);
  });

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toLocaleString();
      }
      // Fallback for serialized timestamps
      if (timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toLocaleString();
      }
      return 'Unknown Date';
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Unknown Date';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-stone-800 border-4 border-stone-600 rounded-2xl p-8 max-w-2xl w-full shadow-2xl transform animate-in fade-in zoom-in duration-300 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <h2 className="text-2xl font-black text-stone-200 uppercase tracking-tighter mb-6 text-center">Load Game</h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-400"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {sortedSlots.map((slotId) => {
              const save = saves.find(s => s.id === slotId);
              const slotNum = slotId.replace('slot', '');

              if (!save) {
                const isActive = slotId === currentSlotId;
                return (
                  <button
                    key={slotId}
                    onClick={() => onLoad(slotId)}
                    className={`group flex items-center justify-between p-6 bg-stone-800/50 hover:bg-stone-700/50 border-2 border-dashed ${isActive ? 'border-orange-500' : 'border-stone-600'} hover:border-orange-500/50 rounded-xl transition-all text-left`}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold uppercase text-sm ${isActive ? 'text-orange-400' : 'text-stone-500'}`}>
                          Slot {slotNum} {isActive && '(Current)'}
                        </span>
                        <span className="bg-stone-800 text-stone-600 text-[10px] px-2 py-0.5 rounded uppercase font-bold italic">Empty</span>
                      </div>
                      <div className="text-xs text-stone-600">
                        Select this slot to start a new game
                      </div>
                    </div>
                    <div className="bg-stone-800 p-2 rounded-lg group-hover:bg-stone-600 transition-colors">
                      <Play className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-stone-700'} group-hover:text-stone-400`} />
                    </div>
                  </button>
                );
              }

              const isActive = save.id === currentSlotId;
              return (
                <button
                  key={save.id}
                  onClick={() => onLoad(save.id, save)}
                  className={`group flex items-center justify-between p-6 bg-stone-700 hover:bg-stone-600 border-2 ${isActive ? 'border-orange-500' : 'border-stone-600'} hover:border-orange-500 rounded-xl transition-all text-left`}
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold uppercase text-sm ${isActive ? 'text-orange-400' : 'text-stone-200'}`}>
                        Slot {slotNum} {isActive && '(Current)'}
                      </span>
                      {save.isGameOver ? (
                        <span className="bg-stone-800 text-stone-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold">Finished</span>
                      ) : (
                        <span className="bg-green-900/50 text-green-400 text-[10px] px-2 py-0.5 rounded uppercase font-bold">In Progress</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-stone-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(save.updatedAt)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Play className="w-3 h-3" />
                        Round {save.metadata.round}, Turn {save.metadata.turn}
                      </div>
                      {save.isGameOver && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Trophy className="w-3 h-3" />
                          Score: {save.metadata.score}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-stone-800 p-2 rounded-lg group-hover:bg-orange-600 transition-colors">
                    <Play className="w-5 h-5 text-stone-400 group-hover:text-white" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
