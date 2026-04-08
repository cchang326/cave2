import { ChecklistItem, ActionBoardState, CaveSpace } from '../types/game';

export function generateChecklistForAction(actionId: string, board: ActionBoardState, cave: CaveSpace[]): ChecklistItem[] {
  let items: ChecklistItem[] = [];

  switch (actionId) {
    case 'cultivation':
      items = [
        { id: 'c1', text: 'Activate 1 orange room', actionType: 'ROOM_ACTION', optional: true, status: 'TODO', data: { count: 1 } },
        { id: 'c2', text: 'Gain 2 Emmer', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { emmer: 2 } } },
        { id: 'c3', text: 'Gain 1 Flax', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { flax: 1 } } }
      ];
      break;
    case 'undergrowth':
      items = [
        { id: 'u1', text: 'Activate 1 orange room', actionType: 'ROOM_ACTION', optional: true, status: 'TODO', data: { count: 1 } },
        { id: 'u2', text: 'Gain 2 Wood', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { wood: 2 } } }
      ];
      break;
    case 'excavation':
      items = [
        {
          id: 'e_choice',
          text: 'Excavation Choice',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Excavate 1 Cavern', cost: {}, items: [{ id: 'e1', text: 'Excavate 1 Cavern', actionType: 'EXCAVATE', status: 'TODO', data: { count: 1 } }] },
              { label: 'Pay 2 Food to Excavate 2 Caverns', cost: { food: 2 }, items: [{ id: 'e2', text: 'Pay 2 Food to Excavate 2 Caverns', actionType: 'EXCAVATE', status: 'TODO', data: { count: 2, payBefore: { food: 2 } } }] }
            ]
          }
        },
        { id: 'e3', text: 'Gain 1 Stone', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { stone: 1 } } }
      ];
      break;
    case 'housework':
      items = [
        { id: 'h1', text: `Pay ${board.maxTurns} Food to Furnish`, actionType: 'FURNISH', optional: true, status: 'TODO', data: { count: 1, payBefore: { food: board.maxTurns } } },
        {
          id: 'h_furnish_choice',
          text: 'Furnish Choice',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 5 Food to Furnish', cost: { food: 5 }, items: [{ id: 'h2', text: 'Pay 5 Food to Furnish', actionType: 'FURNISH', status: 'TODO', data: { count: 1, payBefore: { food: 5 } } }] },
              { label: 'Pay 1 Gold to Furnish', cost: { gold: 1 }, items: [{ id: 'h3', text: 'Pay 1 Gold to Furnish', actionType: 'FURNISH', status: 'TODO', data: { count: 1, payBefore: { gold: 1 } } }] }
            ]
          }
        }
      ];
      break;
    case 'furnishing':
      items = [
        { id: 'f1', text: 'Gain 1 Food', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { food: 1 } } },
        { id: 'f2', text: `Pay ${board.maxTurns} Food to Furnish`, actionType: 'FURNISH', optional: true, status: 'TODO', data: { count: 1, payBefore: { food: board.maxTurns } } }
      ];
      break;
    case 'masonry':
      items = [
        { id: 'm1', text: 'Activate 1 orange room', actionType: 'ROOM_ACTION', optional: true, status: 'TODO', data: { count: 1 } },
        {
          id: 'm_gain_choice',
          text: 'Gain Choice',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Gain 1 Wood', cost: {}, items: [{ id: 'm2', text: 'Gain 1 Wood', actionType: 'GAIN', status: 'TODO', data: { goods: { wood: 1 } } }] },
              { label: 'Gain 1 Stone', cost: {}, items: [{ id: 'm3', text: 'Gain 1 Stone', actionType: 'GAIN', status: 'TODO', data: { goods: { stone: 1 } } }] }
            ]
          }
        },
        { id: 'm4', text: 'Build a wall', actionType: 'BUILD_WALL', optional: true, status: 'TODO', data: { count: 1 } }
      ];
      break;
    case 'undermining':
      items = [
        {
          id: 'um_choice',
          text: 'Undermining Choice',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Activate 2 orange rooms', cost: {}, items: [{ id: 'um1', text: 'Activate 2 orange rooms', actionType: 'ROOM_ACTION', status: 'TODO', data: { count: 2 } }] },
              { label: 'Excavate once, even through walls', cost: {}, items: [{ id: 'um2', text: 'Excavate once, even through walls', actionType: 'EXCAVATE', status: 'TODO', data: { count: 1, ignoreWalls: true } }] }
            ]
          }
        }
      ];
      break;
    case 'drift_mining':
      items = [
        { id: 'dm1', text: 'Activate 1 orange room', actionType: 'ROOM_ACTION', optional: true, status: 'TODO', data: { count: 1 } },
        { id: 'dm2', text: 'Excavate once', actionType: 'EXCAVATE', optional: true, status: 'TODO', data: { count: 1 } }
      ];
      break;
    case 'expansion':
      items = [
        { id: 'ex1', text: 'Excavate once', actionType: 'EXCAVATE', optional: true, status: 'TODO', data: { count: 1 } },
        {
          id: 'ex_furnish_choice',
          text: 'Furnish Choice',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 5 Food to Furnish', cost: { food: 5 }, items: [{ id: 'ex2', text: 'Pay 5 Food to Furnish', actionType: 'FURNISH', status: 'TODO', data: { count: 1, payBefore: { food: 5 } } }] },
              { label: 'Pay 2 Gold to Furnish', cost: { gold: 2 }, items: [{ id: 'ex3', text: 'Pay 2 Gold to Furnish', actionType: 'FURNISH', status: 'TODO', data: { count: 1, payBefore: { gold: 2 } } }] }
            ]
          }
        }
      ];
      break;
    case 'breach':
      items = [
        { id: 'b1', text: 'Remove one wall to gain 2 stone, 3 food, 1 gold', actionType: 'REMOVE_WALL', optional: true, status: 'TODO', data: { count: 1, gainAfter: { stone: 2, food: 3, gold: 1 } } }
      ];
      break;
    case 'expedition':
      items = [
        {
          id: 'ep_choice',
          text: 'Expedition Choice',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 5 Wood to gain 4 Gold', cost: { wood: 5 }, items: [{ id: 'ep1', text: 'Pay 5 Wood to gain 4 Gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { wood: 5 }, goods: { gold: 4 } } }] },
              { label: 'Pay 5 Stone to gain 4 Gold', cost: { stone: 5 }, items: [{ id: 'ep2', text: 'Pay 5 Stone to gain 4 Gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { stone: 5 }, goods: { gold: 4 } } }] },
              { label: 'Activate 3 orange rooms', cost: {}, items: [{ id: 'ep3', text: 'Activate 3 orange rooms', actionType: 'ROOM_ACTION', status: 'TODO', data: { count: 3 } }] }
            ]
          }
        }
      ];
      break;
    case 'renovation':
      items = [
        { id: 'r1', text: 'Build a wall', actionType: 'BUILD_WALL', optional: true, status: 'TODO', data: { count: 1 } },
        { id: 'r2', text: 'Furnish a cavern (pay room cost only)', actionType: 'FURNISH', optional: true, status: 'TODO', data: { count: 1 } }
      ];
      break;
    default:
      items = [];
  }

  return decorateWithPassives(items, actionId, cave);
}

