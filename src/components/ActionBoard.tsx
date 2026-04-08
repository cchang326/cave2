import React from 'react';
import { ActionBoardState } from '../types/game';
import { IconicDescription } from './IconicDescription';

interface Props {
  board: ActionBoardState;
  activeActionTile?: string;
  showIconicDescription?: boolean;
  disabled?: boolean;
  onTakeAction: (actionId: string) => void;
}

export const ActionBoard: React.FC<Props> = ({ 
  board, 
  activeActionTile, 
  showIconicDescription = true, 
  disabled = false,
  onTakeAction 
}) => {
  return (
    <div className="bg-stone-800 p-4 rounded-xl shadow-lg border border-stone-700 w-full max-w-full overflow-hidden">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <h2 className="text-stone-300 text-sm font-bold uppercase tracking-wider">Action Board</h2>
          <div className="flex items-center gap-3">
            <div className="bg-stone-900 px-2 py-1 rounded border border-stone-700 flex items-center gap-2">
              <span className="text-stone-400 text-[10px] uppercase">Round</span>
              <span className="text-orange-400 font-bold text-sm">{board.round} / {board.totalRounds}</span>
            </div>
            <div className="bg-stone-900 px-2 py-1 rounded border border-stone-700 flex items-center gap-2">
              <span className="text-stone-400 text-[10px] uppercase">Turn</span>
              <span className="text-orange-400 font-bold text-sm">{board.turn} / {board.maxTurns}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x custom-scrollbar max-w-full w-full">
        {board.availableActions.map(action => {
          const isUsed = board.usedActionsThisRound.includes(action.id);
          const isActive = activeActionTile === action.id;
          return (
            <button
              key={action.id}
              disabled={disabled || isUsed || isActive}
              onClick={() => onTakeAction(action.id)}
              title={action.description}
              className={`w-32 h-32 p-0.5 rounded-lg border-2 text-center transition-all flex flex-col items-center justify-start flex-shrink-0 snap-start relative
                ${isUsed 
                  ? 'bg-stone-300 border-stone-400 opacity-60 cursor-not-allowed' 
                  : isActive
                  ? 'bg-orange-100 border-orange-500 ring-4 ring-orange-500/30 cursor-default'
                  : 'bg-stone-200 border-stone-400 hover:border-orange-400 hover:bg-stone-50 cursor-pointer shadow-md'
                }`}
            >
              <div className={`w-full py-1.5 px-1 rounded-t-md flex items-center justify-center -mt-0.5 -mx-0.5 ${isUsed ? 'bg-stone-500' : isActive ? 'bg-orange-600' : 'bg-stone-800'} text-stone-100`}>
                <span className="font-bold text-[11px] leading-tight truncate">{action.name}</span>
              </div>
              <div className="flex-1 w-full flex flex-col justify-center items-center px-1.5 pb-1">
                {showIconicDescription && action.iconicDescription ? (
                  <IconicDescription 
                    description={action.iconicDescription.replace(/\?/g, board.maxTurns.toString())} 
                    className="justify-center" 
                  />
                ) : (
                  <div className={`text-[9px] ${isUsed ? 'text-stone-500' : 'text-stone-700'} font-medium leading-tight overflow-hidden text-ellipsis line-clamp-5`}>
                    {action.description.replace('the number of turns this round', board.maxTurns.toString())}
                  </div>
                )}
              </div>
              {isUsed && <span className="absolute bottom-1 bg-stone-800/80 px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wider">Used</span>}
              {isActive && <span className="absolute bottom-1 bg-orange-600 px-2 py-0.5 rounded text-white text-[10px] font-bold uppercase tracking-wider animate-pulse">Active</span>}
            </button>
          );
        })}

        {board.futureActions.map((action, idx) => (
          <div 
            key={`future-${action.id}-${idx}`}
            className="w-32 h-32 rounded-lg border-2 border-stone-700 bg-stone-800 flex-shrink-0 snap-start flex items-center justify-center relative overflow-hidden shadow-inner"
            title={`Upcoming Stage ${action.stage} Action Tile`}
          >
            <span className="text-stone-700 font-black text-7xl select-none">{action.stage}</span>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="absolute top-1 left-1 text-[8px] font-bold text-stone-600 uppercase tracking-tighter opacity-50">Upcoming</div>
          </div>
        ))}
      </div>
    </div>
  );
};
