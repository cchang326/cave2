import React, { useState } from 'react';
import { Settings, X, Trophy, Github, ExternalLink } from 'lucide-react';
import { GameState, RoomTile } from '../types/game';
import { calculateScore } from '../utils/scoring';
import { ROOM_TILES } from '../data/roomTiles';

export interface SettingsState {
  fixTileLocations: boolean;
}

interface Props {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}

export const SettingsPanel: React.FC<Props> = ({ settingsState, setSettingsState, gameState, setGameState }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentScore = calculateScore(gameState);

  const handleMaxOutResources = () => {
    setGameState(prev => ({
      ...prev,
      cheatsUsed: true,
      goods: {
        wood: 9,
        stone: 9,
        emmer: 9,
        flax: 9,
        food: 9,
        gold: 19
      }
    }));
  };

  const handleDebugExcavateAll = () => {
    setGameState(prev => {
      const hiddenTiles: RoomTile[] = [];
      
      // 1. Excavate all FACE_DOWN spaces to EMPTY and collect their tiles
      const newCave = prev.cave.map(space => {
        if (space.state === 'FACE_DOWN') {
          if (space.tile) {
            hiddenTiles.push(space.tile);
          }
          return { ...space, state: 'EMPTY' as const, tile: undefined };
        }
        return space;
      });

      // 2. Find all tiles currently furnished in the cave
      const tilesInCave = new Set(
        newCave
          .filter(s => s.state === 'FURNISHED' || s.state === 'ENTRANCE')
          .filter(s => s.tile)
          .map(s => s.tile!.id)
      );

      // 3. Central display should have its current tiles + hidden tiles from cave + all tiles from deck
      // We filter by ROOM_TILES to ensure we have all possible tiles that are NOT in the cave
      const newCentralDisplay = ROOM_TILES.filter(tile => !tilesInCave.has(tile.id));

      return {
        ...prev,
        cheatsUsed: true,
        cave: newCave,
        centralDisplay: newCentralDisplay,
        roomTileDeck: []
      };
    });
  };

  const handleTriggerAdditionalCavern = () => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        showAdditionalCavernChoice: true,
        isTriggeredByCheat: true
      }
    }));
  };

  const handleToggleIconicDescription = () => {
    setGameState(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        showIconicDescription: !prev.uiState.showIconicDescription
      }
    }));
  };

  const handleToggleFixTileLocations = () => {
    setSettingsState(prev => ({
      ...prev,
      fixTileLocations: !prev.fixTileLocations
    }));
  };

  const handleRevealAllActionTiles = () => {
    setGameState(prev => ({
      ...prev,
      cheatsUsed: true,
      actionBoard: {
        ...prev.actionBoard,
        availableActions: [
          ...prev.actionBoard.availableActions,
          ...prev.actionBoard.futureActions,
        ],
        futureActions: [],
        totalRounds: prev.actionBoard.totalRounds
      }
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-stone-800 p-3 rounded-full border border-stone-600 shadow-lg hover:bg-stone-700 transition-colors z-50 group"
        title="Open Settings"
      >
        <Settings className="w-6 h-6 text-stone-400 group-hover:text-stone-200 transition-colors" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-stone-800 rounded-xl shadow-2xl border border-stone-600 z-50 overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-stone-700 bg-stone-900/80">
        <h3 className="font-bold text-stone-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-orange-500" /> Settings
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between p-2 bg-stone-900/50 rounded-lg border border-stone-700">
          <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Use Iconography</span>
          <button
            onClick={handleToggleIconicDescription}
            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${
              gameState.uiState.showIconicDescription 
                ? 'bg-green-600 text-white shadow-inner' 
                : 'bg-stone-700 text-stone-400'
            }`}
          >
            {gameState.uiState.showIconicDescription ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center justify-between p-2 bg-stone-900/50 rounded-lg border border-stone-700 opacity-60">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Era II Expansion</span>
            <span className="text-[9px] text-orange-500 font-bold leading-tight">In Development</span>
          </div>
          <button
            disabled
            className="px-3 py-1 rounded-md text-[10px] font-black uppercase bg-stone-800 text-stone-600 cursor-not-allowed"
          >
            OFF
          </button>
        </div>

        <button
          onClick={() => window.open('https://github.com/cchang326/cave/issues', '_blank')}
          className="w-full p-2 bg-stone-900/50 hover:bg-stone-900/80 text-stone-200 rounded-lg border border-stone-700 flex items-center justify-between group transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-stone-800 rounded-md group-hover:bg-stone-700 transition-colors">
              <Github className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Feedback & Bugs</span>
          </div>
          <ExternalLink className="w-4 h-4 text-stone-500 group-hover:text-stone-300 transition-colors mr-1" />
        </button>

        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-500 flex items-center gap-2 py-2 opacity-60">
            <div className="h-px bg-stone-500/50 flex-1" />
            CHEATS
            <div className="h-px bg-stone-500/50 flex-1" />
          </div>
          <button
            onClick={handleRevealAllActionTiles}
            className="w-full py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-bold transition-colors"
          >
            Reveal Action Tiles
          </button>
          <button
            onClick={handleDebugExcavateAll}
            className="w-full py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-bold transition-colors"
          >
            Excavate All
          </button>
          <button
            onClick={handleMaxOutResources}
            className="w-full py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-bold transition-colors"
          >
            Max Out Resources
          </button>
          {!gameState.hasAdditionalCavern && (
            <button
              onClick={handleTriggerAdditionalCavern}
              className="w-full py-2 bg-stone-700 hover:bg-stone-600 text-stone-200 rounded-lg text-sm font-bold transition-colors"
            >
              Trigger Add. Cavern
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
