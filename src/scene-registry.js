// Public scene numbers follow gallery order; retired scenes live only as city components.
export const SCENES=[
 {number:'01',route:'city',entry:'scene',title:'被自然收回的城市街角'},
 {number:'02',route:'rainy',entry:'rainy',title:'雨夜便利店'},
 {number:'03',route:'onsen',entry:'onsen',title:'山中温泉旅馆'},
 {number:'04',route:'study',entry:'study',title:'剪辑师的午后书房'},
 {number:'05',route:'summit',entry:'summit',title:'风雪之巅'},
 {number:'06',route:'desert',entry:'desert',title:'沙海来风'},
 {number:'07',route:'ocean',entry:'ocean',title:'蓝海跃影'}
];

// Fullscreen optical experiences have their own camera and no miniature base.
// Keep them out of the planet's geometry/biome export pipeline.
export const EXPERIENCES=[
 {route:'glass',entry:'glass',title:'光隙 · 磨砂玻璃'}
];
