import React, { useState } from 'react';
import { Settings, X, Trophy, Github, ExternalLink, Volume2, VolumeX } from 'lucide-react';
import { GameState, RoomTile } from '../types/game';
import { MAX_RESOURCE_LIMIT, MAX_GOLD_WEAPON_LIMIT } from '../constants';
import { calculateScore } from '../utils/scoring';
import { ROOM_TILES } from '../data/roomTiles';

export interface SettingsState {
  fixTileLocations: boolean;
  isMuted: boolean;
}

interface Props {
  settingsState: SettingsState;
  setSettingsState: React.Dispatch<React.SetStateAction<SettingsState>>;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onTransitionToEraII: () => void;
}

export const SettingsPanel: React.FC<Props> = ({ settingsState, setSettingsState, gameState, setGameState, onTransitionToEraII }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const currentScore = calculateScore(gameState);

  const handleToggleMute = () => {
    setSettingsState(prev => ({
      ...prev,
      isMuted: !prev.isMuted
    }));
  };

  const handleMaxOutResources = () => {
    setGameState(prev => ({
      ...prev,
      cheatsUsed: true,
      goods: {
        wood: MAX_RESOURCE_LIMIT,
        stone: MAX_RESOURCE_LIMIT,
        emmer: MAX_RESOURCE_LIMIT,
        flax: MAX_RESOURCE_LIMIT,
        food: MAX_RESOURCE_LIMIT,
        gold: MAX_GOLD_WEAPON_LIMIT,
        donkey: MAX_RESOURCE_LIMIT,
        ore: MAX_RESOURCE_LIMIT,
        iron: MAX_RESOURCE_LIMIT,
        weapons: MAX_GOLD_WEAPON_LIMIT
      }
    }));
  };

  const handleDebugExcavateAll = () => {
    setGameState(prev => {
      const currentEra = prev.era;
      
      // 1. Excavate FACE_DOWN spaces to EMPTY if they contain a tile from current or previous era
      const newCave = prev.cave.map(space => {
        if (space.state === 'FACE_DOWN' && space.tile && space.tile.era <= currentEra) {
          return { ...space, state: 'EMPTY' as const, tile: undefined };
        }
        return space;
      });

      // 2. Find all tiles currently furnished in the cave or still face down
      const unavailableTiles = new Set(
        newCave
          .filter(s => (s.state === 'FURNISHED' || s.state === 'ENTRANCE' || s.state === 'FACE_DOWN'))
          .filter(s => s.tile)
          .map(s => s.tile!.id)
      );

      // 3. Central display should have all tiles from ROOM_TILES up to current era that are not in the cave
      const newCentralDisplay = ROOM_TILES.filter(tile => 
        tile.era <= currentEra && !unavailableTiles.has(tile.id)
      );

      return {
        ...prev,
        cheatsUsed: true,
        cave: newCave,
        centralDisplay: newCentralDisplay,
        fdp1: [],
        fdp2: currentEra === 1 ? prev.fdp2 : []
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
        className="fixed bottom-6 right-6 bg-stone-800 p-3 rounded-full border border-stone-600 shadow-lg hover:bg-stone-700 transition-colors z-[400] group"
        title="Open Settings"
      >
        <Settings className="w-6 h-6 text-stone-400 group-hover:text-stone-200 transition-colors" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-stone-800 rounded-xl shadow-2xl border border-stone-600 z-[400] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-stone-700 bg-stone-900/80">
        <h3 className="font-bold text-stone-200 flex items-center gap-2">
          <Settings className="w-4 h-4 text-orange-500" /> Settings
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-stone-400 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-2 bg-stone-900/50 rounded-lg border border-stone-700">
            <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tight">Iconography</span>
            <button
              onClick={handleToggleIconicDescription}
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                gameState.uiState.showIconicDescription 
                  ? 'bg-green-600 text-white shadow-inner' 
                  : 'bg-stone-700 text-stone-400'
              }`}
            >
              {gameState.uiState.showIconicDescription ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="flex items-center justify-between p-2 bg-stone-900/50 rounded-lg border border-stone-700">
            <div className="flex items-center gap-1.5 overflow-hidden">
              {settingsState.isMuted ? <VolumeX className="w-3 h-3 text-stone-500" /> : <Volume2 className="w-3 h-3 text-orange-400" />}
              <span className="text-[10px] font-bold text-stone-300 uppercase tracking-tight">Sound</span>
            </div>
            <button
              onClick={handleToggleMute}
              className={`px-2 py-1 rounded-md text-[9px] font-black uppercase transition-all ${
                !settingsState.isMuted 
                  ? 'bg-green-600 text-white shadow-inner' 
                  : 'bg-stone-700 text-stone-400'
              }`}
            >
              {!settingsState.isMuted ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-2 bg-stone-900/50 rounded-lg border border-stone-700">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-stone-300 uppercase tracking-wider">Era II Expansion</span>
            <span className="text-[9px] text-green-500 font-bold leading-tight">Active</span>
          </div>
          <div className="px-3 py-1 rounded-md text-[10px] font-black uppercase bg-green-600 text-white shadow-inner">
            ON
          </div>
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
          {gameState.era === 1 && (
            <button
              onClick={onTransitionToEraII}
              className="w-full py-2 bg-orange-700 hover:bg-orange-600 text-stone-100 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-orange-900/20"
            >
              Jump to Era II
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
