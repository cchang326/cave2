import React from 'react';
import { WallRequirement } from '../types/game';

interface Props {
  req?: WallRequirement;
  className?: string;
}

export const WallRequirementIcon: React.FC<Props> = ({ req, className = '' }) => {
  if (!req) return null;

  let top = 0, right = 0, bottom = 0, left = 0;
  
  if (req.configuration === 'opposing') {
    top = 2;
    bottom = 2;
  } else {
    const walls = [0, 0, 0, 0];
    for (let i = 0; i < req.max; i++) {
      walls[i] = i < req.min ? 2 : 1;
    }
    [top, right, bottom, left] = walls;
  }

  const getBorderClass = (state: number) => {
    if (state === 2) return 'bg-stone-800';
    if (state === 1) return 'bg-stone-400';
    return 'hidden';
  };

  const title = `Requires ${req.min === req.max ? req.min : `${req.min}-${req.max}`} ${req.configuration !== 'any' ? req.configuration + ' ' : ''}wall(s)`;

  return (
    <div 
      className={`w-6 h-6 bg-white/50 rounded-sm flex items-center justify-center ${className}`}
      title={title}
    >
      <div className="w-4 h-4 relative">
        <div className={`absolute top-0 left-0 right-0 h-[2px] ${getBorderClass(top)}`} />
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${getBorderClass(bottom)}`} />
        <div className={`absolute top-0 bottom-0 left-0 w-[2px] ${getBorderClass(left)}`} />
        <div className={`absolute top-0 bottom-0 right-0 w-[2px] ${getBorderClass(right)}`} />
      </div>
    </div>
  );
};
