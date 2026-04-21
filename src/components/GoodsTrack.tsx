import React, { useEffect, useRef, useState } from 'react';
import { GoodsState } from '../types/game';
import { TreePine, Wheat, Leaf, Drumstick, Coins, ArrowRightLeft, RotateCcw, Volume2, VolumeX, Cuboid, Sword } from 'lucide-react';
import { StoneIcon } from './StoneIcon';
import { OreIcon } from './OreIcon';
import { DonkeyIcon } from './DonkeyIcon';
import { motion, AnimatePresence } from 'motion/react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";

// Public sound effects
const SOUNDS = {
  gain: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3', // Short coin blip
  lose: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft thud
};

interface Props {
  goods: GoodsState;
  onExchange?: (from: keyof GoodsState, to: keyof GoodsState) => void;
  onUndoExchange?: () => void;
  canUndoExchange?: boolean;
  era: 1 | 2;
  suppressSounds?: boolean;
}

interface FloatState {
  id: number;
  diff: number;
}

const GoodItem: React.FC<{
  good: keyof GoodsState;
  value: number;
  icon: React.ReactNode;
  onExchange?: (from: keyof GoodsState, to: keyof GoodsState) => void;
  onUndoExchange?: () => void;
  canUndoExchange?: boolean;
  isExchangeable: boolean;
  muted: boolean;
  skipNextSound: boolean;
  onSoundPlayed: () => void;
  suppressSounds?: boolean;
}> = ({ good, value, icon, onExchange, onUndoExchange, canUndoExchange, isExchangeable, muted, skipNextSound, onSoundPlayed, suppressSounds }) => {
  const prevValueRef = useRef<number | null>(null);
  const [floats, setFloats] = useState<FloatState[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    // If null, this is the initial mount. Set the ref and skip logic.
    if (prevValueRef.current === null) {
      prevValueRef.current = value;
      return;
    }

    const prev = prevValueRef.current;
    if (prev !== value) {
      const diff = value - prev;
      
      // Floating animation still happens even if sound is suppressed
      const id = idCounter.current++;
      setFloats(current => [...current, { id, diff }]);

      // Sound effect - logic checked here
      if (!muted && !skipNextSound && !suppressSounds) {
        const audio = new Audio(diff > 0 ? SOUNDS.gain : SOUNDS.lose);
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore autoplay blocks
      }
      
      if (skipNextSound) {
        onSoundPlayed();
      }

      // Cleanup float after animation (2s)
      setTimeout(() => {
        setFloats(current => current.filter(f => f.id !== id));
      }, 2000);
    }
    prevValueRef.current = value;
  }, [value, muted, skipNextSound, onSoundPlayed, suppressSounds]);

  return (
    <div className="flex items-center bg-stone-900/80 px-1.5 py-0.5 rounded-md border border-stone-700/50 w-full justify-between group relative h-8">
      <TooltipProvider delay={200}>
        <Tooltip>
          <TooltipTrigger>
            <div className="flex items-center gap-2 cursor-help">
              <div className="flex-shrink-0">{icon}</div>
              <motion.span 
                key={value}
                initial={{ scale: 1.2, color: '#fb923c' }}
                animate={{ scale: 1, color: '#ffffff' }}
                transition={{ duration: 0.8 }}
                className="text-white font-mono text-[20px] font-bold leading-none block"
              >
                {value}
              </motion.span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-stone-900 border-stone-700 text-stone-200 text-xs capitalize">
            {good}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Floating Indicators */}
      <AnimatePresence>
        {floats.map(f => (
          <motion.div
            key={f.id}
            initial={{ y: 0, opacity: 0, scale: 0.8 }}
            animate={{ y: -12, opacity: 1, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
            transition={{ duration: 2, ease: "easeOut" }}
            className={`absolute left-10 pointer-events-none font-black text-[10px] drop-shadow-md ${f.diff > 0 ? 'text-green-400' : 'text-red-400'}`}
            style={{ zIndex: 50 }}
          >
            {f.diff > 0 ? `+${f.diff}` : f.diff}
          </motion.div>
        ))}
      </AnimatePresence>
      
      <div className="flex items-center gap-1 z-10">
        {good === 'food' && onUndoExchange && canUndoExchange && (
          <button
            onClick={onUndoExchange}
            title="Undo last conversion"
            className="p-0.5 bg-orange-600/20 border border-orange-500/50 hover:bg-orange-600/40 text-orange-400 rounded transition-all shadow-sm"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        )}

        {onExchange && isExchangeable && (
          <button
            onClick={() => onExchange(good, 'food')}
            disabled={value <= 0}
            className="p-0.5 bg-stone-800/50 border border-stone-700 hover:bg-stone-700 disabled:opacity-30 disabled:hover:bg-transparent rounded transition-all text-amber-500/70 hover:text-amber-400 hover:border-amber-500/30 shadow-sm"
            title={`Exchange 1 ${good} for 1 food`}
          >
            <ArrowRightLeft className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export const GoodsTrack: React.FC<Props & { muted: boolean }> = ({ goods, onExchange, onUndoExchange, canUndoExchange, era, muted, suppressSounds }) => {
  const [skipSoundFor, setSkipSoundFor] = useState<string | null>(null);
  const iconSize = "w-[18px] h-[18px]";

  const handleExchange = (from: keyof GoodsState, to: keyof GoodsState) => {
    if (onExchange) {
      setSkipSoundFor(from);
      onExchange(from, to);
      setTimeout(() => setSkipSoundFor(null), 500);
    }
  };
  
  const goodIcons: Record<keyof GoodsState, React.ReactNode> = {
    wood: <TreePine className={`${iconSize} text-amber-700`} />,
    stone: <StoneIcon className={`${iconSize} text-gray-400`} />,
    emmer: <Wheat className={`${iconSize} text-yellow-500`} />,
    flax: <Leaf className={`${iconSize} text-green-500`} />,
    food: <Drumstick className={`${iconSize} text-orange-500`} />,
    gold: <Coins className={`${iconSize} text-yellow-400`} />,
    donkey: <DonkeyIcon className={`${iconSize} text-orange-700`} />,
    ore: <OreIcon className={`${iconSize} text-zinc-500`} />,
    iron: <Cuboid className={`${iconSize} text-blue-300`} />,
    weapons: <Sword className={`${iconSize} text-red-400`} />,
  };

  const goodOrder: (keyof GoodsState)[] = era === 1 
    ? ['wood', 'stone', 'emmer', 'flax', 'food', 'gold']
    : ['wood', 'stone', 'emmer', 'flax', 'food', 'gold', 'donkey', 'ore', 'iron', 'weapons'];

  const exchangeable: (keyof GoodsState)[] = era === 1 
    ? ['emmer', 'flax', 'gold']
    : ['emmer', 'flax', 'gold', 'donkey'];

  return (
    <TooltipProvider delay={200}>
      <div className="bg-stone-800/95 backdrop-blur-sm p-1.5 rounded-lg shadow-xl border border-stone-700 w-24 flex flex-col gap-0.5 relative z-[300]">
        {goodOrder.map(good => (
          <GoodItem 
            key={good}
            good={good}
            value={goods[good]}
            icon={goodIcons[good]}
            onExchange={handleExchange}
            onUndoExchange={onUndoExchange}
            canUndoExchange={canUndoExchange}
            isExchangeable={exchangeable.includes(good)}
            muted={muted}
            skipNextSound={skipSoundFor === good || (skipSoundFor !== null && good === 'food')}
            onSoundPlayed={() => setSkipSoundFor(null)}
            suppressSounds={suppressSounds}
          />
        ))}
      </div>
    </TooltipProvider>
  );
};

