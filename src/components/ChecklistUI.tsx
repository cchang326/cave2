import React from 'react';
import { ChecklistItem, GoodsState } from '../types/game';
import { Check, X, Play, ChevronRight, Undo2, Square, CheckSquare, Circle, Info, Drumstick, TreePine, Wheat, Leaf, Coins, GripVertical, ListChecks, Minus, Plus } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { ChecklistIconRenderer, getIconicChoiceLabel } from './ChecklistIconRenderer';
import { IconicDescription } from './IconicDescription';
import { motion } from 'motion/react';

interface Props {
  checklist: ChecklistItem[];
  goods: GoodsState;
  showIconicDescription?: boolean;
  isCollapsed: boolean;
  onExecute: (id: string, isManual?: boolean, amount?: number) => void;
  onSkip: (id: string) => void;
  onChoose: (id: string, optionIndex: number) => void;
  onFinishTurn: () => void;
  onUndoAction?: () => void;
  canUndoAction?: boolean;
  onCancel?: () => void;
  onToggle?: () => void;
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
  isCollapsed,
  onExecute, 
  onSkip, 
  onChoose, 
  onFinishTurn, 
  onUndoAction, 
  canUndoAction,
  onCancel,
  onToggle
}) => {
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});

  if (isCollapsed) return null;

  const allDoneOrSkipped = checklist.every(item => item.status === 'DONE' || item.status === 'SKIPPED');
  const anyDoing = checklist.some(item => item.status === 'DOING');

  const showUndo = (canUndoAction && onUndoAction) || !!onCancel;

  return (
    <div 
      className={`absolute top-2 left-2 z-[200] bg-stone-900 py-4 rounded-xl shadow-2xl border border-stone-600 flex flex-col transition-all duration-300 ${
        showIconicDescription ? 'w-80' : 'w-[26rem]'
      }`}
    >
      <div className="px-4 mb-4">
        <div className="relative flex justify-center items-center group">
          {onToggle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              title="Hide Action Checklist"
              className="absolute left-0 bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white p-1.5 rounded-md transition-all shadow-lg active:scale-95 cursor-pointer z-[210]"
            >
              <ListChecks className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-stone-300 text-[10px] font-bold uppercase tracking-widest text-center px-8">Action Checklist</h2>
          {showUndo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onCancel) onCancel();
                else if (onUndoAction) onUndoAction();
              }}
              title={onCancel ? "Cancel/Back" : "Undo Action"}
              className="absolute right-0 bg-red-900/60 hover:bg-red-700 text-white p-1.5 rounded-md transition-all shadow-lg active:scale-95 cursor-pointer z-[210]"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="px-4 flex-1 overflow-hidden">
        <div className="space-y-1.5 overflow-y-auto custom-scrollbar max-h-[70vh] pr-1 -mr-1">
        {checklist.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-stone-500 border border-dashed border-stone-700/50 rounded-lg bg-stone-900/20">
            <Square className="w-8 h-8 mb-2 opacity-10" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-30">No active actions</span>
          </div>
        ) : (
          checklist.map(item => (
            <div key={item.id} className={`py-1.5 px-2.5 rounded-lg border shadow-sm transition-all relative overflow-hidden ${
              item.status === 'DONE' ? 'bg-stone-200/90 border-stone-400 text-stone-600' :
              item.status === 'SKIPPED' ? 'bg-stone-300/60 border-stone-400 text-stone-500' :
              item.status === 'DOING' ? 'bg-white border-orange-500 text-stone-900 ring-2 ring-orange-500/30' :
              'bg-stone-50 border-stone-300 text-stone-800'
            }`}>
              {(item.status === 'DONE' || item.status === 'SKIPPED') && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="absolute top-1/2 left-0 h-[1.5px] bg-stone-600/40 -translate-y-1/2 pointer-events-none z-10"
                />
              )}
              <div className="flex justify-between items-start gap-4 relative">
                <div className="flex items-start gap-3 flex-1 min-w-0 pt-0.5">
                  <div className="flex-shrink-0 flex items-center justify-center w-4 mt-1">
                    {item.status === 'DONE' && <CheckSquare className="w-4 h-4 text-green-600" />}
                    {item.status === 'SKIPPED' && <X className="w-4 h-4 text-stone-400" />}
                    {item.status === 'DOING' && <Play className="w-4 h-4 text-orange-600 animate-game-pulse" />}
                    {item.status === 'TODO' && (
                      item.actionType === 'CHOICE' 
                        ? <Info className="w-4 h-4 text-orange-600" />
                        : <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 relative">
                    <div className="font-medium text-sm leading-tight flex items-center transition-all">
                      {showIconicDescription ? (
                        item.source?.type === 'passive' ? (
                          <div 
                            title={`${item.source.name} effect`}
                            className="bg-blue-100/80 border border-blue-300 px-2 py-1 rounded shadow-sm flex items-center gap-2"
                          >
                             <ChecklistIconRenderer item={item} large={true} amount={quantities[item.id]} />
                          </div>
                        ) : (
                          <ChecklistIconRenderer item={item} large={true} amount={quantities[item.id]} />
                        )
                      ) : (
                        item.source?.type === 'passive' ? (
                          <span 
                            title={`${item.source.name} effect`}
                            className="bg-blue-100/50 border-b border-blue-300 px-1"
                          >
                            {item.text}
                          </span>
                        ) : (
                          item.text
                        )
                      )}
                    </div>
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
                
                {item.status === 'TODO' && item.actionType !== 'CHOICE' && item.actionType !== 'QUANTITY' && (
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

                {item.status === 'TODO' && item.actionType === 'QUANTITY' && (
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-2 bg-stone-200 rounded-md p-1 border border-stone-300">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const current = quantities[item.id] ?? 1;
                          if (current > 0) {
                            setQuantities(prev => ({ ...prev, [item.id]: current - 1 }));
                          }
                        }}
                        className="p-1 hover:bg-white rounded transition-colors text-stone-600 active:scale-90"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-bold text-stone-900 leading-none">
                        {quantities[item.id] ?? 1}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const current = quantities[item.id] ?? 1;
                          
                          // Calculate max based on resource
                          let max = 99;
                          if (item.data.costPer) {
                            for (const [res, cost] of Object.entries(item.data.costPer)) {
                              const available = goods[res as keyof GoodsState] || 0;
                              max = Math.min(max, Math.floor(available / (cost as number)));
                            }
                          }

                          if (current < max) {
                            setQuantities(prev => ({ ...prev, [item.id]: current + 1 }));
                          }
                        }}
                        className="p-1 hover:bg-white rounded transition-colors text-stone-600 active:scale-90"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => onExecute(item.id, true, quantities[item.id] ?? 1)}
                        disabled={anyDoing}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 disabled:text-stone-400 text-white text-[10px] font-bold rounded transition-colors uppercase"
                      >
                        Confirm
                      </button>
                      {item.optional && (
                        <button 
                          onClick={() => onSkip(item.id)}
                          disabled={anyDoing}
                          className="px-2 py-1 bg-stone-600 hover:bg-stone-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-[10px] font-bold rounded transition-colors uppercase"
                        >
                          Skip
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {item.status === 'DOING' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400 animate-game-pulse">In Progress...</span>
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
    </div>

      {allDoneOrSkipped && checklist.length > 0 && (
        <div className="px-4 mt-4">
          <button
            onClick={onFinishTurn}
            className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg transition-all transform hover:scale-[1.02]"
          >
            Finish Turn
          </button>
        </div>
      )}
    </div>
  );
};
