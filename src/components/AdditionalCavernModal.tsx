import React from 'react';
import { Square, X } from 'lucide-react';

interface Props {
  onSelect: (walls: 2 | 3) => void;
  onClose: () => void;
}

export const AdditionalCavernModal: React.FC<Props> = ({ onSelect, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
      <div className="bg-stone-800 border-4 border-orange-600 rounded-2xl p-8 max-w-md w-full shadow-2xl transform animate-in fade-in zoom-in duration-300 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-black text-orange-500 uppercase tracking-tighter mb-4 text-center">Additional Cavern!</h2>
        <p className="text-stone-300 text-center mb-8 leading-relaxed">
          You have completely filled your cave! Choose which side of the Additional Cavern to place.
        </p>
        
        <div className="grid grid-cols-2 gap-6">
          <button 
            onClick={() => onSelect(2)}
            className="group flex flex-col items-center gap-4 p-6 bg-stone-700 hover:bg-stone-600 border-2 border-stone-600 hover:border-orange-500 rounded-xl transition-all"
          >
            <div className="relative w-16 h-16 bg-stone-800 rounded border-2 border-stone-500 flex items-center justify-center">
              <div className="absolute -top-1 left-0 right-0 h-1 bg-orange-800" />
              <div className="absolute top-0 bottom-0 -left-1 w-1 bg-orange-800" />
              <Square className="w-8 h-8 text-stone-600 opacity-20" />
            </div>
            <span className="text-stone-200 font-bold uppercase text-sm">2 Adjacent Walls</span>
          </button>

          <button 
            onClick={() => onSelect(3)}
            className="group flex flex-col items-center gap-4 p-6 bg-stone-700 hover:bg-stone-600 border-2 border-stone-600 hover:border-orange-500 rounded-xl transition-all"
          >
            <div className="relative w-16 h-16 bg-stone-800 rounded border-2 border-stone-500 flex items-center justify-center">
              <div className="absolute -top-1 left-0 right-0 h-1 bg-orange-800" />
              <div className="absolute top-0 bottom-0 -left-1 w-1 bg-orange-800" />
              <div className="absolute top-0 bottom-0 -right-1 w-1 bg-orange-800" />
              <Square className="w-8 h-8 text-stone-600 opacity-20" />
            </div>
            <span className="text-stone-200 font-bold uppercase text-sm">3 Walls</span>
          </button>
        </div>
      </div>
    </div>
  );
};