function decorateWithPassives(items: ChecklistItem[], actionId: string | undefined, cave: CaveSpace[]): ChecklistItem[] {
  const furnishedRooms = cave.filter(s => s.state === 'FURNISHED' && s.tile).map(s => s.tile!);
  const hasPassive = (id: string) => furnishedRooms.some(r => r.id === id);

  // Deep copy to avoid mutating original templates
  let processedItems: ChecklistItem[] = JSON.parse(JSON.stringify(items));

  const findItemById = (list: ChecklistItem[], id: string): ChecklistItem | undefined => {
    for (const item of list) {
      if (item.id === id) return item;
      if (item.actionType === 'CHOICE' && item.data?.options) {
        for (const opt of item.data.options) {
          const found = findItemById(opt.items || [], id);
          if (found) return found;
        }
      }
    }
    return undefined;
  };

  // 1. Action-level modifications (Equipment Room)
  if (hasPassive('equipment_room')) {
    if (actionId === 'undermining') {
      const item = findItemById(processedItems, 'um1');
      if (item) {
        item.text = 'Activate 3 orange rooms';
        item.data.count = 3;
      }
    } else if (actionId === 'expedition') {
      const item = findItemById(processedItems, 'ep3');
      if (item) {
        item.text = 'Activate 4 orange rooms';
        item.data.count = 4;
      }
    }
  }

  // 2. Action-level additions (Prospecting Site)
  if (actionId === 'undergrowth' && hasPassive('prospecting_site')) {
    processedItems.push({
      id: `p_site_${Date.now()}`,
      text: 'Passive: Prospecting Site — Pay 1 food to gain 1 gold',
      actionType: 'GAIN',
      optional: true,
      status: 'TODO',
      data: { payBefore: { food: 1 }, goods: { gold: 1 } }
    });
  }

  // 3. Recursive decoration for per-item passives (Retting Room, Wood Storeroom, Dungeon)
  const decorate = (list: ChecklistItem[]): ChecklistItem[] => {
    const result: ChecklistItem[] = [];
    
    list.forEach((item, index) => {
      // Process nested items in choices
      if (item.actionType === 'CHOICE' && item.data?.options) {
        item.data.options = item.data.options.map((opt: any) => ({
          ...opt,
          items: decorate(opt.items || [])
        }));
      }

      result.push(item);

      const triggers: ChecklistItem[] = [];

      // Retting Room: Each time after you gain 1-3 flax from an effect, you get 1 food.
      if (hasPassive('retting_room')) {
        const flaxAmount = item.data?.goods?.flax || 0;
        const flaxReplenish = item.data?.replenishUpTo?.flax || 0;
        if (item.actionType === 'GAIN' && ((flaxAmount >= 1 && flaxAmount <= 3) || (flaxReplenish >= 1 && flaxReplenish <= 3))) {
          triggers.push({
            id: `retting_${item.id}_${index}`,
            text: 'Passive: Retting Room — Gain 1 food',
            actionType: 'GAIN',
            optional: true,
            status: 'TODO',
            data: { goods: { food: 1 } }
          });
        }
      }

      // Wood Storeroom: Each time you use a [1] effect, also gain 1 wood, if possible.
      if (hasPassive('wood_storeroom')) {
        const isOneRoomActivation = item.actionType === 'ROOM_ACTION' && item.data?.count === 1;
        
        if (isOneRoomActivation) {
          triggers.push({
            id: `wood_store_${item.id}_${index}`,
            text: 'Passive: Wood Storeroom — Gain 1 wood',
            actionType: 'GAIN',
            optional: true,
            status: 'TODO',
            data: { goods: { wood: 1 } }
          });
        }
      }

      result.push(...triggers);
    });

    return result;
  };

  return decorate(processedItems);
}

