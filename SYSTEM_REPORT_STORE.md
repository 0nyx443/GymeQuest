# Store & Streak System Implementation Report

## Summary of Changes
We successfully implemented a fully functional in-game Store, a daily Streak system, and an Inventory system for the player's profile. Below is the technical breakdown of what was created and updated.

---

## 1. Database Layer (Supabase SQL)
- **`update_store_schema.sql`**: Added a local SQL file to migrate the existing `profiles` table to support `coins`, `current_streak`, `longest_streak`, and `last_active_date`. It also creates two new tables:
  - `store_items`: The master catalog containing item names, prices, descriptions, and effect logic.
  - `user_inventory`: A relational table linking the users' `profile_id` to their purchased `item_id` along with a `quantity` tracking.
- **`install_store_rpc.sql`**: We created a Postgres Remote Procedure Call (RPC) `purchase_store_item` to securely handle atomicity and race conditions during a purchase attempt, automatically deducting the user's coins and depositing the item in `user_inventory`.

## 2. Frontend Screens & Components
- **The Store (`screens/StoreScreen.tsx`)**: Created the Shop interface. It queries the `store_items` table and displays it alongside the user's current coin balance.
- **Navigation (`app/store.tsx` & `components/hub/GreetingHeader.tsx`)**: Added a cart icon on the header of the `DashboardScreen.tsx` that navigates directly to the new `StoreScreen`. 
- **Inventory (`screens/ProfileScreen.tsx` & `components/profile/ProfileInventory.tsx`)**: Added a new section rendered inside the user's Profile page. The component joins the `user_inventory` and `store_items` tables via Supabase query to showcase the player's items and quantities.

## 3. Game Logic (Zustand)
- **State Initialization (`store/gameStore.ts`)**: The Avatar state was extended to locally cache `coins`, `currentStreak`, and `lastActiveDate`.
- **Combat Resolution**: Hooked into `resolveBattle` and `recordBattle`.
  - When a user finishes a battle, the system detects if the user is maintaining a daily workout consecutive sequence (`lastActiveDate`). If they missed a day, the streak breaks. If they worked out yesterday, `currentStreak += 1`.
  - Every enemy now possesses a static `coinReward` (`constants/game.ts`). On victory, the player receives that bounty + 1 coin per rep performed. Defeats grant a scaled "Pity Reward". Every change is pushed asynchronously to Supabase via `syncProfile`.
- **UI Integrations**: Modded `DailyBountyCard.tsx`, `QuestCard.tsx`, and `PostBattleScreen.tsx` to visually display the amount of Loot/Coins offered before combat begins and what was granted after battles complete.

---

## How to Add New Items to the Store

Adding new items to the store is incredibly simple as the frontend is dynamically driven by the database.

**Step 1: Open your Supabase SQL Editor**
Navigate to the SQL Editor on your Supabase dashboard.

**Step 2: Run an INSERT statement**
Execute a SQL command targeting the `store_items` table. The frontend will instantly read the new row and display it in the app.

### Example SQL Template:
```sql
INSERT INTO public.store_items (name, description, price, item_type, effect_value, icon_name)
VALUES (
    'Item Name', 
    'A cool description for the players.', 
    150, -- The price in Coins
    'potion', -- Internal programmatic string for your friend to write logic against
    10, -- How much mathematical impact this item does
    'sparkles' -- Find any Ionicons name (https://icons.expo.fyi/Index)
);
```

### Supported `item_type` logic strings so far:
- `potion` (Deals flat damage or reduces reps)
- `streak_restore` (Rescues a broken daily streak)
- `exp_boost` (Grants 2x multipliers to battles)

*(Your friend can use these `item_type` values later in the code to decide what happens when the player presses the "Use" button in the inventory).*
