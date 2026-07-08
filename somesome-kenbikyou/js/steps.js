/* steps.js — HE染色の8工程データ
   脱パラ→水洗→ヘマトキシリン→分別→ブルーイング→エオジン→脱水→封入
   type: "soak"(つけて長おし) / "choice"(えらぶ) / "tap"(ふきふき) / "dip"(つけるだけ)
   param: 仕上がりにひびく要素のキー（staining.js とそろえる） */
(function (global) {
  "use strict";

  var STEPS = [
    {
      id: "deparaffin",
      icon: "🫧",
      label: "だつパラ",
      liquid: "#dfe7ef",
      mood: "happy",
      say: "ぷくぷく とかそう🫧",
      type: "dip",
      param: null,
      tissue: "#efe6ee"
    },
    {
      id: "wash",
      icon: "💧",
      label: "みずあらい",
      liquid: "#bfe6ff",
      mood: "wink",
      say: "どのおみず？💧",
      type: "choice",
      param: "water",
      choices: [
        { emoji: "💎", label: "きれい", value: 1.0 },
        { emoji: "🚰", label: "ふつう", value: 0.62 },
        { emoji: "🧊", label: "つめたい", value: 0.32 }
      ],
      tissue: "#e9eef2"
    },
    {
      id: "hematoxylin",
      icon: "🟣",
      label: "むらさきのえき",
      liquid: "#7e6bd6",
      mood: "wow",
      say: "むらさきに そめよう🟣",
      type: "soak",
      param: "hematoxylin",
      tissue: "#8f79cf"
    },
    {
      id: "differentiate",
      icon: "🧪",
      label: "ぶんべつ",
      liquid: "#ffd9ec",
      mood: "wink",
      say: "ちょっと もどす🧪",
      type: "soak",
      param: "differentiate",
      tissue: "#a98fd0"
    },
    {
      id: "bluing",
      icon: "🔵",
      label: "あおくする",
      liquid: "#8ac6ff",
      mood: "happy",
      say: "きれいな あおに🔵",
      type: "soak",
      param: "bluing",
      tissue: "#7f8fd6"
    },
    {
      id: "eosin",
      icon: "🌸",
      label: "ピンクのえき",
      liquid: "#ff9db8",
      mood: "love",
      say: "ピンクを たそう🌸",
      type: "soak",
      param: "eosin",
      tissue: "#c78bb0"
    },
    {
      id: "dehydrate",
      icon: "🥤",
      label: "だっすい",
      liquid: "#e7f0d8",
      mood: "happy",
      say: "みずを ぬくよ🥤",
      type: "soak",
      param: "dehydTime",
      tissue: "#cf9ab4"
    },
    {
      id: "mount",
      icon: "✨",
      label: "ふきふき＆フタ",
      liquid: "#fff0c9",
      mood: "wow",
      say: "ふきふきして フタ✨",
      type: "tap",
      param: "dehydSuff",
      tissue: "#d3a0b6"
    }
  ];

  global.STEPS = STEPS;
})(window);