export function getRoomActionChecklistItems(roomId: string, cave: CaveSpace[]): ChecklistItem[] {
  const ts = Date.now();
  let items: ChecklistItem[] = [];

  switch (roomId) {
    case 'caveEntrance':
      items = [
        {
          id: `ce_${ts}`,
          text: 'Cave Entrance',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Gain 1 Wood', cost: {}, items: [{ id: `ce_w_${ts}`, text: 'Gain 1 Wood', actionType: 'GAIN', status: 'TODO', data: { goods: { wood: 1 } } }] },
              { label: 'Gain 1 Stone', cost: {}, items: [{ id: `ce_s_${ts}`, text: 'Gain 1 Stone', actionType: 'GAIN', status: 'TODO', data: { goods: { stone: 1 } } }] },
              { label: 'Gain 1 Emmer', cost: {}, items: [{ id: `ce_e_${ts}`, text: 'Gain 1 Emmer', actionType: 'GAIN', status: 'TODO', data: { goods: { emmer: 1 } } }] },
              { label: 'Gain 1 Flax', cost: {}, items: [{ id: `ce_f_${ts}`, text: 'Gain 1 Flax', actionType: 'GAIN', status: 'TODO', data: { goods: { flax: 1 } } }] }
            ]
          }
        }
      ];
      break;
    case 'shelf':
      items = [
        {
          id: `shelf_${ts}`,
          text: 'Shelf',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Replenish Wood to 2', cost: {}, items: [{ id: `sh_w_${ts}`, text: 'Replenish Wood to 2', actionType: 'GAIN', status: 'TODO', data: { replenishUpTo: { wood: 2 } } }] },
              { label: 'Replenish Stone to 2', cost: {}, items: [{ id: `sh_s_${ts}`, text: 'Replenish Stone to 2', actionType: 'GAIN', status: 'TODO', data: { replenishUpTo: { stone: 2 } } }] },
              { label: 'Replenish Emmer to 2', cost: {}, items: [{ id: `sh_e_${ts}`, text: 'Replenish Emmer to 2', actionType: 'GAIN', status: 'TODO', data: { replenishUpTo: { emmer: 2 } } }] },
              { label: 'Replenish Flax to 2', cost: {}, items: [{ id: `sh_f_${ts}`, text: 'Replenish Flax to 2', actionType: 'GAIN', status: 'TODO', data: { replenishUpTo: { flax: 2 } } }] }
            ]
          }
        }
      ];
      break;
    case 'spinning_wheel':
      items = [
        {
          id: `sw_${ts}`,
          text: 'Spinning Wheel',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 1 flax to gain 1 gold', cost: { flax: 1 }, items: [{ id: `sw_1_${ts}`, text: 'Pay 1 flax to gain 1 gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { flax: 1 }, goods: { gold: 1 } } }] },
              { label: 'Pay 3 flax to gain 2 gold', cost: { flax: 3 }, items: [{ id: `sw_2_${ts}`, text: 'Pay 3 flax to gain 2 gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { flax: 3 }, goods: { gold: 2 } } }] }
            ]
          }
        }
      ];
      break;
    case 'tunnel':
      items = [
        { id: `tn_1_${ts}`, text: 'Gain 2 food', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { food: 2 } } },
        { id: `tn_2_${ts}`, text: 'If you have less than 3 stone, gain 1 stone', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { stone: 1 }, condition: { maxStone: 2 } } }
      ];
      break;
    case 'grindstone':
      items = [
        {
          id: `gs_${ts}`,
          text: 'Grindstone',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 1 emmer to gain 3 food', cost: { emmer: 1 }, items: [{ id: `gs_1_${ts}`, text: 'Pay 1 emmer to gain 3 food', actionType: 'GAIN', status: 'TODO', data: { payBefore: { emmer: 1 }, goods: { food: 3 } } }] },
              { label: 'Pay 4 emmer to gain 7 food', cost: { emmer: 4 }, items: [{ id: `gs_2_${ts}`, text: 'Pay 4 emmer to gain 7 food', actionType: 'GAIN', status: 'TODO', data: { payBefore: { emmer: 4 }, goods: { food: 7 } } }] }
            ]
          }
        }
      ];
      break;
    case 'food_corner':
      items = [
        { id: `fc_${ts}`, text: 'Replenish food to 3', actionType: 'GAIN', optional: true, status: 'TODO', data: { replenishUpTo: { food: 3 } } }
      ];
      break;
    case 'parlor':
      items = [
        { id: `pr_${ts}`, text: 'Gain 1 good of each type of which you have 0 goods', actionType: 'GAIN', optional: true, status: 'TODO', data: { replenishUpTo: { wood: 1, stone: 1, emmer: 1, flax: 1, food: 1, gold: 1 } } }
      ];
      break;
    case 'warehouse':
      items = [
        { id: `wh_${ts}`, text: 'Pay 2 food to gain 1 wood, 1 stone, 1 emmer, and 1 flax', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { food: 2 }, goods: { wood: 1, stone: 1, emmer: 1, flax: 1 } } }
      ];
      break;
    case 'stall':
      items = [
        {
          id: `st_${ts}`,
          text: 'Stall',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 5 emmer to gain 4 gold', cost: { emmer: 5 }, items: [{ id: `st_1_${ts}`, text: 'Pay 5 emmer to gain 4 gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { emmer: 5 }, goods: { gold: 4 } } }] },
              { label: 'Pay 5 flax to gain 4 gold', cost: { flax: 5 }, items: [{ id: `st_2_${ts}`, text: 'Pay 5 flax to gain 4 gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { flax: 5 }, goods: { gold: 4 } } }] }
            ]
          }
        }
      ];
      break;
    case 'sacrificial_altar':
      items = [
        { id: `sa_${ts}`, text: 'Pay 1 wood, 1 emmer, 1 flax, and 1 food to gain 3 gold', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { wood: 1, emmer: 1, flax: 1, food: 1 }, goods: { gold: 3 } } }
      ];
      break;
    case 'storeroom':
      items = [
        { id: `sr_${ts}`, text: 'Gain 1 emmer, 1 flax, and 1 food', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { emmer: 1, flax: 1, food: 1 } } }
      ];
      break;
    case 'weaving_room':
      items = [
        { id: `wr_${ts}`, text: 'Pay 2 flax to gain 2 food and 2 gold', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { flax: 2 }, goods: { food: 2, gold: 2 } } }
      ];
      break;
    case 'furniture_workshop':
      items = [
        { id: `fw_${ts}`, text: 'Pay 2 wood and 1 flax to gain 3 gold', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { wood: 2, flax: 1 }, goods: { gold: 3 } } }
      ];
      break;
    case 'gold_vein':
      items = [
        { id: `gv_${ts}`, text: 'Gain 1 stone and 1 gold', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { stone: 1, gold: 1 } } }
      ];
      break;
    case 'junction_room':
      items = [
        { id: `jr_${ts}`, text: 'Pay 3 different goods to gain 2 gold', actionType: 'PAY_DYNAMIC', optional: true, status: 'TODO', data: { amount: 3, gainAfter: { gold: 2 }, exclude: ['gold'] } }
      ];
      break;
    case 'digging_cave':
      items = [
        { id: `dc_${ts}`, text: 'Pay 1 gold to excavate once', actionType: 'EXCAVATE', optional: true, status: 'TODO', data: { count: 1, payBefore: { gold: 1 } } }
      ];
      break;
    case 'bakehouse':
      items = [
        {
          id: `bh_${ts}`,
          text: 'Bakehouse',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Pay 2 emmer to gain 4 food and 1 gold', cost: { emmer: 2 }, items: [{ id: `bh_1_${ts}`, text: 'Pay 2 emmer to gain 4 food and 1 gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { emmer: 2 }, goods: { food: 4, gold: 1 } } }] },
              { label: 'Pay 3 emmer to gain 4 food and 2 gold', cost: { emmer: 3 }, items: [{ id: `bh_2_${ts}`, text: 'Pay 3 emmer to gain 4 food and 2 gold', actionType: 'GAIN', status: 'TODO', data: { payBefore: { emmer: 3 }, goods: { food: 4, gold: 2 } } }] }
            ]
          }
        }
      ];
      break;
    case 'state_room':
      items = [
        { id: `str_${ts}`, text: 'Gain 1 flax and 1 gold', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { flax: 1, gold: 1 } } }
      ];
      break;
    case 'secret_chamber':
      items = [
        {
          id: `sc_${ts}`,
          text: 'Secret Chamber',
          status: 'TODO',
          actionType: 'CHOICE',
          optional: true,
          data: {
            options: [
              { label: 'Gain 3 flax', cost: {}, items: [{ id: `sc_1_${ts}`, text: 'Gain 3 flax', actionType: 'GAIN', status: 'TODO', data: { goods: { flax: 3 } } }] },
              { label: 'Gain 1 gold', cost: {}, items: [{ id: `sc_2_${ts}`, text: 'Gain 1 gold', actionType: 'GAIN', status: 'TODO', data: { goods: { gold: 1 } } }] }
            ]
          }
        }
      ];
      break;
    case 'treasury':
      items = [
        { id: `tr_${ts}`, text: 'If you have (at least) 3 gold, gain 1 food and 1 gold.', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { food: 1, gold: 1 }, condition: { minGold: 3 } } }
      ];
      break;
    // Original Era I rooms
    case 'seamstery':
      items = [
        { id: `sm_${ts}`, text: 'Pay 1 flax to gain 2 gold', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { flax: 1 }, goods: { gold: 2 } } }
      ];
      break;
    case 'stone_storage':
      items = [
        { id: `ss_${ts}`, text: 'Gain 2 stone', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { stone: 2 } } }
      ];
      break;
    case 'cereal_storage':
      items = [
        { id: `cs_${ts}`, text: 'Gain 2 emmer', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { emmer: 2 } } }
      ];
      break;
    case 'weaving_parlor':
      items = [
        { id: `wp_${ts}`, text: 'Pay 1 flax to gain 2 food', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { flax: 1 }, goods: { food: 2 } } }
      ];
      break;
    case 'wood_supplier':
      items = [
        { id: `ws_${ts}`, text: 'Gain 2 wood', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { wood: 2 } } }
      ];
      break;
    case 'flax_room':
      items = [
        { id: `fr_${ts}`, text: 'Gain 2 flax', actionType: 'GAIN', optional: true, status: 'TODO', data: { goods: { flax: 2 } } }
      ];
      break;
    case 'trading_cave':
      items = [
        { id: `tc_${ts}`, text: 'Pay 1 gold to gain 2 wood and 2 stone', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { gold: 1 }, goods: { wood: 2, stone: 2 } } }
      ];
      break;
    case 'work_room':
      items = [
        { id: `wkr_${ts}`, text: 'Pay 1 food to gain 1 wood and 1 stone', actionType: 'GAIN', optional: true, status: 'TODO', data: { payBefore: { food: 1 }, goods: { wood: 1, stone: 1 } } }
      ];
      break;
    default:
      items = [];
  }

  return decorateWithPassives(items, undefined, cave);
}
