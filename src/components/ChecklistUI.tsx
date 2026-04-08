import React from 'react';
import { ChecklistItem, GoodsState } from '../types/game';
import { Check, X, Play, ChevronRight, Undo2, Square, CheckSquare, Circle, Info, Drumstick, TreePine, Wheat, Leaf, Coins } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { ChecklistIconRenderer, getIconicChoiceLabel } from './ChecklistIconRenderer';
import { IconicDescription } from './IconicDescription';

interface Props {
  checklist: ChecklistItem[];
  goods: GoodsState;
  showIconicDescription?: boolean;
  onExecute: (id: string) => void;
  onSkip: (id: string) => void;
  onChoose: (id: string, optionIndex: number) => void;
  onFinishTurn: () => void;
  onUndoAction?: () => void;
  canUndoAction?: boolean;
  onCancel?: () => void;
}

const goodIcons: Record<string, React.ReactNode> = {
  wood: <TreePine className="w-2.5 h-2.5 text-amber-700" />,
  stone: <StoneIcon className="w-2.5 h-2.5 text-gray-400" />,
  emmer: <Wheat className="w-2.5 h-2.5 text-yellow-500" />,
  flax: <Leaf className="w-2.5 h-2.5 text-green-500" />,
  food: <Drumstick className="w-2.5 h-2.5 text-orange-500" />,
  gold: <Coins className="w-2.5 h-2.5 text-yellow-400" />,
};

function canAfford(goods: GoodsState, cost?: Partial<GoodsState>, condition?: any): boolean {
  if (cost) {
    for (const key in cost) {
      const k = key as keyof GoodsState;
      if (goods[k] < (cost[k] || 0)) return false;
    }
  }

  if (condition) {
    if (condition.maxStone !== undefined && goods.stone > condition.maxStone) return false;
    if (condition.minGold !== undefined && goods.gold < condition.minGold) return false;
  }

  return true;
}

