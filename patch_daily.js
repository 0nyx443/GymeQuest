const fs = require('fs');
const code = fs.readFileSync('screens/BattleHubScreen.tsx', 'utf-8');

const updated = code.replace(
`        const handleBattlePress = useCallback(() => {
          if (dailyEnemy && avatar.defeatedEnemies.includes(dailyEnemy.id)) {
            Alert.alert('Daily Bounty Claimed!', 'You have already claimed this bounty today. Check out QUESTS for more battles!');
            return;
          }
          animPress(battleScaleAnim, () => {
            if (dailyEnemy) {
              startBattle(dailyEnemy);
              router.push('/combat');
            }
          });
        }, [startBattle, router, dailyEnemy, avatar.defeatedEnemies]);`,
`        const handleBattlePress = useCallback(() => {
          if (dailyEnemy && avatar.defeatedEnemies.includes(dailyEnemy.id)) {
            Alert.alert('Daily Bounty Claimed!', 'You have already claimed this bounty today. Check out QUESTS for more battles!');
            return;
          }
          // Intentionally omitting animPress(battleScaleAnim) so it doesn't animate the Quick Fight button!
          if (dailyEnemy) {
            startBattle(dailyEnemy);
            router.push('/combat');
          }
        }, [startBattle, router, dailyEnemy, avatar.defeatedEnemies]);`
);
fs.writeFileSync('screens/BattleHubScreen.tsx', updated);
