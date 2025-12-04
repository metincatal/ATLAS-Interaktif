/**
 * Oyun Motoru Test Scripti
 * Node.js ile çalıştırılabilir basit test
 */

// Note: Bu test Node.js'de çalışmaz çünkü ES modules ve fetch kullanıyor
// Bunun yerine browser console'da test edeceğiz

console.log(`
========================================
  OYUN MOTORU TEST PLANI
========================================

Bu script browser console'da çalıştırılmalı.

Test Adımları:
--------------

1. Veri Yükleme:
   await gameController.loadGameData();

2. Oyun Başlatma:
   gameController.startGame('TUR', 2020);

3. Durum Kontrol:
   const state = gameController.getGameState();
   console.log(state);

4. Politika Uygulama:
   const result = await gameController.applyPolicy(
     "Basın Özgürlüğü Reformu",
     "Medya üzerindeki devlet kontrolünü azaltma"
   );
   console.log(result);

5. Durum Güncelleme:
   const newState = gameController.getGameState();
   console.log('Yeni State Power:', newState.statePower);
   console.log('Yeni Society Power:', newState.societyPower);

6. Tur Bitirme:
   const turnResult = gameController.endTurn();
   console.log(turnResult);

========================================
  HIZLI TEST (Copy-Paste)
========================================

import { gameController } from './modules/game/game-controller.js';

// 1. Veri yükle
console.log('1. Veriler yükleniyor...');
await gameController.loadGameData();

// 2. Oyunu başlat
console.log('2. Oyun başlatılıyor...');
gameController.startGame('TUR', 2020);

// 3. İlk durum
const initialState = gameController.getGameState();
console.log('3. Başlangıç durumu:', {
  country: initialState.country,
  year: initialState.currentYear,
  statePower: initialState.statePower,
  societyPower: initialState.societyPower,
  leviathanType: initialState.leviathanType,
  politicalCapital: initialState.politicalCapital.current
});

// 4. Politika uygula
console.log('4. Politika uygulanıyor...');
const policyResult = await gameController.applyPolicy(
  "Basın Özgürlüğü Reformu",
  "Medya üzerindeki devlet kontrolünü azaltma, bağımsız gazeteciliği güçlendirme"
);

console.log('   Sonuç:', {
  success: policyResult.success,
  cost: policyResult.cost,
  newStatePower: policyResult.newFactors?.statePower,
  newSocietyPower: policyResult.newFactors?.societyPower,
  newLeviathanType: policyResult.newFactors?.leviathanType
});

// 5. Güncel durum
const updatedState = gameController.getGameState();
console.log('5. Güncel durum:', {
  turn: updatedState.currentTurn,
  year: updatedState.currentYear,
  statePower: updatedState.statePower,
  societyPower: updatedState.societyPower,
  leviathanType: updatedState.leviathanType,
  politicalCapital: updatedState.politicalCapital.current,
  trailLength: updatedState.history.trail.length,
  eventsCount: updatedState.history.events.length
});

// 6. Paydaş durumları
console.log('6. Paydaş Durumları:');
for (const [group, data] of Object.entries(updatedState.stakeholders)) {
  console.log(\`   \${group}: Influence=\${data.influence.toFixed(2)}, Satisfaction=\${data.satisfaction.toFixed(2)}\`);
}

console.log('\\n✅ Test tamamlandı!');

========================================
`);