export const ChecklistUI: React.FC<Props> = ({ 
  checklist, 
  goods, 
  showIconicDescription = true,
  onExecute, 
  onSkip, 
  onChoose, 
  onFinishTurn, 
  onUndoAction, 
  canUndoAction,
  onCancel
}) => {
  const allDoneOrSkipped = checklist.every(item => item.status === 'DONE' || item.status === 'SKIPPED');
  const anyDoing = checklist.some(item => item.status === 'DOING');

  const showUndo = (canUndoAction && onUndoAction) || !!onCancel;

  return (
    <div className={`bg-stone-800/90 p-3.5 rounded-xl shadow-lg border border-stone-700 transition-all duration-300 backdrop-blur-sm ${
      showIconicDescription ? 'w-auto min-w-[16rem] max-w-[24rem]' : 'w-full min-w-[20rem]'
    }`}>
      <div className="relative flex justify-center items-center mb-2">
        <h2 className="text-stone-300 text-[10px] font-bold uppercase tracking-widest text-center">Action Checklist</h2>
        {showUndo && (
          <button
            onClick={onCancel || onUndoAction}
            title={onCancel ? "Cancel/Back" : "Undo Action"}
            className="absolute right-0 bg-red-900/50 hover:bg-red-800/80 text-red-200 p-1.5 rounded transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
        )}
      </div>
      
      <div className="space-y-1.5">
        {checklist.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-500 border border-dashed border-stone-700/50 rounded-lg bg-stone-900/20">
            <Square className="w-8 h-8 mb-2 opacity-10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">No active actions</span>
          </div>
        ) : (
          checklist.map(item => (
            <div key={item.id} className={`py-1.5 px-2.5 rounded-lg border shadow-sm transition-all ${
              item.status === 'DONE' ? 'bg-stone-100/90 border-stone-300 text-stone-400' :
              item.status === 'SKIPPED' ? 'bg-stone-200/60 border-stone-300 text-stone-400' :
              item.status === 'DOING' ? 'bg-white border-orange-500 text-stone-900 ring-2 ring-orange-500/30' :
              'bg-stone-50 border-stone-300 text-stone-800'
            }`}>
              <div className="flex justify-between items-center gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 flex items-center justify-center w-4">
                    {item.status === 'DONE' && <CheckSquare className="w-4 h-4 text-green-600" />}
                    {item.status === 'SKIPPED' && <X className="w-4 h-4 text-stone-400" />}
                    {item.status === 'DOING' && <Play className="w-4 h-4 text-orange-600 animate-pulse" />}
                    {item.status === 'TODO' && (
                      item.actionType === 'CHOICE' 
                        ? <Info className="w-4 h-4 text-orange-600" />
                        : <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`font-medium text-sm leading-tight flex items-center ${item.status === 'DONE' || item.status === 'SKIPPED' ? 'line-through decoration-stone-400 decoration-2 opacity-60' : ''}`}>
                      {showIconicDescription ? (
                        <ChecklistIconRenderer item={item} large={true} />
                      ) : (
                        item.text
                      )}
                    </span>
                    {!showIconicDescription && item.data?.gainAfter && Object.keys(item.data.gainAfter).length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-stone-500 uppercase font-bold tracking-tighter">Bonus:</span>
                        {Object.entries(item.data.gainAfter).map(([good, amount]) => (
                          <div key={good} className="flex items-center gap-0.5 bg-stone-900/40 px-1 rounded border border-stone-700/50">
                            <span className="text-orange-400 text-[10px] font-bold">+{amount as number}</span>
                            {goodIcons[good] || <span className="text-stone-400 text-[9px] uppercase">{good.charAt(0)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {item.status === 'TODO' && item.actionType !== 'CHOICE' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onExecute(item.id)}
                      disabled={
                        anyDoing ||
                        (item.actionType === 'PAY' && !canAfford(goods, item.data?.goods)) ||
                        (item.data?.payBefore && !canAfford(goods, item.data?.payBefore)) ||
                        (item.data?.condition && !canAfford(goods, undefined, item.data.condition))
                      }
                      className="px-3 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 disabled:text-stone-400 text-white text-xs font-bold rounded transition-colors"
                    >
                      Execute
                    </button>
                    {item.optional && (
                      <button 
                        onClick={() => onSkip(item.id)}
                        disabled={anyDoing}
                        className="px-3 py-1 bg-stone-600 hover:bg-stone-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-xs font-bold rounded transition-colors"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}

                {item.status === 'DOING' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400 animate-pulse">In Progress...</span>
                    {item.optional && (
                      <button 
                        onClick={() => onSkip(item.id)}
                        className="px-2 py-0.5 bg-stone-600 hover:bg-stone-500 text-white text-[10px] font-bold rounded transition-colors"
                      >
                        Skip
                      </button>
                    )}
                  </div>
                )}
              </div>

              {item.status === 'TODO' && item.actionType === 'CHOICE' && (
                <div className="mt-3 space-y-2 pl-7">
                  <div className="text-[10px] font-bold text-orange-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <div className="h-px bg-orange-500/20 flex-1" />
                    Choose One
                    <div className="h-px bg-orange-500/20 flex-1" />
                  </div>
                  {item.data.options.map((opt: any, idx: number) => {
                    const affordable = canAfford(goods, opt.cost);
                    return (
                      <button
                        key={idx}
                        onClick={() => onChoose(item.id, idx)}
                        disabled={anyDoing || !affordable}
                        className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between transition-all group shadow-sm
                          ${(!anyDoing && affordable) ? 'bg-stone-100 border-stone-300 hover:bg-white hover:border-orange-400 text-stone-800' : 'bg-stone-200/50 border-stone-300/50 text-stone-400 cursor-not-allowed'}
                        `}
                      >
                        <div className={`flex items-center gap-3 transition-all ${(!anyDoing && affordable) ? '' : 'opacity-40 grayscale-[0.5]'}`}>
                          <Circle className={`w-3 h-3 flex-shrink-0 transition-colors ${(!anyDoing && affordable) ? 'text-stone-400 group-hover:text-orange-500' : 'text-stone-300'}`} />
                          <span className="font-medium">
                            {showIconicDescription ? (
                              <IconicDescription description={getIconicChoiceLabel(opt)} large={true} />
                            ) : (
                              opt.label
                            )}
                          </span>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${(!anyDoing && affordable) ? 'text-stone-600 group-hover:translate-x-1 group-hover:text-orange-400' : 'text-stone-800 opacity-30'}`} />
                      </button>
                    );
                  })}
                  {item.optional && (
                    <button
                      onClick={() => onSkip(item.id)}
                      disabled={anyDoing}
                      className="w-full text-center px-3 py-2 rounded border border-stone-300 bg-stone-100 hover:bg-white disabled:bg-stone-200/50 disabled:text-stone-400 text-stone-600 text-sm font-bold transition-colors shadow-sm"
                    >
                      Skip Choice
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {allDoneOrSkipped && checklist.length > 0 && (
        <button
          onClick={onFinishTurn}
          className="mt-4 w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-[1.02]"
        >
          Finish Turn
        </button>
      )}
    </div>
  );
};
