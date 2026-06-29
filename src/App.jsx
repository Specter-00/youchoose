import { useState, useRef, useEffect } from "react";

// ── AI接続モード ──────────────────────────────────────
// Claude.ai Artifact内でのみ直接APIが叩ける。外部公開時はルールエンジンを使う。
// 後でバックエンド中継を用意したら AI_ENDPOINT を設定する。
const AI_ENDPOINT = "https://api.anthropic.com/v1/messages"; // 中継APIを作ったらここを差し替え
const AI_ENABLED = (() => {
  if (typeof window === "undefined") return false;
  // 環境変数で明示的にONにできる（Vite: import.meta.env.VITE_AI_ENABLED="1"）
  try { if (import.meta?.env?.VITE_AI_ENABLED === "1") return true; } catch {}
  // claude.ai / artifact ドメインなら直叩きを試す
  const h = window.location.hostname || "";
  return h.includes("claude") || h.includes("anthropic") || h === "localhost" || h === "";
})();

// ═══════════════════════════════════════════════════════
//  DATA — 好きなこと（6カテゴリー）
// ═══════════════════════════════════════════════════════
const CATS_LIKE = {
  subject:     { name:"教科",          icon:"📐", group:"like", cards:[{e:"✏️",w:"国語",d:"文章を読んだり書いたりする",lv:1},{e:"🔢",w:"算数・数学",d:"数や図形で考える",lv:1},{e:"🌍",w:"社会",d:"歴史や地理を学ぶ",lv:1},{e:"🔬",w:"理科",d:"自然や科学の仕組みを探る",lv:1},{e:"🌐",w:"英語",d:"外国語でコミュニケーション",lv:2},{e:"🎨",w:"美術",d:"絵や工作で表現する",lv:2},{e:"🎵",w:"音楽",d:"歌ったり楽器を演奏する",lv:2},{e:"⚽",w:"体育",d:"体を動かして競ったり遊ぶ",lv:2},{e:"💻",w:"情報・プログラミング",d:"コンピュータで何かを作る",lv:3},{e:"🏛️",w:"倫理・哲学",d:"物事の本質や正しさを考える",lv:3}]},
  sports:      { name:"スポーツ",      icon:"⚽", group:"like", cards:[{e:"🤸",w:"ストレッチ",d:"毎朝軽く体を動かす",lv:1},{e:"🚶",w:"散歩",d:"近所をのんびり歩く",lv:1},{e:"🏊",w:"水泳",d:"プールでゆっくり泳ぐ",lv:1},{e:"🚴",w:"サイクリング",d:"自転車でどこかへ出かける",lv:2},{e:"🧘",w:"ヨガ",d:"呼吸と動きを合わせる",lv:2},{e:"🏃",w:"ランニング",d:"外を走って汗をかく",lv:2},{e:"⛷️",w:"スキー",d:"雪山をスピードで滑る",lv:3},{e:"🏋️",w:"筋トレ",d:"ジムで鍛える",lv:3},{e:"🥊",w:"ボクシング",d:"全力でパンチを打つ",lv:3},{e:"⚽",w:"サッカー",d:"チームで試合をする",lv:3}]},
  personality: { name:"性格",          icon:"🧠", group:"like", cards:[{e:"😊",w:"笑顔",d:"自然と笑顔になれる",lv:1},{e:"💬",w:"おしゃべり",d:"話すのが好き",lv:1},{e:"📚",w:"読書",d:"本の世界に入り込む",lv:1},{e:"🤝",w:"助け合い",d:"困った人を手助けしたい",lv:2},{e:"🎯",w:"目標設定",d:"ゴールに向かって進む",lv:2},{e:"🔍",w:"分析思考",d:"データや根拠を大切にする",lv:2},{e:"🌀",w:"直感力",d:"感覚で物事を判断する",lv:3},{e:"🦁",w:"リーダーシップ",d:"チームを引っ張るのが好き",lv:3},{e:"🌙",w:"内向性",d:"一人の時間がエネルギー源",lv:3},{e:"🔥",w:"情熱家",d:"熱中すると止まらない",lv:3}]},
  life:        { name:"生活",          icon:"🏠", group:"like", cards:[{e:"☀️",w:"朝型生活",d:"早起きして朝を楽しむ",lv:1},{e:"🧹",w:"掃除",d:"部屋をきれいに保つ",lv:1},{e:"🛁",w:"長風呂",d:"ゆっくりお風呂でリラックス",lv:1},{e:"🌿",w:"観葉植物",d:"部屋に緑を飾る",lv:2},{e:"📱",w:"SNS",d:"毎日チェックする",lv:2},{e:"🎮",w:"ゲーム",d:"夜にゲームで遊ぶ",lv:2},{e:"🏕️",w:"キャンプ",d:"自然の中で過ごす",lv:3},{e:"✈️",w:"旅行",d:"知らない土地を探検する",lv:3},{e:"🏙️",w:"都会暮らし",d:"街のエネルギーが好き",lv:3},{e:"🌾",w:"田舎暮らし",d:"自然豊かな環境で暮らす",lv:3}]},
  creative:    { name:"クリエイティブ", icon:"🎨", group:"like", cards:[{e:"✏️",w:"落書き",d:"何気なく絵を描く",lv:1},{e:"📸",w:"写真",d:"スマホで景色を撮る",lv:1},{e:"🎵",w:"音楽鑑賞",d:"好きな曲を聴く",lv:1},{e:"🎭",w:"映画鑑賞",d:"ストーリーに浸る",lv:2},{e:"🖌️",w:"絵を描く",d:"色を使って表現する",lv:2},{e:"📝",w:"文章を書く",d:"気持ちや考えを書き留める",lv:2},{e:"🎸",w:"楽器演奏",d:"自分で音楽を奏でる",lv:3},{e:"🎬",w:"動画編集",d:"映像作品を作る",lv:3},{e:"💻",w:"プログラミング",d:"コードで何かを作る",lv:3},{e:"🎤",w:"歌う",d:"声で表現する",lv:3}]},
  food:        { name:"食事",          icon:"🍜", group:"like", cards:[{e:"☕",w:"コーヒー",d:"毎朝の一杯",lv:1},{e:"🍚",w:"白ご飯",d:"シンプルが一番",lv:1},{e:"🍜",w:"ラーメン",d:"スープまで飲み干す",lv:1},{e:"🌶️",w:"辛い料理",d:"辛さが旨みになる",lv:2},{e:"🍣",w:"お寿司",d:"新鮮なネタが好き",lv:2},{e:"🥗",w:"サラダ",d:"野菜でヘルシーに",lv:2},{e:"🧁",w:"スイーツ作り",d:"自分で作るお菓子",lv:3},{e:"🍷",w:"ワイン",d:"食事に合わせて選ぶ",lv:3},{e:"🌍",w:"エスニック料理",d:"異国の味を楽しむ",lv:3},{e:"🔪",w:"料理全般",d:"一から料理を作る",lv:3}]},
};

// ═══════════════════════════════════════════════════════
//  DATA — 自分のこと（6カテゴリー）
// ═══════════════════════════════════════════════════════
const CATS_SELF = {
  work:      { name:"仕事・働き方",    icon:"💼", group:"self", cards:[{e:"🤝",w:"チームで働く",d:"仲間と力を合わせるのが好き",lv:1},{e:"🧘",w:"一人で集中",d:"黙々と取り組む時間が心地いい",lv:1},{e:"📋",w:"計画通りに進める",d:"段取りを決めて動きたい",lv:1},{e:"⚡",w:"その場の判断",d:"流れに乗って動くのが得意",lv:2},{e:"🌱",w:"安定した環境",d:"じっくり積み上げていきたい",lv:2},{e:"🚀",w:"変化・挑戦",d:"新しいことに飛び込むのが好き",lv:2},{e:"🎯",w:"成果で評価される",d:"結果を出すことにやりがいを感じる",lv:3},{e:"🌿",w:"プロセスを大切に",d:"過程や成長を重視したい",lv:3},{e:"🌍",w:"社会に貢献する",d:"誰かの役に立っていると感じたい",lv:3},{e:"🎨",w:"自分らしく表現する",d:"個性を活かせる仕事がしたい",lv:3}]},
  relation:  { name:"人間関係",        icon:"🫂", group:"self", cards:[{e:"👥",w:"大勢といる",d:"賑やかな場が好きで元気になる",lv:1},{e:"🤫",w:"少人数で深く",d:"一対一や小さなグループが落ち着く",lv:1},{e:"💬",w:"話すのが好き",d:"会話でエネルギーが上がる",lv:1},{e:"👂",w:"聞くのが好き",d:"相手の話を受け取ることに充実感",lv:2},{e:"🌐",w:"広い繋がり",d:"いろんな人と知り合いたい",lv:2},{e:"🔗",w:"深い絆",d:"少数の人と長く付き合いたい",lv:2},{e:"🤗",w:"感情を共有する",d:"喜びも悩みも一緒に感じたい",lv:3},{e:"🧩",w:"適度な距離感",d:"干渉せず尊重し合える関係が好き",lv:3},{e:"🦸",w:"引っ張っていく",d:"リードする立場が自分らしい",lv:3},{e:"🌙",w:"一人の時間が必要",d:"充電のためのソロ時間を大切にしたい",lv:3}]},
  learning:  { name:"学び方",          icon:"📖", group:"self", cards:[{e:"📚",w:"本で独学",d:"自分のペースで深く読み込みたい",lv:1},{e:"🗣️",w:"人から学ぶ",d:"話を聞いて吸収するのが好き",lv:1},{e:"🔬",w:"理論から入る",d:"仕組みや原理を理解してから動く",lv:1},{e:"🏃",w:"まず体験する",d:"やってみてから考えるタイプ",lv:2},{e:"📝",w:"書いて整理",d:"ノートにまとめると頭に入る",lv:2},{e:"🎥",w:"動画・視覚で学ぶ",d:"見て学ぶのが得意",lv:2},{e:"🧑‍🤝‍🧑",w:"みんなで学ぶ",d:"議論や共有で理解が深まる",lv:3},{e:"🔁",w:"繰り返して定着",d:"反復することで本物にしたい",lv:3},{e:"💡",w:"応用・発展が好き",d:"基礎より「使い方」に興味がある",lv:3},{e:"🌀",w:"直感とひらめき",d:"パッとわかる瞬間が好き",lv:3}]},
  space:     { name:"環境・空間",      icon:"🌿", group:"self", cards:[{e:"🌲",w:"自然の中",d:"緑や空気感がある場所で落ち着く",lv:1},{e:"🏙️",w:"都会・街中",d:"活気ある場所がエネルギーになる",lv:1},{e:"🤫",w:"静かな場所",d:"音がない環境で集中できる",lv:1},{e:"☕",w:"カフェ・雑音",d:"適度な賑やかさが心地いい",lv:2},{e:"🏠",w:"家が一番",d:"自分のスペースで過ごしたい",lv:2},{e:"🌙",w:"夜派",d:"夜の静けさに自分らしさを感じる",lv:2},{e:"☀️",w:"朝・日中派",d:"明るい時間に活動したい",lv:3},{e:"🧹",w:"整理された空間",d:"すっきりした環境が好き",lv:3},{e:"🎨",w:"個性的な空間",d:"自分色に染めたインテリアが好き",lv:3},{e:"✈️",w:"旅先・非日常",d:"知らない場所に行くと本音が出る",lv:3}]},
  money:     { name:"お金・消費",      icon:"💰", group:"self", cards:[{e:"🐷",w:"とにかく貯める",d:"将来のために積み上げたい",lv:1},{e:"🎉",w:"体験に使う",d:"思い出になることにお金をかけたい",lv:1},{e:"🛍️",w:"モノを買う",d:"好きなものを手元に置きたい",lv:1},{e:"📈",w:"投資・増やす",d:"お金に働いてもらいたい",lv:2},{e:"🍽️",w:"食事・グルメ",d:"食に惜しまず使いたい",lv:2},{e:"✈️",w:"旅行・移動",d:"移動と体験に価値を感じる",lv:2},{e:"📚",w:"学びに使う",d:"自分への投資が最優先",lv:3},{e:"🎁",w:"人のために使う",d:"贈り物やご馳走が好き",lv:3},{e:"🌿",w:"シンプルに生きる",d:"必要最低限で豊かに過ごしたい",lv:3},{e:"💎",w:"品質にこだわる",d:"少なくていいから本物を選ぶ",lv:3}]},
  emotion:   { name:"感情・内面",      icon:"💭", group:"self", cards:[{e:"😊",w:"気持ちを表に出す",d:"感じたことをそのまま伝えたい",lv:1},{e:"🪨",w:"冷静でいたい",d:"感情に流されず落ち着いて動く",lv:1},{e:"🤗",w:"誰かに話して楽になる",d:"共有することで気持ちが整理できる",lv:1},{e:"🧘",w:"一人で消化する",d:"内側でじっくり向き合うのが好き",lv:2},{e:"🔥",w:"悔しさで燃える",d:"ネガティブな感情をエネルギーにする",lv:2},{e:"🌊",w:"感情をそのまま受け取る",d:"波のように感じることを大切にする",lv:2},{e:"📝",w:"書いて整理する",d:"言語化すると気持ちが落ち着く",lv:3},{e:"🎵",w:"音楽・アートで発散",d:"創るか浸るかで心が整う",lv:3},{e:"💪",w:"行動することで前に進む",d:"動いていると不安が消える",lv:3},{e:"🌱",w:"ゆっくり回復したい",d:"時間をかけて自分のペースで戻る",lv:3}]},
};

const CATS = { ...CATS_LIKE, ...CATS_SELF };
const CAT_KEYS_LIKE = Object.keys(CATS_LIKE);
const CAT_KEYS_SELF = Object.keys(CATS_SELF);
const CAT_KEYS = [...CAT_KEYS_LIKE, ...CAT_KEYS_SELF];

const BIG_CATS = {
  like: { name:"好きなこと", icon:"❤️", desc:"趣味・興味・日常の好き嫌いを探る", keys: CAT_KEYS_LIKE },
  self: { name:"自分のこと", icon:"🔍", desc:"働き方・人間関係・内面を深掘りする", keys: CAT_KEYS_SELF },
};

// ═══════════════════════════════════════════════════════
//  ⑦ USER MODE
// ═══════════════════════════════════════════════════════
const MODES = [
  { key:"highschool", label:"高校生",    icon:"🎒", desc:"進学・学部選び・将来の方向性",    shortDesc:"進学・学部選び",
    tone:"高校生に寄り添う温かく励ます口調で、難しい言葉は避けて。「〜だよ」「〜だね」などフレンドリーに。" },
  { key:"university", label:"大学生",    icon:"🎓", desc:"就活・インターン・自己PR対策",    shortDesc:"就活・自己PR",
    tone:"就活を控えた大学生に向けて、具体的で実践的な言葉で。ESや面接で使えるヒントを含めて。" },
  { key:"worker",     label:"社会人",    icon:"💼", desc:"転職・キャリア・自分を見つめ直す", shortDesc:"転職・キャリア",
    tone:"転職・キャリア転換を考える社会人に向けて。これまでの経験を肯定しつつ、次の一歩を促す言葉で。" },
];

// ═══════════════════════════════════════════════════════
//  MBTI DATA
// ═══════════════════════════════════════════════════════
const MBTI_TRAITS = {
  INTJ:{nick:"建築家",   core:"長期ビジョンと独立思考",         strength:"戦略立案・深い集中・完璧主義的な追求",     inner:"内側に強い信念と理想を持ち、それを静かに実現しようとする"},
  INTP:{nick:"論理学者", core:"純粋な知的好奇心",               strength:"論理分析・概念の深掘り・独創的な問題解決", inner:"「なぜ？」を問い続け、自分だけの答えを見つけることに喜びを感じる"},
  ENTJ:{nick:"指揮官",   core:"目標達成への強い意志",           strength:"リーダーシップ・決断力・効率的な実行",     inner:"世界を変えられると信じ、そのために全力で動く情熱を持つ"},
  ENTP:{nick:"討論者",   core:"アイデアと可能性の探求",         strength:"創造的発想・議論・多角的視点",             inner:"常識を疑い、新しい可能性を見つけることに生きがいを感じる"},
  INFJ:{nick:"提唱者",   core:"深い共感と理想主義",             strength:"洞察力・人の本質を見抜く力・長期的なビジョン",inner:"人の痛みに敏感で、世界をより良くしたいという使命感を持つ"},
  INFP:{nick:"仲介者",   core:"価値観と感情の深さ",             strength:"共感力・創造性・自分だけの世界観",         inner:"内側に豊かな感情世界を持ち、本物の意味を大切にする"},
  ENFJ:{nick:"主人公",   core:"人への深い関心と影響力",         strength:"人を鼓舞する力・共感・協力関係の構築",     inner:"周囲の人が輝くことに自分の喜びを見出す"},
  ENFP:{nick:"運動家",   core:"情熱と人とのつながり",           strength:"発想力・感染する熱量・可能性を信じる力",   inner:"世界は可能性に満ちていると感じ、その興奮を周りと分かち合いたい"},
  ISTJ:{nick:"管理者",   core:"責任感と確かな実行力",           strength:"誠実さ・一貫性・信頼される行動力",         inner:"約束を守り、積み上げることに誇りと安心を感じる"},
  ISFJ:{nick:"擁護者",   core:"献身と細部への気配り",           strength:"観察力・サポート力・記憶力と丁寧さ",       inner:"大切な人やものを守ることに、静かな充実感を見出す"},
  ESTJ:{nick:"幹部",     core:"秩序と結果への執着",             strength:"組織力・明確な判断・責任ある実行",         inner:"ルールと目標を大切にし、周囲に安定をもたらすことに使命を感じる"},
  ESFJ:{nick:"領事",     core:"調和と人への奉仕",               strength:"共感力・協調性・社交性と温かさ",           inner:"周りが笑顔でいることが、自分の幸せにつながっている"},
  ISTP:{nick:"巨匠",     core:"実践的スキルと冷静な観察",       strength:"問題解決・技術習得・冷静な状況判断",       inner:"手を動かしながら考え、仕組みを理解することに深い満足感を持つ"},
  ISFP:{nick:"冒険家",   core:"感性と自由な自己表現",           strength:"審美眼・優しさ・今この瞬間への集中",       inner:"美しいもの、本物の体験に心が動き、それを静かに味わう"},
  ESTP:{nick:"起業家",   core:"行動力と現実適応力",             strength:"即断即決・交渉力・エネルギッシュな実行",   inner:"今この瞬間に全力で、リスクも楽しみながら結果を出す"},
  ESFP:{nick:"エンターテイナー",core:"喜びと人との繋がり",      strength:"表現力・場を盛り上げる力・感情豊かな共感", inner:"生きることを楽しみ、その喜びを周りと一緒に感じたい"},
};

// ═══════════════════════════════════════════════════════
//  TOKENS
// ═══════════════════════════════════════════════════════
const T = {
  bg:          "linear-gradient(145deg,#18181f 0%,#20202a 60%,#1c1a22 100%)",
  glass:       "rgba(255,252,248,0.07)",
  glassBorder: "rgba(255,252,248,0.12)",
  textPri:     "#f4efe9",
  textSec:     "rgba(244,239,233,0.58)",
  textMute:    "rgba(244,239,233,0.30)",
  scarlet:     "#d63a1f",
  scarletBrt:  "#f04828",
  scarletGlow: "rgba(214,58,31,0.32)",
  scarletFade: "rgba(214,58,31,0.11)",
  green:       "#3db87a",
  greenFade:   "rgba(61,184,122,0.13)",
};
const glass = (x={}) => ({background:T.glass,border:`1px solid ${T.glassBorder}`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",...x});
// ═══════════════════════════════════════════════════════
//  ① 永続化（localStorage）
// ═══════════════════════════════════════════════════════
const STORAGE_KEY = "youchoose_v1";
const loadStore = () => {
  try {
    const raw = typeof window!=="undefined" && window.localStorage?.getItem(STORAGE_KEY);
    if(!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
};
const saveStore = (data) => {
  try { window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
};
const clearStore = () => {
  try { window.localStorage?.removeItem(STORAGE_KEY); } catch {}
};

// 診断日フォーマット
const fmtDate = (ts) => {
  if(!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")}`;
};

// Canvas ヘルパー
function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}
function wrapText(ctx,text,x,y,maxW,lh){
  if(!text) return y;
  const chars=[...text];
  let line="";
  for(const ch of chars){
    const test=line+ch;
    if(ctx.measureText(test).width>maxW&&line){
      ctx.fillText(line,x,y);
      line=ch;y+=lh;
    }else line=test;
  }
  if(line){ctx.fillText(line,x,y);y+=lh;}
  return y;
}

// ② クイック診断：各カテゴリーを代表5枚に絞る（lv1×2, lv2×2, lv3×1 を基本に先頭から）
const QUICK_COUNT = 5;
const getCards = (catKey, quick) => {
  const all = CATS[catKey].cards;
  if(!quick) return all;
  // レベルが上がるよう均等サンプリング
  const lv1 = all.filter(c=>c.lv===1);
  const lv2 = all.filter(c=>c.lv===2);
  const lv3 = all.filter(c=>c.lv===3);
  const picked = [...lv1.slice(0,2), ...lv2.slice(0,2), ...lv3.slice(0,1)];
  return picked.length>=QUICK_COUNT ? picked.slice(0,QUICK_COUNT) : all.slice(0,QUICK_COUNT);
};

const IS_MOBILE = typeof window!=="undefined" && window.innerWidth<=430;
// スマホで片手操作しやすいよう重心を下げるオフセット
const MOBILE_LOWER = IS_MOBILE ? "8vh" : 0;
const S = {
  outer:  IS_MOBILE?{display:"flex",flexDirection:"column",minHeight:"100vh",background:T.bg}:{display:"flex",justifyContent:"center",alignItems:"flex-start",minHeight:"100vh",background:"#0f0f13",padding:"14px 0"},
  frame:  IS_MOBILE?{width:"100%",flex:1,display:"flex",flexDirection:"column",background:T.bg,position:"relative",overflow:"hidden"}:{width:375,height:812,borderRadius:44,overflow:"hidden",position:"relative",background:T.bg,border:"1px solid rgba(255,255,255,0.07)",boxShadow:"0 0 0 6px #0a0a0d,0 28px 72px rgba(0,0,0,0.88)",flexShrink:0},
  screen: {width:"100%",height:"100%",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Hiragino Sans','Noto Sans JP',sans-serif",position:"relative",overflow:"hidden",
    ...(IS_MOBILE?{paddingTop:"env(safe-area-inset-top)",paddingBottom:"env(safe-area-inset-bottom)",boxSizing:"border-box"}:{})},
};

// ═══════════════════════════════════════════════════════
//  SHARED
// ═══════════════════════════════════════════════════════
function BgOrbs() {
  return (
    <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,overflow:"hidden"}}>
      <div style={{position:"absolute",top:-60,right:-50,width:220,height:220,borderRadius:"50%",background:"radial-gradient(circle,rgba(214,58,31,0.15) 0%,transparent 70%)"}}/>
      <div style={{position:"absolute",bottom:40,left:-60,width:180,height:180,borderRadius:"50%",background:"radial-gradient(circle,rgba(180,40,20,0.09) 0%,transparent 70%)"}}/>
    </div>
  );
}
function Logo() {
  return (
    <div style={{position:"absolute",top:16,right:18,textAlign:"right",lineHeight:1.2,zIndex:20,pointerEvents:"none"}}>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:3,color:T.scarletBrt}}>YOU</div>
      <div style={{fontSize:10,fontWeight:900,letterSpacing:3,color:T.textSec}}>CHOOSE</div>
    </div>
  );
}
function BackBtn({onPress}) {
  return <button onClick={onPress} style={{...glass({borderRadius:"50%"}),width:34,height:34,color:T.textSec,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent",flexShrink:0}}>←</button>;
}
function PrimaryBtn({children,onClick,disabled,style={}}) {
  const [p,setP]=useState(false);
  return <button onClick={()=>!disabled&&onClick()} onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)} onTouchCancel={()=>setP(false)} style={{background:p?`linear-gradient(135deg,${T.scarletBrt},${T.scarlet})`:`linear-gradient(135deg,${T.scarlet},#b53018)`,border:"none",borderRadius:16,padding:"14px",color:"#fff",fontSize:13,fontWeight:800,letterSpacing:1.2,cursor:"pointer",width:"100%",WebkitTapHighlightColor:"transparent",boxShadow:p?"none":`0 5px 20px ${T.scarletGlow}`,transform:p?"scale(0.97)":"scale(1)",transition:"transform 0.1s",opacity:disabled?0.35:1,flexShrink:0,...style}}>{children}</button>;
}
function GhostBtn({children,onClick,style={}}) {
  const [p,setP]=useState(false);
  return <button onClick={onClick} onTouchStart={()=>setP(true)} onTouchEnd={()=>setP(false)} onTouchCancel={()=>setP(false)} style={{...glass({borderRadius:16}),border:`1px solid ${p?"rgba(255,255,255,0.22)":T.glassBorder}`,padding:"14px",color:p?T.textPri:T.textSec,fontSize:13,fontWeight:600,cursor:"pointer",width:"100%",WebkitTapHighlightColor:"transparent",transform:p?"scale(0.97)":"scale(1)",transition:"transform 0.1s",flexShrink:0,...style}}>{children}</button>;
}

// ═══════════════════════════════════════════════════════
//  ONBOARDING — 名前 + MBTI を1画面で
// ═══════════════════════════════════════════════════════
//  SPLASH — 起動ロゴ
// ═══════════════════════════════════════════════════════
function SplashScreen({onDone}) {
  const [phase,setPhase]=useState(0); // 0:fade-in 1:hold 2:fade-out

  useEffect(()=>{
    const t1=setTimeout(()=>setPhase(1),120);   // フェードイン開始
    const t2=setTimeout(()=>setPhase(2),1900);  // フェードアウト開始
    const t3=setTimeout(()=>onDone(),2500);     // 遷移
    return ()=>{clearTimeout(t1);clearTimeout(t2);clearTimeout(t3);};
  },[]);

  const visible = phase===1;

  return (
    <div onClick={onDone}
      style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative",zIndex:1,overflow:"hidden",cursor:"pointer"}}>
      <BgOrbs/>
      <div style={{
        textAlign:"center",position:"relative",zIndex:2,
        opacity: phase===0?0:phase===2?0:1,
        transform: phase===0?"scale(0.92) translateY(8px)":phase===2?"scale(1.04)":"scale(1) translateY(0)",
        transition:"opacity 0.7s ease, transform 0.7s cubic-bezier(0.2,1,0.3,1)",
      }}>
        {/* ロゴマーク */}
        <div style={{
          width:84,height:84,borderRadius:24,margin:"0 auto 22px",
          background:`linear-gradient(145deg,${T.scarletBrt},${T.scarlet})`,
          display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:`0 12px 40px ${T.scarletGlow}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        }}>
          <span style={{fontSize:42,filter:"drop-shadow(0 2px 6px rgba(0,0,0,0.3))"}}>👆</span>
        </div>
        {/* ロゴタイポ */}
        <div style={{fontSize:26,fontWeight:900,letterSpacing:7,color:T.textPri,marginBottom:6}}>YOU CHOOSE</div>
        <div style={{fontSize:11,color:T.textMute,letterSpacing:3}}>自己分析スワイプ診断</div>
      </div>

      {/* ローディングドット */}
      <div style={{position:"absolute",bottom:64,display:"flex",gap:6,opacity:phase===2?0:0.6,transition:"opacity 0.4s",zIndex:2}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.scarlet,animation:`ycp 1.3s ease-in-out ${i*0.22}s infinite`}}/>
        ))}
      </div>
      <style>{`@keyframes ycp{0%,100%{opacity:.2;transform:scale(.75);}50%{opacity:1;transform:scale(1);}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  ONBOARD — 名前 + MBTI(任意) + モード を1画面に
// ═══════════════════════════════════════════════════════
function OnboardScreen({onDone}) {
  const [name,setName]=useState("");
  const [mbti,setMbti]=useState(null);
  const [mbtiOpen,setMbtiOpen]=useState(false);
  const [mode,setMode]=useState(null);
  const valid=name.trim().length>0 && mode!==null;

  const groups=[
    {label:"分析家",keys:["INTJ","INTP","ENTJ","ENTP"],bg:"rgba(130,90,210,0.13)"},
    {label:"外交官",keys:["INFJ","INFP","ENFJ","ENFP"],bg:"rgba(60,170,110,0.11)"},
    {label:"番人",  keys:["ISTJ","ISFJ","ESTJ","ESFJ"],bg:"rgba(60,130,190,0.11)"},
    {label:"探検家",keys:["ISTP","ISFP","ESTP","ESFP"],bg:"rgba(210,150,50,0.11)"},
  ];

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"0 20px",paddingBottom:MOBILE_LOWER,justifyContent:"center",position:"relative",zIndex:1,overflow:"hidden",gap:0}}>
      <BgOrbs/>

      {/* ロゴ */}
      <div style={{textAlign:"center",marginBottom:20,flexShrink:0}}>
        <div style={{fontSize:13,fontWeight:900,letterSpacing:6,color:T.scarletBrt,marginBottom:3}}>YOU CHOOSE</div>
        <div style={{fontSize:10,color:T.textMute,letterSpacing:2}}>自己分析スワイプ診断</div>
      </div>

      {/* ── 名前 ── */}
      <div style={{...glass({borderRadius:16,padding:"14px 16px"}),marginBottom:9,flexShrink:0}}>
        <div style={{color:T.textMute,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:8}}>名前</div>
        <input type="text" value={name} onChange={e=>setName(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&e.target.blur()}
          placeholder="例：たろう / Taro / 太郎" maxLength={20}
          style={{width:"100%",padding:"11px 13px",background:"rgba(255,255,255,0.06)",border:`1.5px solid ${name.trim()?T.scarlet:T.glassBorder}`,borderRadius:10,color:T.textPri,fontSize:14,outline:"none",WebkitTapHighlightColor:"transparent",fontFamily:"inherit",boxSizing:"border-box",transition:"border-color 0.2s"}}
          onFocus={e=>e.target.style.borderColor=T.scarlet}
          onBlur={e=>e.target.style.borderColor=name.trim()?T.scarlet:T.glassBorder}
        />
      </div>

      {/* ── MBTI（任意・インライン展開） ── */}
      <div style={{...glass({borderRadius:16,padding:"12px 16px"}),marginBottom:9,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{color:T.textMute,fontSize:10,fontWeight:700,letterSpacing:1}}>MBTI</div>
            {mbti
              ? <span style={{color:T.scarletBrt,fontSize:11,fontWeight:800,background:T.scarletFade,border:`1px solid ${T.scarlet}55`,borderRadius:6,padding:"1px 8px"}}>{mbti} · {MBTI_TRAITS[mbti]?.nick}</span>
              : <span style={{color:T.textMute,fontSize:10}}>任意</span>
            }
          </div>
          <button onClick={()=>setMbtiOpen(o=>!o)}
            style={{...glass({borderRadius:8}),border:`1px solid ${T.glassBorder}`,padding:"4px 11px",color:T.textMute,fontSize:10,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
            {mbtiOpen?"閉じる":mbti?"変更":"選ぶ"}
          </button>
        </div>

        {mbtiOpen&&(
          <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:5}}>
            {groups.map(g=>(
              <div key={g.label} style={{...glass({borderRadius:10,padding:"7px 10px"}),background:g.bg}}>
                <div style={{color:T.textMute,fontSize:8,letterSpacing:1.5,marginBottom:5,fontWeight:700}}>{g.label}</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4}}>
                  {g.keys.map(k=>{const a=mbti===k;return(
                    <button key={k} onClick={()=>{setMbti(k);setMbtiOpen(false);}}
                      style={{background:a?T.scarlet:"rgba(255,255,255,0.07)",border:`1px solid ${a?T.scarletBrt:"rgba(255,255,255,0.10)"}`,borderRadius:7,padding:"7px 2px",color:a?"#fff":T.textSec,fontSize:10,fontWeight:a?800:500,cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.1s"}}>
                      {k}
                    </button>
                  );})}
                </div>
              </div>
            ))}
            <button onClick={()=>{setMbti(null);setMbtiOpen(false);}}
              style={{...glass({borderRadius:8,padding:"7px"}),color:T.textMute,fontSize:10,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
              スキップ
            </button>
          </div>
        )}
      </div>

      {/* ── 今の状況（モード）── */}
      <div style={{...glass({borderRadius:16,padding:"12px 16px"}),marginBottom:14,flexShrink:0}}>
        <div style={{color:T.textMute,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:9}}>今の状況</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
          {MODES.map(m=>{const a=mode===m.key;return(
            <button key={m.key} onClick={()=>setMode(m.key)}
              style={{background:a?`rgba(214,58,31,0.18)`:T.glass,border:`1.5px solid ${a?T.scarletBrt:T.glassBorder}`,borderRadius:12,padding:"10px 4px",display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.12s"}}>
              <span style={{fontSize:22,lineHeight:1}}>{m.icon}</span>
              <span style={{color:a?T.scarletBrt:T.textPri,fontSize:11,fontWeight:a?800:600,letterSpacing:0.2,textAlign:"center",lineHeight:1.2}}>{m.label}</span>
              <span style={{color:T.textMute,fontSize:8,textAlign:"center",lineHeight:1.3,letterSpacing:0.1}}>{m.shortDesc||m.desc.split("・")[0]}</span>
            </button>
          );})}
        </div>
      </div>

      <PrimaryBtn onClick={()=>valid&&onDone(name.trim(),mbti,mode)} disabled={!valid}>
        はじめる →
      </PrimaryBtn>
    </div>
  );
}


//  HOME — 大カテゴリー2択 → サブカテゴリーグリッド
// ═══════════════════════════════════════════════════════
function HomeScreen({user,history,quick,setQuick,onStart,onViewPast,onSummary,onReset}) {
  const [picker,setPicker]=useState(null); // 診断済みカードタップ時の選択メニュー catKey
  const [bigCat,setBigCat]=useState(null); // null | 'like' | 'self'
  const doneCount=Object.keys(history).length;
  const allDone=doneCount===CAT_KEYS.length;
  const canSummary=doneCount>=1; // ② 1カテゴリーでも暫定総合OK

  const activeCatKeys = bigCat ? BIG_CATS[bigCat].keys : [];
  const doneLike = CAT_KEYS_LIKE.filter(k=>history[k]).length;
  const doneSelf = CAT_KEYS_SELF.filter(k=>history[k]).length;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 16px 12px",overflow:"hidden",position:"relative",zIndex:1}}>
      <BgOrbs/>

      {/* ユーザーバー */}
      <div style={{...glass({borderRadius:12,padding:"8px 12px"}),display:"flex",alignItems:"center",gap:9,marginBottom:10,flexShrink:0,paddingRight:56}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:`linear-gradient(135deg,${T.scarlet},#8a2010)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:800,flexShrink:0}}>{user.name[0]}</div>
        <div style={{overflow:"hidden",flex:1}}>
          <div style={{color:T.textPri,fontSize:12,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {user.name}
            {user.mbti&&<span style={{marginLeft:6,fontSize:10,color:T.scarletBrt,background:T.scarletFade,border:`1px solid ${T.scarlet}44`,borderRadius:5,padding:"1px 5px",fontWeight:700}}>{user.mbti}</span>}
          </div>
          <div style={{color:T.textMute,fontSize:9,marginTop:1}}>
            {doneCount===0?"カテゴリーを選んでください":`${doneCount} / ${CAT_KEYS.length} 完了`}
          </div>
        </div>
        {canSummary&&<button onClick={onSummary} style={{background:`linear-gradient(135deg,${T.scarlet},#8a2010)`,border:"none",borderRadius:9,padding:"5px 10px",color:"#fff",fontSize:10,fontWeight:800,cursor:"pointer",WebkitTapHighlightColor:"transparent",flexShrink:0,boxShadow:`0 2px 10px ${T.scarletGlow}`}}>{allDone?"総合 ✦":"暫定 ✦"}</button>}
        <button onClick={()=>{if(window.confirm("診断データをすべて削除して最初からやり直しますか？")){onReset();}}} style={{...glass({borderRadius:8}),width:28,height:28,display:"flex",alignItems:"center",justifyContent:"center",color:T.textMute,fontSize:13,cursor:"pointer",WebkitTapHighlightColor:"transparent",flexShrink:0,padding:0}}>🗑️</button>
      </div>

      {/* 進捗バー */}
      {doneCount>0&&<div style={{height:2,background:"rgba(255,255,255,0.06)",borderRadius:1,marginBottom:10,flexShrink:0}}><div style={{height:"100%",background:`linear-gradient(90deg,${T.scarlet},${T.scarletBrt})`,borderRadius:1,width:((doneCount/CAT_KEYS.length)*100)+"%",transition:"width 0.4s ease"}}/></div>}

      {/* ── 大カテゴリー選択（未選択時）── */}
      {!bigCat&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",justifyContent:"center",gap:12,paddingBottom:MOBILE_LOWER}}>
          <div style={{color:T.textMute,fontSize:10,textAlign:"center",letterSpacing:1,marginBottom:4}}>どちらから始めますか？</div>
          {Object.entries(BIG_CATS).map(([k,v])=>{
            const done=k==="like"?doneLike:doneSelf;
            const total=v.keys.length;
            return(
              <button key={k} onClick={()=>setBigCat(k)} style={{...glass({borderRadius:20}),border:`1px solid ${done===total?"rgba(61,184,122,0.3)":T.glassBorder}`,padding:"20px 20px",display:"flex",alignItems:"center",gap:16,cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"background 0.12s",textAlign:"left"}}
                onTouchStart={e=>e.currentTarget.style.background="rgba(255,255,255,0.13)"}
                onTouchEnd={e=>e.currentTarget.style.background=T.glass}
                onTouchCancel={e=>e.currentTarget.style.background=T.glass}>
                <span style={{fontSize:38,lineHeight:1,flexShrink:0}}>{v.icon}</span>
                <div style={{flex:1}}>
                  <div style={{color:T.textPri,fontSize:15,fontWeight:800,marginBottom:4}}>{v.name}</div>
                  <div style={{color:T.textMute,fontSize:11,lineHeight:1.45}}>{v.desc}</div>
                  <div style={{marginTop:6,display:"flex",alignItems:"center",gap:6}}>
                    <div style={{flex:1,height:2,background:"rgba(255,255,255,0.08)",borderRadius:1}}>
                      <div style={{height:"100%",background:done===total?T.green:`linear-gradient(90deg,${T.scarlet},${T.scarletBrt})`,borderRadius:1,width:((done/total)*100)+"%",transition:"width 0.4s"}}/>
                    </div>
                    <span style={{color:done===total?T.green:T.textMute,fontSize:9,fontWeight:700,flexShrink:0}}>{done}/{total}</span>
                  </div>
                </div>
                <span style={{color:T.textMute,fontSize:18}}>›</span>
              </button>
            );
          })}
          {/* ② クイック診断トグル（中央寄せ・大カテゴリーの下） */}
          <div style={{...glass({borderRadius:12,padding:"10px 14px"}),display:"flex",alignItems:"center",gap:10,marginTop:4}}>
            <span style={{fontSize:16}}>{quick?"⚡":"🃏"}</span>
            <div style={{flex:1}}>
              <div style={{color:T.textPri,fontSize:12,fontWeight:700}}>{quick?"クイック診断":"じっくり診断"}</div>
              <div style={{color:T.textMute,fontSize:9,marginTop:1}}>{quick?"各カテゴリー5枚・サクッと":"各カテゴリー10枚・しっかり"}</div>
            </div>
            <button onClick={()=>setQuick(q=>!q)}
              style={{width:46,height:26,borderRadius:13,border:"none",cursor:"pointer",WebkitTapHighlightColor:"transparent",position:"relative",background:quick?`linear-gradient(135deg,${T.scarletBrt},${T.scarlet})`:"rgba(255,255,255,0.12)",transition:"background 0.2s",flexShrink:0,padding:0}}>
              <div style={{position:"absolute",top:3,left:quick?23:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.2s cubic-bezier(0.34,1.56,0.64,1)",boxShadow:"0 2px 6px rgba(0,0,0,0.3)"}}/>
            </button>
          </div>
          <div style={{color:T.textMute,fontSize:9,textAlign:"center",marginTop:4,letterSpacing:0.5}}>好きか嫌いか、直感で選ぼう</div>
        </div>
      )}

      {/* ── サブカテゴリーグリッド（大カテゴリー選択後）── */}
      {bigCat&&(
        <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:0,justifyContent:"center",paddingBottom:MOBILE_LOWER}}>
          {/* 大カテゴリーヘッダー */}
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexShrink:0}}>
            <button onClick={()=>setBigCat(null)} style={{...glass({borderRadius:"50%"}),width:30,height:30,color:T.textSec,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",WebkitTapHighlightColor:"transparent",flexShrink:0}}>←</button>
            <span style={{fontSize:18,lineHeight:1}}>{BIG_CATS[bigCat].icon}</span>
            <span style={{color:T.textPri,fontSize:13,fontWeight:800,flex:1}}>{BIG_CATS[bigCat].name}</span>
          </div>
          {/* 2列×3行グリッド */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gridAutoRows:"1fr",gap:11,maxHeight:"70vh",aspectRatio:"2/2.6",margin:"0 auto",width:"100%"}}>
            {activeCatKeys.map(k=>{
              const v=CATS[k],done=!!history[k];
              const preview=v.cards.slice(0,3).map(c=>c.e).join("  ");
              const dt=done?fmtDate(history[k].date):"";
              return(
                <button key={k} onClick={()=>done?setPicker(k):onStart(k)}
                  style={{...glass({borderRadius:17}),border:`1px solid ${done?"rgba(61,184,122,0.25)":T.glassBorder}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,cursor:"pointer",padding:"9px 6px 7px",WebkitTapHighlightColor:"transparent",position:"relative"}}
                  onTouchStart={e=>e.currentTarget.style.background="rgba(255,255,255,0.13)"}
                  onTouchEnd={e=>e.currentTarget.style.background=T.glass}
                  onTouchCancel={e=>e.currentTarget.style.background=T.glass}>
                  {done&&<div style={{position:"absolute",top:7,right:8,background:T.green,borderRadius:"50%",width:15,height:15,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,color:"#fff",fontWeight:800}}>✓</div>}
                  <span style={{fontSize:24,lineHeight:1}}>{v.icon}</span>
                  <span style={{color:done?T.green:T.textPri,fontSize:11,fontWeight:700,letterSpacing:0.2,textAlign:"center",lineHeight:1.25}}>{v.name}</span>
                  {done
                    ?<><div style={{fontSize:9,color:T.green,opacity:0.8,marginTop:1}}>👍{history[k].likes.length}個</div>
                       <div style={{fontSize:8,color:T.textMute,marginTop:1}}>📅{dt}</div></>
                    :<div style={{fontSize:11,opacity:0.32,letterSpacing:2,marginTop:1}}>{preview}</div>
                  }
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 診断済みカード：結果を見る / 再診断 の選択 */}
      {picker&&(
        <div onClick={()=>setPicker(null)} style={{position:"absolute",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)",padding:"0 28px"}}>
          <div onClick={e=>e.stopPropagation()} style={{...glass({borderRadius:22,padding:"22px 20px"}),width:"100%",maxWidth:320,boxShadow:"0 12px 48px rgba(0,0,0,0.6)"}}>
            <div style={{textAlign:"center",marginBottom:6}}>
              <span style={{fontSize:40}}>{CATS[picker].icon}</span>
            </div>
            <div style={{color:T.textPri,fontSize:16,fontWeight:800,textAlign:"center",marginBottom:2}}>{CATS[picker].name}</div>
            <div style={{color:T.textMute,fontSize:10,textAlign:"center",marginBottom:18}}>📅 {fmtDate(history[picker].date)} に診断済み</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>{const k=picker;setPicker(null);onViewPast(k);}}
                style={{background:`linear-gradient(135deg,${T.scarlet},#b53018)`,border:"none",borderRadius:14,padding:"14px",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",WebkitTapHighlightColor:"transparent",boxShadow:`0 5px 20px ${T.scarletGlow}`}}>
                📄 結果をもう一度見る
              </button>
              <button onClick={()=>{const k=picker;setPicker(null);onStart(k);}}
                style={{...glass({borderRadius:14}),border:`1px solid ${T.glassBorder}`,padding:"14px",color:T.textSec,fontSize:13,fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>
                🔄 もう一度診断する
              </button>
              <button onClick={()=>setPicker(null)}
                style={{background:"none",border:"none",color:T.textMute,fontSize:11,cursor:"pointer",padding:"6px",WebkitTapHighlightColor:"transparent"}}>
                とじる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  INTRO
// ═══════════════════════════════════════════════════════
function IntroScreen({catKey,user,history,quick,onConfirm,onBack}) {
  const cat=CATS[catKey],done=!!history[catKey];
  const cardCount=getCards(catKey,quick).length;
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 20px 18px",overflow:"hidden",position:"relative",zIndex:1}}>
      <BgOrbs/><Logo/>
      <div style={{marginBottom:14,flexShrink:0}}><BackBtn onPress={onBack}/></div>
      <div style={{textAlign:"center",marginBottom:14,flexShrink:0}}>
        <div style={{fontSize:44,lineHeight:1,marginBottom:8,filter:"drop-shadow(0 3px 12px rgba(214,58,31,0.3))"}}>{cat.icon}</div>
        <div style={{color:T.textPri,fontSize:19,fontWeight:800,letterSpacing:1.2,marginBottom:5}}>{cat.name}</div>
        <div style={{display:"inline-flex",alignItems:"center",gap:6,background:quick?"rgba(255,180,50,0.13)":T.scarletFade,border:`1px solid ${quick?"rgba(255,180,50,0.3)":T.scarlet+"44"}`,borderRadius:8,padding:"3px 10px",marginBottom:6}}>
          <span style={{fontSize:10}}>{quick?"⚡":"🃏"}</span>
          <span style={{color:quick?"rgba(255,200,100,0.95)":T.scarletBrt,fontSize:10,fontWeight:700}}>{quick?"クイック":"じっくり"} · 全{cardCount}枚</span>
        </div>
        <div style={{color:T.textMute,fontSize:10}}>{user.name}さん、診断前に確認してください</div>
      </div>
      {done&&<div style={{background:T.greenFade,border:"1px solid rgba(61,184,122,0.25)",borderRadius:11,padding:"9px 13px",marginBottom:10,flexShrink:0}}><div style={{color:T.green,fontSize:11,fontWeight:700}}>✓ 診断済みです。もう一度やり直せます。</div></div>}
      <div style={{...glass({borderRadius:17,padding:"13px 15px"}),marginBottom:9,flexShrink:0}}>
        <div style={{color:T.textSec,fontSize:11,fontWeight:700,letterSpacing:0.8,marginBottom:9,display:"flex",alignItems:"center",gap:6}}><span>📋</span> 診断のルール</div>
        {[{icon:"👍",color:T.scarletBrt,title:"好き",desc:"直感的に「いい！」と思ったらコレ"},{icon:"👎",color:T.textSec,title:"嫌い",desc:"「わからない」「どちらかというと」もコレ"}].map((r,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,background:"rgba(255,255,255,0.04)",borderRadius:9,padding:"8px 10px",marginBottom:i===0?7:0}}>
            <span style={{fontSize:17,lineHeight:1,flexShrink:0}}>{r.icon}</span>
            <div><div style={{color:r.color,fontSize:11,fontWeight:800,marginBottom:1}}>{r.title}</div><div style={{color:T.textMute,fontSize:10,lineHeight:1.4}}>{r.desc}</div></div>
          </div>
        ))}
      </div>
      <div style={{background:T.scarletFade,border:"1px solid rgba(214,58,31,0.2)",borderRadius:11,padding:"10px 13px",marginBottom:16,flexShrink:0}}>
        <div style={{color:"rgba(245,175,155,0.9)",fontSize:11,lineHeight:1.6}}><span style={{fontWeight:800,color:T.scarletBrt}}>ポイント：</span>曖昧な気持ちは「嫌い」へ。本当に心が動いた「好き」だけを選び取りましょう。</div>
      </div>
      <div style={{flex:1,minHeight:8}}/>
      <PrimaryBtn onClick={onConfirm}>診断スタート →</PrimaryBtn>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
//  SWIPE
// ═══════════════════════════════════════════════════════
// ④ 深掘り選択肢（カテゴリーグループ別）
function SwipeScreen({catKey,user,quick,onBack,onFinish}) {
  const cat=CATS[catKey],cards=getCards(catKey,quick);
  const [index,setIndex]=useState(0),[likes,setLikes]=useState([]),[nopes,setNopes]=useState([]);
  const [anim,setAnim]=useState(null),[dragX,setDragX]=useState(0),[pressing,setPressing]=useState(null);
  const txX=useRef(0),txY=useRef(0),drag=useRef(false),busy=useRef(false),velX=useRef(0),lastX=useRef(0),lastT=useRef(0);

  const doSwipe=dir=>{
    if(busy.current)return;busy.current=true;
    const c=cards[index];setAnim(dir==="like"?"right":"left");
    setTimeout(()=>{
      const nL=dir==="like"?[...likes,c]:likes,nN=dir==="nope"?[...nopes,c]:nopes;
      const nx=index+1;setAnim(null);setDragX(0);velX.current=0;busy.current=false;
      if(nx>=cards.length){onFinish(nL,nN);}
      else{if(dir==="like")setLikes(p=>[...p,c]);else setNopes(p=>[...p,c]);setIndex(nx);}
    },400);
  };
  const ts=e=>{if(busy.current)return;txX.current=e.touches[0].clientX;txY.current=e.touches[0].clientY;lastX.current=txX.current;lastT.current=Date.now();drag.current=true;velX.current=0;};
  const tm=e=>{if(!drag.current||busy.current)return;const now=Date.now(),dx=e.touches[0].clientX-txX.current,dy=e.touches[0].clientY-txY.current;if(Math.abs(dx)>Math.abs(dy)){const dt=Math.max(now-lastT.current,1);velX.current=(e.touches[0].clientX-lastX.current)/dt*16;lastX.current=e.touches[0].clientX;lastT.current=now;setDragX(dx);}};
  const te=e=>{if(!drag.current||busy.current)return;drag.current=false;const dx=e.changedTouches[0].clientX-txX.current;if(Math.abs(dx)>50||Math.abs(velX.current)>6)doSwipe(dx>0?"like":"nope");else setDragX(0);};

  const c=cards[index],nxt=cards[index+1];
  const remaining=cards.length-index;
  const lv=c.lv===1?"BASIC":c.lv===2?"MID":"ADV",lvC=c.lv===1?"rgba(244,239,233,0.38)":c.lv===2?"rgba(255,180,130,0.75)":T.scarletBrt;
  const lOp=dragX>20?Math.min((dragX-20)/50,1):(anim==="right"?1:0);
  const nOp=dragX<-20?Math.min((-dragX-20)/50,1):(anim==="left"?1:0);
  const cTx=anim==="right"?`translateX(520px) rotate(28deg)`:anim==="left"?`translateX(-520px) rotate(-28deg)`:`translateX(${dragX*0.5}px) rotate(${dragX*0.018}deg)`;
  const cTr=anim?"transform 0.42s cubic-bezier(0.2,1,0.3,1),opacity 0.36s ease":dragX?"none":"transform 0.28s cubic-bezier(0.34,1.56,0.64,1)";
  const bgTint=lOp>0?`rgba(214,58,31,${lOp*0.13})`:nOp>0?`rgba(100,100,130,${nOp*0.10})`:"transparent";

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative",background:T.bg}}>
      <div style={{position:"absolute",inset:0,background:bgTint,pointerEvents:"none",zIndex:1,transition:"background 0.07s"}}/>
      <BgOrbs/>
      <div style={{position:"relative",zIndex:10,display:"flex",alignItems:"center",gap:12,padding:"18px 22px 0",flexShrink:0}}>
        <BackBtn onPress={onBack}/>
        <span style={{color:T.textSec,fontSize:12,fontWeight:700,flex:1,letterSpacing:0.5}}>{cat.icon} {cat.name}</span>
        <span style={{color:remaining<=3?T.scarletBrt:T.textMute,fontSize:11,fontWeight:remaining<=3?800:400}}>残り{remaining}枚</span>
      </div>
      <div style={{position:"relative",zIndex:10,margin:"14px 22px 0",height:2,background:"rgba(255,255,255,0.07)",borderRadius:2,flexShrink:0}}>
        <div style={{height:"100%",background:`linear-gradient(90deg,${T.scarlet},${T.scarletBrt})`,borderRadius:2,width:((index/cards.length)*100)+"%",transition:"width 0.35s ease"}}/>
      </div>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",position:"relative",zIndex:5,touchAction:"pan-y",padding:"16px 0"}}
        onTouchStart={ts} onTouchMove={tm} onTouchEnd={te} onTouchCancel={()=>{drag.current=false;setDragX(0);velX.current=0;}}>
        {nxt&&<div style={{position:"absolute",width:"78%",maxWidth:310,aspectRatio:"0.72",background:"rgba(255,252,248,0.04)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:32,transform:`scale(${0.92+Math.abs(dragX)/3500}) translateY(${16-Math.abs(dragX)/28}px)`,transition:dragX?"none":"transform 0.3s ease",pointerEvents:"none"}}/>}
        <div style={{position:"relative",width:"82%",maxWidth:320,aspectRatio:"0.72",background:"rgba(255,252,248,0.08)",border:`1px solid rgba(255,252,248,${0.13+lOp*0.07})`,backdropFilter:"blur(28px)",WebkitBackdropFilter:"blur(28px)",borderRadius:32,padding:"28px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:cTr,transform:cTx,opacity:anim?0:1,cursor:"grab",WebkitTapHighlightColor:"transparent",boxShadow:`0 20px 60px rgba(0,0,0,0.5),inset 0 1px 0 rgba(255,255,255,0.10)${lOp>0?`,0 0 50px rgba(214,58,31,${lOp*0.20})`:""}`,willChange:"transform"}}>
          <div style={{position:"absolute",top:22,left:18,color:T.scarletBrt,fontSize:22,fontWeight:900,letterSpacing:3,opacity:lOp,transform:`rotate(-14deg) scale(${0.6+lOp*0.4})`,border:`3px solid ${T.scarletBrt}`,borderRadius:8,padding:"4px 12px",transition:"opacity 0.06s,transform 0.06s",textShadow:`0 0 20px rgba(214,58,31,0.6)`}}>LIKE</div>
          <div style={{position:"absolute",top:22,right:18,color:"rgba(210,190,225,0.85)",fontSize:22,fontWeight:900,letterSpacing:3,opacity:nOp,transform:`rotate(14deg) scale(${0.6+nOp*0.4})`,border:"3px solid rgba(210,190,225,0.6)",borderRadius:8,padding:"4px 12px",transition:"opacity 0.06s,transform 0.06s"}}>NOPE</div>
          <div style={{position:"absolute",top:18,left:"50%",transform:"translateX(-50%)",fontSize:9,padding:"3px 10px",borderRadius:8,fontWeight:700,color:lvC,background:"rgba(0,0,0,0.28)",border:`1px solid ${lvC}44`,letterSpacing:1.5,whiteSpace:"nowrap"}}>{lv}</div>
          <div style={{fontSize:88,lineHeight:1,marginBottom:22,marginTop:4,filter:"drop-shadow(0 8px 24px rgba(0,0,0,0.45))"}}>{c.e}</div>
          <div style={{color:T.textPri,fontSize:28,fontWeight:800,textAlign:"center",letterSpacing:0.5,marginBottom:10}}>{c.w}</div>
          <div style={{color:T.textSec,fontSize:13,textAlign:"center",lineHeight:1.65,letterSpacing:0.1}}>{c.d}</div>
        </div>
      </div>
      <div style={{position:"relative",zIndex:10,flexShrink:0,display:"flex",justifyContent:"center",padding:"0 0 44px"}}>
        <div style={{background:"rgba(22,22,30,0.85)",border:"1px solid rgba(255,255,255,0.10)",backdropFilter:"blur(24px)",WebkitBackdropFilter:"blur(24px)",borderRadius:60,padding:"16px 36px",display:"flex",alignItems:"center",gap:36,boxShadow:"0 10px 40px rgba(0,0,0,0.55)"}}>
          <button onClick={()=>doSwipe("nope")} onTouchStart={()=>setPressing("nope")} onTouchEnd={()=>setPressing(null)} onTouchCancel={()=>setPressing(null)}
            style={{width:88,height:88,borderRadius:"50%",background:pressing==="nope"?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.10)",border:"1.5px solid rgba(255,255,255,0.15)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",WebkitTapHighlightColor:"transparent",transform:pressing==="nope"?"scale(0.87)":"scale(1)",transition:"transform 0.13s cubic-bezier(0.34,1.56,0.64,1),background 0.1s",boxShadow:pressing==="nope"?"inset 0 3px 10px rgba(0,0,0,0.35)":"0 4px 20px rgba(0,0,0,0.35)"}}>
            <span style={{fontSize:38,lineHeight:1}}>👎</span>
            <span style={{fontSize:11,color:T.textMute,fontWeight:700,letterSpacing:0.3}}>嫌い</span>
          </button>
          <button onClick={()=>doSwipe("like")} onTouchStart={()=>setPressing("like")} onTouchEnd={()=>setPressing(null)} onTouchCancel={()=>setPressing(null)}
            style={{width:88,height:88,borderRadius:"50%",background:pressing==="like"?`linear-gradient(145deg,${T.scarletBrt},${T.scarlet})`:`linear-gradient(145deg,#c83418,${T.scarlet})`,border:`1.5px solid rgba(240,80,50,0.45)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,cursor:"pointer",WebkitTapHighlightColor:"transparent",transform:pressing==="like"?"scale(0.87)":"scale(1)",transition:"transform 0.13s cubic-bezier(0.34,1.56,0.64,1),background 0.1s",boxShadow:pressing==="like"?`inset 0 3px 10px rgba(0,0,0,0.25)`:`0 8px 28px ${T.scarletGlow},0 3px 10px rgba(0,0,0,0.3)`}}>
            <span style={{fontSize:38,lineHeight:1}}>👍</span>
            <span style={{fontSize:11,color:"rgba(255,220,208,0.9)",fontWeight:700,letterSpacing:0.3}}>好き</span>
          </button>
        </div>
      </div>
    </div>
  );
}


//  AI HOOK
// ═══════════════════════════════════════════════════════
// ① 強みワード＋⑥ 嫌いの境界線を含む統合AIフック
// ═══════════════════════════════════════════════════════
//  ルールエンジン（AIなしフォールバック分析）
//  カードごとのタグ → 集計 → 文章を組み立てる
// ═══════════════════════════════════════════════════════
// カードのワード → {dim:次元, kw:キーワード, trait:傾向の言葉}
const CARD_TAGS = {
  // ── 性格 ──
  "笑顔":{dim:"social",kw:"ポジティブ",trait:"周りを明るくする力"},
  "おしゃべり":{dim:"social",kw:"社交性",trait:"人と関わることでエネルギーが湧く性質"},
  "読書":{dim:"inner",kw:"知的好奇心",trait:"自分の内側を深めていく姿勢"},
  "助け合い":{dim:"social",kw:"思いやり",trait:"誰かの力になりたいという優しさ"},
  "目標設定":{dim:"drive",kw:"達成志向",trait:"ゴールに向かって進む推進力"},
  "分析思考":{dim:"inner",kw:"論理性",trait:"物事を筋道立てて考える冷静さ"},
  "直感力":{dim:"drive",kw:"感性",trait:"感覚を信じて動ける軽やかさ"},
  "リーダーシップ":{dim:"drive",kw:"主体性",trait:"場を引っ張っていく力強さ"},
  "内向性":{dim:"inner",kw:"自律",trait:"一人の時間で自分を整える落ち着き"},
  "情熱家":{dim:"drive",kw:"熱量",trait:"好きなことに没頭できる集中力"},
  // ── 教科 ──
  "国語":{dim:"inner",kw:"言語感覚",trait:"言葉で世界をとらえる力"},
  "算数・数学":{dim:"logic",kw:"論理性",trait:"筋道立てて考える思考力"},
  "社会":{dim:"inner",kw:"探究心",trait:"世の中の仕組みを知りたい好奇心"},
  "理科":{dim:"logic",kw:"探究心",trait:"なぜ?を突き詰める観察眼"},
  "英語":{dim:"social",kw:"開放性",trait:"外の世界とつながりたい意欲"},
  "美術":{dim:"create",kw:"表現力",trait:"感じたものを形にする感性"},
  "音楽":{dim:"create",kw:"感受性",trait:"音やリズムを楽しむ豊かな感覚"},
  "体育":{dim:"active",kw:"行動力",trait:"体を動かすことを楽しむ活力"},
  "情報・プログラミング":{dim:"logic",kw:"創造的思考",trait:"仕組みを作り出す力"},
  "倫理・哲学":{dim:"inner",kw:"思索",trait:"物事の本質を考え抜く深さ"},
  // ── スポーツ ──
  "ストレッチ":{dim:"calm",kw:"丁寧さ",trait:"自分の体と向き合う習慣"},
  "散歩":{dim:"calm",kw:"マイペース",trait:"自分のリズムを大切にする心"},
  "水泳":{dim:"calm",kw:"持久力",trait:"黙々と続けられる粘り強さ"},
  "サイクリング":{dim:"explore",kw:"行動力",trait:"どこかへ向かう前向きさ"},
  "ヨガ":{dim:"calm",kw:"集中",trait:"心と体を整える内なる落ち着き"},
  "ランニング":{dim:"push",kw:"自己鍛錬",trait:"自分を高めようとする意志"},
  "スキー":{dim:"explore",kw:"挑戦心",trait:"スリルを楽しむ大胆さ"},
  "筋トレ":{dim:"push",kw:"ストイック",trait:"目標へ積み上げる継続力"},
  "ボクシング":{dim:"push",kw:"闘志",trait:"全力をぶつけられる強さ"},
  "サッカー":{dim:"explore",kw:"協調性",trait:"仲間と力を合わせる連帯感"},
  // ── 生活 ──
  "朝型生活":{dim:"order",kw:"規律",trait:"生活を整える自己管理力"},
  "掃除":{dim:"order",kw:"几帳面",trait:"環境を整えたい丁寧さ"},
  "長風呂":{dim:"relax",kw:"癒し",trait:"自分をいたわる時間を持つ余裕"},
  "観葉植物":{dim:"relax",kw:"穏やかさ",trait:"日々に潤いを求める感性"},
  "SNS":{dim:"connect",kw:"好奇心",trait:"世界とつながっていたい気持ち"},
  "ゲーム":{dim:"relax",kw:"没入",trait:"楽しみに集中できる素直さ"},
  "キャンプ":{dim:"explore2",kw:"自然志向",trait:"非日常を味わいたい冒険心"},
  "旅行":{dim:"explore2",kw:"探検心",trait:"未知へ踏み出す好奇心"},
  "都会暮らし":{dim:"connect",kw:"刺激志向",trait:"活気の中で生きる前向きさ"},
  "田舎暮らし":{dim:"relax",kw:"自然志向",trait:"穏やかな環境を求める心"},
  // ── クリエイティブ ──
  "落書き":{dim:"play",kw:"自由さ",trait:"気ままに表現を楽しむ心"},
  "写真":{dim:"observe",kw:"観察眼",trait:"日常の美しさに気づく感性"},
  "音楽鑑賞":{dim:"feel",kw:"感受性",trait:"心を音にゆだねる豊かさ"},
  "映画鑑賞":{dim:"feel",kw:"共感力",trait:"物語に入り込む感情の深さ"},
  "絵を描く":{dim:"make",kw:"表現力",trait:"イメージを形にする創造力"},
  "文章を書く":{dim:"make",kw:"言語化力",trait:"思いを言葉にする力"},
  "楽器演奏":{dim:"make",kw:"探究心",trait:"技を磨き続ける情熱"},
  "動画編集":{dim:"make",kw:"構成力",trait:"作品を組み立てる力"},
  "プログラミング":{dim:"make",kw:"創造的思考",trait:"ゼロから作り出す発想力"},
  "歌う":{dim:"feel",kw:"表現力",trait:"声で気持ちを伝える素直さ"},
  // ── 食事 ──
  "コーヒー":{dim:"habit",kw:"こだわり",trait:"日々の習慣を大切にする心"},
  "白ご飯":{dim:"simple",kw:"素朴さ",trait:"シンプルを良しとする価値観"},
  "ラーメン":{dim:"hearty",kw:"素直さ",trait:"好きなものを楽しむ率直さ"},
  "辛い料理":{dim:"hearty",kw:"刺激志向",trait:"強い体験を求める好奇心"},
  "お寿司":{dim:"quality",kw:"審美眼",trait:"本物を見極める感性"},
  "サラダ":{dim:"simple",kw:"健康志向",trait:"自分を整えようとする意識"},
  "スイーツ作り":{dim:"craft",kw:"丁寧さ",trait:"手をかけて作る楽しみ"},
  "ワイン":{dim:"quality",kw:"こだわり",trait:"味わいを深める大人の感性"},
  "エスニック料理":{dim:"hearty",kw:"開放性",trait:"異文化を楽しむ柔軟さ"},
  "料理全般":{dim:"craft",kw:"創造力",trait:"一から作り上げる力"},
  // ── 仕事・働き方 ──
  "チームで働く":{dim:"team",kw:"協調性",trait:"仲間と成し遂げる連帯感"},
  "一人で集中":{dim:"solo",kw:"集中力",trait:"黙々と打ち込める強さ"},
  "計画通りに進める":{dim:"plan",kw:"計画性",trait:"段取りを大切にする堅実さ"},
  "その場の判断":{dim:"flex",kw:"柔軟性",trait:"流れに乗って動ける適応力"},
  "安定した環境":{dim:"plan",kw:"安定志向",trait:"着実に積み上げる誠実さ"},
  "変化・挑戦":{dim:"flex",kw:"挑戦心",trait:"新しさに飛び込む勇気"},
  "成果で評価される":{dim:"achieve",kw:"成果志向",trait:"結果で示そうとする意志"},
  "プロセスを大切に":{dim:"value",kw:"誠実さ",trait:"過程を大事にする丁寧さ"},
  "社会に貢献する":{dim:"value",kw:"貢献心",trait:"誰かの役に立ちたい使命感"},
  "自分らしく表現する":{dim:"value",kw:"自己表現",trait:"個性を活かしたい想い"},
  // ── 人間関係 ──
  "大勢といる":{dim:"outer",kw:"社交性",trait:"賑やかさで元気になる外向性"},
  "少人数で深く":{dim:"deep",kw:"誠実さ",trait:"一対一を大切にする深さ"},
  "話すのが好き":{dim:"outer",kw:"表現力",trait:"言葉でつながる積極性"},
  "聞くのが好き":{dim:"deep",kw:"傾聴力",trait:"相手を受け止める優しさ"},
  "広い繋がり":{dim:"outer",kw:"開放性",trait:"多くの人と関わる好奇心"},
  "深い絆":{dim:"deep",kw:"忠実さ",trait:"長く付き合う誠実さ"},
  "感情を共有する":{dim:"empathy",kw:"共感力",trait:"気持ちを分かち合う温かさ"},
  "適度な距離感":{dim:"indep",kw:"自律",trait:"互いを尊重する成熟さ"},
  "引っ張っていく":{dim:"lead",kw:"主体性",trait:"先頭に立つリーダー気質"},
  "一人の時間が必要":{dim:"indep",kw:"自律",trait:"自分を充電する内省力"},
  // ── 学び方 ──
  "本で独学":{dim:"self",kw:"自律性",trait:"自分のペースで深める力"},
  "人から学ぶ":{dim:"social2",kw:"吸収力",trait:"人から素直に学ぶ謙虚さ"},
  "理論から入る":{dim:"theory",kw:"論理性",trait:"仕組みを理解する思考力"},
  "まず体験する":{dim:"action",kw:"行動力",trait:"やってみる前向きさ"},
  "書いて整理":{dim:"theory",kw:"整理力",trait:"言語化で理解を深める力"},
  "動画・視覚で学ぶ":{dim:"social2",kw:"直観的理解",trait:"見て掴む感覚的な賢さ"},
  "みんなで学ぶ":{dim:"social2",kw:"協調性",trait:"共有で深める学びの姿勢"},
  "繰り返して定着":{dim:"self",kw:"継続力",trait:"反復で本物にする粘り"},
  "応用・発展が好き":{dim:"action",kw:"応用力",trait:"使い方を探る創造性"},
  "直感とひらめき":{dim:"action",kw:"直感力",trait:"ひらめきを信じる感性"},
  // ── 環境・空間 ──
  "自然の中":{dim:"nature",kw:"穏やかさ",trait:"自然に癒される感性"},
  "都会・街中":{dim:"urban",kw:"刺激志向",trait:"活気を力にする前向きさ"},
  "静かな場所":{dim:"quiet",kw:"集中力",trait:"静けさで力を発揮する性質"},
  "カフェ・雑音":{dim:"urban",kw:"適応力",trait:"程よい賑わいを楽しむ柔軟さ"},
  "家が一番":{dim:"quiet",kw:"安心志向",trait:"自分の空間を大切にする心"},
  "夜派":{dim:"night",kw:"内省",trait:"夜の静けさで自分を深める性質"},
  "朝・日中派":{dim:"day",kw:"規律",trait:"明るい時間に動く健やかさ"},
  "整理された空間":{dim:"order2",kw:"几帳面",trait:"すっきりを好む丁寧さ"},
  "個性的な空間":{dim:"express",kw:"自己表現",trait:"自分色を出したい感性"},
  "旅先・非日常":{dim:"nature",kw:"探検心",trait:"非日常で本音が出る冒険心"},
  // ── お金・消費 ──
  "とにかく貯める":{dim:"save",kw:"堅実さ",trait:"将来を見据える計画性"},
  "体験に使う":{dim:"experience",kw:"体験重視",trait:"思い出を大切にする価値観"},
  "モノを買う":{dim:"own",kw:"愛着",trait:"好きを手元に置く満足感"},
  "投資・増やす":{dim:"save",kw:"先見性",trait:"未来を設計する視点"},
  "食事・グルメ":{dim:"experience",kw:"味わい志向",trait:"豊かさを食に求める感性"},
  "旅行・移動":{dim:"experience",kw:"探検心",trait:"移動と体験を楽しむ好奇心"},
  "学びに使う":{dim:"grow",kw:"成長志向",trait:"自分への投資を惜しまない意志"},
  "人のために使う":{dim:"give",kw:"思いやり",trait:"人に与えることを喜ぶ優しさ"},
  "シンプルに生きる":{dim:"minimal",kw:"足るを知る",trait:"必要十分で満たされる成熟さ"},
  "品質にこだわる":{dim:"own",kw:"審美眼",trait:"本物を選ぶこだわり"},
  // ── 感情・内面 ──
  "気持ちを表に出す":{dim:"express2",kw:"率直さ",trait:"感情を素直に伝える正直さ"},
  "冷静でいたい":{dim:"control",kw:"冷静さ",trait:"感情に流されない落ち着き"},
  "誰かに話して楽になる":{dim:"share",kw:"開放性",trait:"分かち合いで整理する力"},
  "一人で消化する":{dim:"internal",kw:"内省力",trait:"自分の中で向き合う深さ"},
  "悔しさで燃える":{dim:"fuel",kw:"向上心",trait:"負を力に変えるエネルギー"},
  "感情をそのまま受け取る":{dim:"accept",kw:"受容力",trait:"ありのままを味わう豊かさ"},
  "書いて整理する":{dim:"internal",kw:"言語化力",trait:"書くことで心を整える力"},
  "音楽・アートで発散":{dim:"express2",kw:"感受性",trait:"表現で心を解き放つ感性"},
  "行動することで前に進む":{dim:"fuel",kw:"行動力",trait:"動くことで不安を超える強さ"},
  "ゆっくり回復したい":{dim:"accept",kw:"セルフケア",trait:"自分のペースで戻る優しさ"},
};

// 次元 → 寄り添いフレーズ（優しいトーン）
const DIM_PHRASE = {
  // 性格
  social:"人とのつながりの中で輝くタイプ", inner:"自分の内側と静かに向き合えるタイプ", drive:"心が動いた方へ力強く進めるタイプ",
  // 教科
  logic:"筋道を立てて物事を理解するタイプ", create:"感じたものを表現に変えるタイプ", active:"体を動かしながら学ぶタイプ",
  // スポーツ
  calm:"自分のリズムを大切にするタイプ", explore:"挑戦や仲間との時間を楽しむタイプ", push:"自分を高めることに燃えるタイプ",
  // 生活
  order:"暮らしを整えることで安定するタイプ", relax:"穏やかな時間に充たされるタイプ", connect:"刺激や人とのつながりを求めるタイプ", explore2:"非日常へ踏み出したくなるタイプ",
  // クリエイティブ
  play:"自由気ままに楽しむタイプ", observe:"日常の美しさに気づくタイプ", feel:"心で味わうことを大切にするタイプ", make:"自分の手で生み出すタイプ",
  // 食事
  habit:"日々の習慣を慈しむタイプ", simple:"シンプルさに価値を見出すタイプ", hearty:"好きを素直に楽しむタイプ", quality:"本物にこだわるタイプ", craft:"手をかけて作るのが好きなタイプ",
  // 仕事
  team:"仲間と成し遂げることに喜びを感じるタイプ", solo:"一人で深く集中できるタイプ", plan:"着実に積み上げるタイプ", flex:"変化に柔軟に対応できるタイプ", achieve:"成果で示そうとするタイプ", value:"意味や価値を大切にするタイプ",
  // 人間関係
  outer:"人と関わることで元気になるタイプ", deep:"少数と深くつながるタイプ", empathy:"気持ちを分かち合えるタイプ", indep:"自分の時間を大切にするタイプ", lead:"周りを引っ張っていくタイプ",
  // 学び方
  self:"自分のペースで学ぶタイプ", social2:"人との関わりの中で学ぶタイプ", theory:"理論から理解を深めるタイプ", action:"体験から掴み取るタイプ",
  // 環境
  nature:"自然の中で安らぐタイプ", urban:"活気ある場所で力を発揮するタイプ", quiet:"静けさの中で力を発揮するタイプ", night:"夜の静けさで自分を深めるタイプ", day:"明るい時間に動くタイプ", order2:"整った空間を好むタイプ", express:"自分らしい空間を作るタイプ",
  // お金
  save:"将来を見据えて備えるタイプ", experience:"体験に価値を置くタイプ", own:"好きなものを大切にするタイプ", grow:"自分への投資を惜しまないタイプ", give:"人に与えることを喜ぶタイプ", minimal:"必要十分で満たされるタイプ",
  // 感情
  express2:"感情を素直に表すタイプ", control:"冷静に自分を保つタイプ", share:"分かち合うことで整えるタイプ", internal:"自分の中で向き合うタイプ", fuel:"感情を力に変えるタイプ", accept:"ありのままを受け止めるタイプ",
};

// ルールエンジン本体
function analyzeByRules(catKey, likes, nopes, user) {
  const name = user.name || "あなた";
  if(!likes.length && !nopes.length){
    return { msg:"今回は選択がありませんでした。直感で選んでみましょう。", keywords:[], nopeMsg:"", boundary:"" };
  }

  // タグを持つカードだけ集計
  const tagged = likes.map(c=>CARD_TAGS[c.w]).filter(Boolean);

  // 次元の集計
  const dimCount = {};
  tagged.forEach(t=>{dimCount[t.dim]=(dimCount[t.dim]||0)+1;});
  const topDim = Object.keys(dimCount).sort((a,b)=>dimCount[b]-dimCount[a])[0];

  // キーワード（重複除き最大4つ）
  const keywords = [...new Set(tagged.map(t=>t.kw))].slice(0,4);

  // MBTI特性
  const mb = user.mbti && MBTI_TRAITS[user.mbti];
  const mbtiNick = mb ? `${user.mbti}（${mb.nick}）` : "";

  // ── メッセージ3文を組み立て ──
  const likeWords = likes.slice(0,2).map(c=>`「${c.w}」`).join("や");
  const dimPhrase = topDim ? DIM_PHRASE[topDim] : "自分の「好き」を大切にできるタイプ";
  const traits = tagged.slice(0,2).map(t=>t.trait).join("と");

  // 1文目：MBTI × 好き
  const s1 = mb
    ? `${name}さんは、${mbtiNick}の「${mb.core}」を持ちながら、${dimPhrase}ですね。`
    : `${name}さんは、${dimPhrase}ですね。`;
  // 2文目：傾向の具体化
  const s2 = traits
    ? `${likeWords}を選んだあなたの中には、${traits}が息づいています。`
    : `${likeWords}を選んだことに、あなたらしさがあらわれています。`;
  // 3文目：寄り添う行動の促し
  const s3 = `その感覚を信じて、${name}さんらしい一歩を踏み出してみましょう。`;

  const msg = `${s1}${s2}${s3}`;

  // ── 嫌いの分析（境界線）：好きの裏返しで「大切にしている軸」を導く ──
  let nopeMsg = "", boundary = "";
  if(nopes.length){
    const nTagged = nopes.map(c=>CARD_TAGS[c.w]).filter(Boolean);
    const nKw = [...new Set(nTagged.map(t=>t.kw))];
    const nw = nopes.slice(0,2).map(c=>`「${c.w}」`).join("や");
    // 好きの最頻次元（=その人が大切にしているもの）を軸として提示
    const axisPhrase = topDim ? DIM_PHRASE[topDim].replace("タイプ","あり方") : "自分にとって心地よいあり方";
    nopeMsg = `${name}さんが${nw}を「嫌い」と感じたのは、無理に合わせるより、${axisPhrase}を大切にしたいから。その線引きこそ、あなたが譲れない価値観の表れです。`;
    // 境界線ワード：好きキーワードの筆頭、なければ嫌いキーワードの裏返し
    boundary = keywords[0] || (nKw[0] ? `${nKw[0]}より自分らしさ` : "自分らしさ");
  }

  return { msg, keywords, nopeMsg, boundary };
}

// 総合ルールエンジン（全カテゴリー横断・AIなしフォールバック）
function summarizeByRules(history, user){
  const name=user.name||"あなた";
  const doneKeys=CAT_KEYS.filter(k=>history[k]);
  const allLikes=doneKeys.flatMap(k=>history[k].likes||[]);
  if(!allLikes.length) return "まだ「好き」が見つかっていません。各カテゴリーを診断してみましょう。";
  // 全好きの次元集計
  const tagged=allLikes.map(c=>CARD_TAGS[c.w]).filter(Boolean);
  const dimCount={};tagged.forEach(t=>{dimCount[t.dim]=(dimCount[t.dim]||0)+1;});
  const topDims=Object.keys(dimCount).sort((a,b)=>dimCount[b]-dimCount[a]).slice(0,2);
  const keywords=[...new Set(tagged.map(t=>t.kw))].slice(0,3);
  const mb=user.mbti&&MBTI_TRAITS[user.mbti];
  const phrases=topDims.map(d=>DIM_PHRASE[d]).filter(Boolean);
  const s1=mb
    ? `${name}さんの「好き」が示すのは、${user.mbti}（${mb.nick}）らしい「${mb.core}」を軸にした生き方です。`
    : `${name}さんの「好き」が示すのは、一貫した価値観の輪郭です。`;
  const s2=phrases.length
    ? `${doneKeys.length}個のカテゴリーを通して、あなたは${phrases.join("、そして")}という姿が浮かび上がってきました。`
    : `選んだ一つひとつに、あなたらしさがにじんでいます。`;
  const s3=keywords.length
    ? `「${keywords.join("」「")}」——これらはあなたが自然と惹かれる核です。`
    : "";
  const s4=`迷ったときは、この「好き」の感覚に立ち返ってみてください。それがあなたの羅針盤になります。`;
  return `${s1}${s2}${s3}${s4}`;
}

// ES用ルールエンジン（自己PR・軸・将来像）
function esByRules(history, user){
  const name=user.name||"私";
  const isWorker=user.mode==="worker";
  const doneKeys=CAT_KEYS.filter(k=>history[k]);
  const allLikes=doneKeys.flatMap(k=>history[k].likes||[]);
  if(!allLikes.length) return {pr:"まだ診断が完了していません。",axis:"",vision:""};
  const tagged=allLikes.map(c=>CARD_TAGS[c.w]).filter(Boolean);
  const kws=[...new Set(tagged.map(t=>t.kw))].slice(0,3);
  const traits=[...new Set(tagged.map(t=>t.trait))].slice(0,2);
  const mb=user.mbti&&MBTI_TRAITS[user.mbti];
  const kwText=kws.join("・")||"自分らしさ";
  const traitText=traits.join("、")||"自分の感覚を信じる姿勢";

  const pr=isWorker
    ? `私の強みは「${kwText}」です。これまでの経験の中で、${traitText}を大切にしてきました。${mb?`${mb.nick}タイプとして`:""}この強みを活かし、新しい環境でも価値を生み出していきたいと考えています。`
    : `私は「${kwText}」を大切にする人間です。${traitText}が私の根底にあり、${mb?`${mb.nick}らしい視点で`:""}物事に取り組んできました。この強みを活かして、周囲と協力しながら成長していきたいです。`;
  const axis=`私が${isWorker?"転職で":"仕事・進路で"}大切にしたい軸は「${kws[0]||"自分らしさ"}」です。${name==="私"?"":name+"として、"}心が動くものを選び、納得して進める環境を求めています。`;
  const vision=`${name}さんが目指す姿は、「${kwText}」を軸に、自分らしく力を発揮できる未来です。好きなことを通して、周りにも良い影響を広げていけるはずです。`;
  return {pr,axis,vision};
}

function useAI(catKey, likes, nopes, user) {
  const [result, setResult] = useState(null); // {msg, keywords, boundary, nopeMsg}
  const [load, setLoad] = useState(true);

  useEffect(() => {
    const cat = CATS[catKey];
    const lw  = likes.map(c => c.w).join("、");
    const nw  = nopes.map(c => c.w).join("、");
    const mbtiInfo = user.mbti && MBTI_TRAITS[user.mbti]
      ? `MBTIは${user.mbti}（${MBTI_TRAITS[user.mbti].nick}）。本質：「${MBTI_TRAITS[user.mbti].core}」。強み：「${MBTI_TRAITS[user.mbti].strength}」。内側：「${MBTI_TRAITS[user.mbti].inner}」。`
      : "";

    // ⑦ モード別トーン指示
    const modeObj = MODES.find(m=>m.key===user.mode);
    const modeInfo = modeObj ? modeObj.tone : "";
    const modeLabel = modeObj ? modeObj.label : "";

    // ④ 深掘り理由をプロンプトに含める
    const reasonLines = likes.filter(c=>c.reason).map(c=>`「${c.w}」→ ${c.reason}`).join('、');
    const reasonInfo = reasonLines ? `\n【好きを選んだ理由】${reasonLines}` : "";

    if (!likes.length && !nopes.length) {
      setResult({ msg:"今回は選択がありませんでした。直感で選んでみましょう。", keywords:[], boundary:"", nopeMsg:"" });
      setLoad(false); return;
    }

    const prompt = [
      `あなたは自己分析の専門コーチです。${modeLabel?`${modeLabel}向けの`:""} 診断結果を分析してください。`,
      `${modeInfo ? `【口調・トーン指示】${modeInfo}` : ""}`,
      `【ユーザー情報】名前：${user.name} ${mbtiInfo}`,
      `【診断カテゴリー】${cat.name}`,
      `【好きと選んだもの】${lw||"なし"}${reasonInfo}`,
      `【嫌いと選んだもの】${nw||"なし"}`,
      `以下のJSON形式のみで返してください。前置き・説明・コードブロック記号は不要です。`,
      `{`,
      `  "msg": "ちょうど3文（3行）。1文目「${user.name}さんは〜」でMBTI(${user.mbti||"未設定"})の特性とチョイスした好きを結びつけてこの人らしさを言語化。2文目で好きの傾向や強みを具体的に。3文目は行動を促す一言で締め。各文は簡潔に。",`,
      `  "keywords": ["チョイス結果から導く、この人を表すキーワードを単語で。2〜5文字の日本語名詞。例:好奇心,探究,協調","キーワード2","キーワード3","キーワード4"],`,
      `  "nopeMsg": "嫌いリストから「${user.name}さんが〔嫌い〕と感じたものには〜」で始まる1〜2文。嫌いゼロなら空文字。",`,
      `  "boundary": "嫌いから逆算したこの人の軸を10文字以内で。嫌いゼロなら空文字。"`,
      `}`
    ].filter(Boolean).join('\n');

    // AI無効なら即ルールエンジン
    if(!AI_ENABLED){ setResult(analyzeByRules(catKey, likes, nopes, user)); setLoad(false); return; }

    fetch(AI_ENDPOINT, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1000,
        messages:[{ role:"user", content:prompt }] })
    })
    .then(r => r.json())
    .then(d => {
      const raw = d?.content?.map(b => b.text||"").join("").trim();
      try {
        const clean = raw.replace(/^```json|^```|```$/gm,"").trim();
        const parsed = JSON.parse(clean);
        const ruleFallback = analyzeByRules(catKey, likes, nopes, user);
        const aiKeywords = Array.isArray(parsed.keywords) ? parsed.keywords.filter(Boolean).slice(0,4) : [];
        setResult({
          msg:      parsed.msg      || ruleFallback.msg,
          keywords: aiKeywords.length ? aiKeywords : ruleFallback.keywords,
          nopeMsg:  parsed.nopeMsg  || ruleFallback.nopeMsg,
          boundary: parsed.boundary || ruleFallback.boundary,
        });
      } catch {
        // JSON崩れ → ルールエンジンにフォールバック
        setResult(analyzeByRules(catKey, likes, nopes, user));
      }
      setLoad(false);
    })
    .catch(() => {
      // AI接続失敗 → ルールエンジンで分析（それっぽい結果を必ず返す）
      setResult(analyzeByRules(catKey, likes, nopes, user));
      setLoad(false);
    });
  }, []);

  return { result, load };
}

// ═══════════════════════════════════════════════════════
//  RESULT
// ═══════════════════════════════════════════════════════
// ④ 深掘り選択肢
const DRILL_OPTIONS = {
  like: ["好きだから自然にやってる","うまくなりたいと思う","やると気持ちがいい"],
  self: ["自分に当てはまると思う","理想の姿に近い","やってみたい・試したい"],
};

function DrillModal({cat,likes,onDone}) {
  const [queue,setQueue]=useState(()=>likes.map((c,i)=>i)); // 深掘り待ちindex
  const [current,setCurrent]=useState(0); // queueの何番目
  const [answers,setAnswers]=useState({}); // index→reason

  const opts=DRILL_OPTIONS[cat.group]||DRILL_OPTIONS.like;
  const qIdx=queue[current];
  const card=likes[qIdx];

  const pick=(reason)=>{
    const next={...answers,[qIdx]:reason};
    setAnswers(next);
    if(current+1>=queue.length){
      // 全部終わったら結果を返す
      const updated=likes.map((c,i)=>next[i]?{...c,reason:next[i]}:c);
      onDone(updated);
    } else {
      setCurrent(c=>c+1);
    }
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"flex-end",justifyContent:"center",background:"rgba(0,0,0,0.6)",backdropFilter:"blur(8px)"}}>
      <div style={{...glass({borderRadius:"28px 28px 0 0"}),width:"100%",maxWidth:430,padding:"22px 20px 44px",boxShadow:"0 -8px 40px rgba(0,0,0,0.6)"}}>
        {/* 進捗 */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <span style={{color:T.textMute,fontSize:10,letterSpacing:0.5}}>深掘り {current+1} / {queue.length}</span>
          <button onClick={()=>onDone(likes)} style={{color:T.textMute,fontSize:10,background:"none",border:"none",cursor:"pointer",WebkitTapHighlightColor:"transparent"}}>スキップしてとじる</button>
        </div>
        {/* カード */}
        <div style={{textAlign:"center",marginBottom:14}}>
          <div style={{fontSize:44,lineHeight:1,marginBottom:8}}>{card.e}</div>
          <div style={{color:T.textPri,fontSize:17,fontWeight:800,marginBottom:4}}>{card.w}</div>
          <div style={{color:T.scarletBrt,fontSize:11,fontWeight:700,letterSpacing:0.5}}>どんなところが好き？</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {opts.map((opt,i)=>(
            <button key={i} onClick={()=>pick(opt)}
              style={{...glass({borderRadius:13}),border:`1px solid ${T.glassBorder}`,padding:"13px 16px",color:T.textPri,fontSize:13,fontWeight:600,cursor:"pointer",WebkitTapHighlightColor:"transparent",textAlign:"left"}}
              onTouchStart={e=>e.currentTarget.style.background="rgba(255,255,255,0.14)"}
              onTouchEnd={e=>e.currentTarget.style.background=T.glass}
              onTouchCancel={e=>e.currentTarget.style.background=T.glass}>
              {opt}
            </button>
          ))}
          <button onClick={()=>pick(null)}
            style={{color:T.textMute,fontSize:11,background:"none",border:"none",cursor:"pointer",padding:"6px",WebkitTapHighlightColor:"transparent"}}>
            このカードはスキップ
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultScreen({catKey,user,likes,nopes,diagnosedAt,onRetry,onNext,nextCatKey,onUpdateLikes}) {
  const cat=CATS[catKey];
  const [enrichedLikes,setEnrichedLikes]=useState(likes); // 深掘り後に更新
  const {result,load}=useAI(catKey,enrichedLikes,nopes,user);
  const total=enrichedLikes.length+nopes.length,rate=total?Math.round(enrichedLikes.length/total*100):0;
  const [copied,setCopied]=useState(false);
  const [drillOpen,setDrillOpen]=useState(false);
  const [sharing,setSharing]=useState(false);
  const dateStr=fmtDate(diagnosedAt||Date.now());

  // 結果を画像化（Canvas）
  const buildImage=async()=>{
    const W=1080,H=1350,P=80;
    const cv=document.createElement("canvas");cv.width=W;cv.height=H;
    const x=cv.getContext("2d");
    // 背景グラデ
    const g=x.createLinearGradient(0,0,W,H);
    g.addColorStop(0,"#18181f");g.addColorStop(0.6,"#20202a");g.addColorStop(1,"#1c1a22");
    x.fillStyle=g;x.fillRect(0,0,W,H);
    // 緋色オーブ
    const orb=x.createRadialGradient(W-120,140,0,W-120,140,360);
    orb.addColorStop(0,"rgba(214,58,31,0.22)");orb.addColorStop(1,"rgba(214,58,31,0)");
    x.fillStyle=orb;x.fillRect(0,0,W,H);
    // ロゴ
    x.fillStyle="#f04828";x.font="900 30px sans-serif";x.textAlign="left";
    x.fillText("YOU CHOOSE",P,P+30);
    x.fillStyle="rgba(244,239,233,0.4)";x.font="500 22px sans-serif";
    x.textAlign="right";x.fillText(dateStr,W-P,P+30);x.textAlign="left";
    // カテゴリー
    x.fillStyle="#f4efe9";x.font="900 56px sans-serif";
    x.fillText(`${cat.icon} ${cat.name}`,P,P+140);
    // ユーザー
    x.fillStyle="rgba(244,239,233,0.55)";x.font="600 28px sans-serif";
    x.fillText(`${user.name}${user.mbti?"  ·  "+user.mbti:""}  ·  好き率 ${rate}%`,P,P+190);
    // 区切り
    x.strokeStyle="rgba(255,255,255,0.1)";x.lineWidth=2;
    x.beginPath();x.moveTo(P,P+225);x.lineTo(W-P,P+225);x.stroke();
    // キーワード見出し
    let y=P+300;
    x.fillStyle="rgba(255,210,100,0.95)";x.font="800 26px sans-serif";
    x.fillText("💡 あなたのキーワード",P,y);
    y+=70;
    // キーワードバッジ
    const kws=result?.keywords||[];
    let bx=P;
    x.font="800 32px sans-serif";
    kws.forEach(kw=>{
      const tw=x.measureText(kw).width, bw=tw+56;
      if(bx+bw>W-P){bx=P;y+=80;}
      x.fillStyle="rgba(214,58,31,0.18)";
      roundRect(x,bx,y-44,bw,60,16);x.fill();
      x.strokeStyle="rgba(240,72,40,0.5)";x.lineWidth=2;
      roundRect(x,bx,y-44,bw,60,16);x.stroke();
      x.fillStyle="#f4efe9";x.fillText(kw,bx+28,y);
      bx+=bw+18;
    });
    y+=80;
    // 結果メッセージ見出し
    x.fillStyle="#f04828";x.font="800 26px sans-serif";
    x.fillText("✦ あなたの結果",P,y);
    y+=58;
    // 本文（折り返し）
    x.fillStyle="rgba(244,222,214,0.92)";x.font="400 30px sans-serif";
    y=wrapText(x,result?.msg||"",P,y,W-P*2,48);
    y+=30;
    // 譲れない軸
    if(result?.boundary){
      x.fillStyle="rgba(190,160,230,0.9)";x.font="800 24px sans-serif";
      x.fillText(`🪞 譲れない軸：${result.boundary}`,P,y);
      y+=56;
    }
    // 好きリスト
    x.fillStyle="rgba(240,72,40,0.9)";x.font="800 24px sans-serif";
    x.fillText("👍 好き",P,y);y+=46;
    x.fillStyle="rgba(244,239,233,0.8)";x.font="500 26px sans-serif";
    y=wrapText(x,enrichedLikes.map(c=>c.e+c.w).join("  "),P,y,W-P*2,42);
    // フッター
    x.fillStyle="rgba(244,239,233,0.3)";x.font="500 22px sans-serif";x.textAlign="center";
    x.fillText("YOU CHOOSE — 自己分析スワイプ診断",W/2,H-60);
    return cv;
  };

  const handleShare=async()=>{
    setSharing(true);
    try{
      const cv=await buildImage();
      const blob=await new Promise(res=>cv.toBlob(res,"image/png"));
      const file=new File([blob],`youchoose_${cat.name}_${dateStr}.png`,{type:"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){
        await navigator.share({files:[file],title:"YOU CHOOSE 診断結果",text:`${user.name}の${cat.name}診断結果`});
      }else{
        // フォールバック：ダウンロード
        const url=URL.createObjectURL(blob);
        const a=document.createElement("a");a.href=url;a.download=file.name;a.click();
        URL.revokeObjectURL(url);
      }
    }catch(e){/* キャンセル等は無視 */}
    setSharing(false);
  };

  const handleCopy=()=>{
    const kwLine=result?.keywords?.length?`\n強みワード：${result.keywords.join(" / ")}`:"";
    const bdLine=result?.boundary?`\n譲れない軸：${result.boundary}`:"";
    const text=`【YOU CHOOSE 診断結果】\n${user.name}${user.mbti?" ("+user.mbti+")":""}${user.mode?" / "+(MODES.find(m=>m.key===user.mode)?.label||""):""}\nカテゴリー：${cat.name}\n好き率：${rate}%${kwLine}${bdLine}\n\n👍 好き：${enrichedLikes.map(c=>c.w+(c.reason?`(${c.reason})`:"")).join("、")||"なし"}\n👎 嫌い：${nopes.map(c=>c.w).join("、")||"なし"}\n\nあなたの結果：${load?"分析中...":(result?.msg||"")}`;
    navigator.clipboard?.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  const LoadingDots=({label})=>(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.scarlet,animation:`ycp 1.3s ease-in-out ${i*0.22}s infinite`}}/>)}</div>
      <span style={{color:T.textMute,fontSize:11}}>{label}</span>
    </div>
  );

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 16px 14px",overflow:"hidden",position:"relative",zIndex:1}}>
      <BgOrbs/><Logo/>

      {/* タイトル */}
      <div style={{textAlign:"center",marginBottom:10,flexShrink:0}}>
        <div style={{color:T.textPri,fontSize:17,fontWeight:800,letterSpacing:1.2}}>診断結果</div>
        <div style={{color:T.textMute,fontSize:10,marginTop:3}}>
          {cat.icon} {cat.name} · <span style={{color:T.scarletBrt,fontWeight:700}}>{rate}%</span> 好き
          {user.mbti&&<span style={{marginLeft:6}}>· {user.mbti}</span>}
        </div>
        <div style={{color:"rgba(244,239,233,0.25)",fontSize:9,marginTop:2,letterSpacing:0.5}}>📅 {dateStr}</div>
      </div>

      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",touchAction:"pan-y",display:"flex",flexDirection:"column",gap:9,minHeight:0}}>

        {/* ① 強みワード */}
        <div style={{...glass({borderRadius:14,padding:"12px 14px"}),flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:9}}>
            <span style={{fontSize:13}}>💡</span>
            <span style={{color:"rgba(255,210,100,0.95)",fontSize:10,fontWeight:800,letterSpacing:0.8}}>あなたのキーワード</span>
          </div>
          {load?<LoadingDots label="キーワードを抽出中…"/>
            :result?.keywords?.length
              ?<div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {result.keywords.map((kw,i)=>(
                  <div key={i} style={{background:`rgba(214,58,31,0.13)`,border:`1.5px solid ${T.scarlet}66`,borderRadius:10,padding:"7px 14px",color:T.textPri,fontSize:13,fontWeight:800,letterSpacing:0.5,boxShadow:`0 2px 12px ${T.scarletGlow}`}}>{kw}</div>
                ))}
              </div>
              :<span style={{color:T.textMute,fontSize:11}}>好きを選ぶと表示されます</span>
          }
        </div>

        {/* AIメッセージ */}
        <div style={{...glass({borderRadius:17,padding:"12px 15px"}),flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:7}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <span style={{fontSize:11}}>✦</span>
              <span style={{color:T.scarletBrt,fontSize:10,fontWeight:800,letterSpacing:0.8}}>あなたの結果</span>
            </div>
            <button onClick={handleCopy} style={{...glass({borderRadius:7}),border:`1px solid ${copied?"rgba(61,184,122,0.4)":T.glassBorder}`,padding:"3px 9px",color:copied?T.green:T.textMute,fontSize:9,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.2s"}}>
              {copied?"✓ コピー済":"📋 コピー"}
            </button>
          </div>
          {load?<LoadingDots label={`${user.name}さんの選択を分析中…`}/>
            :<div style={{color:"rgba(244,222,214,0.92)",fontSize:12,lineHeight:1.85}}>{result?.msg}</div>
          }
        </div>

        {/* ⑥ 嫌いの分析 */}
        {(load||(result?.nopeMsg&&nopes.length>0))&&(
          <div style={{background:"rgba(120,100,160,0.08)",border:"1px solid rgba(160,130,200,0.22)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:14,padding:"12px 14px",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}>
              <span style={{fontSize:12}}>🪞</span>
              <span style={{color:"rgba(190,160,230,0.9)",fontSize:10,fontWeight:800,letterSpacing:0.8}}>あなたの譲れない軸</span>
              {!load&&result?.boundary&&(
                <span style={{marginLeft:"auto",background:"rgba(160,130,200,0.18)",border:"1px solid rgba(160,130,200,0.3)",borderRadius:8,padding:"2px 9px",color:"rgba(210,185,240,0.9)",fontSize:10,fontWeight:800}}>{result.boundary}</span>
              )}
            </div>
            {load?<LoadingDots label="境界線を読み取り中…"/>
              :<div style={{color:"rgba(210,195,230,0.85)",fontSize:12,lineHeight:1.8}}>{result?.nopeMsg}</div>
            }
          </div>
        )}

        {/* 好き・嫌いリスト */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[
            {items:enrichedLikes,label:`👍 好き (${enrichedLikes.length})`,hC:T.scarletBrt,iC:T.textPri,op:1},
            {items:nopes,        label:`👎 嫌い (${nopes.length})`,        hC:"rgba(160,130,200,0.8)",iC:"rgba(200,185,220,0.75)",op:0.85},
          ].map((col,ci)=>(
            <div key={ci}>
              <div style={{...glass({borderRadius:8,padding:"5px 8px"}),fontSize:10,fontWeight:700,color:col.hC,textAlign:"center",marginBottom:6}}>{col.label}</div>
              {col.items.length===0?<div style={{color:T.textMute,fontSize:10,textAlign:"center",padding:"10px 4px"}}>なし</div>
                :col.items.map((c,i)=>(
                  <div key={i} style={{...glass({borderRadius:8,padding:"6px 9px"}),marginBottom:5,display:"flex",alignItems:"center",gap:6,opacity:col.op}}>
                    <span style={{fontSize:14,lineHeight:1,flexShrink:0}}>{c.e}</span>
                    <div>
                      <div style={{fontSize:10,fontWeight:700,color:col.iC,lineHeight:1.2}}>{c.w}</div>
                      {c.reason&&<div style={{fontSize:8,color:T.textMute,marginTop:1,lineHeight:1.2}}>{c.reason}</div>}
                    </div>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      </div>

      {/* ボタン群 */}
      <div style={{marginTop:9,display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
        {/* 画像シェア + 深掘り を横並び */}
        <div style={{display:"flex",gap:7}}>
          <button onClick={handleShare} disabled={load||sharing}
            style={{...glass({borderRadius:14}),flex:1,border:`1px solid rgba(120,180,255,0.3)`,padding:"12px",color:sharing?T.textMute:"rgba(150,200,255,0.95)",fontSize:12,fontWeight:700,cursor:load||sharing?"default":"pointer",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:load?0.4:1}}>
            <span style={{fontSize:14}}>{sharing?"⏳":"📤"}</span> {sharing?"作成中…":"画像で保存・シェア"}
          </button>
          {enrichedLikes.length>0&&(
            <button onClick={()=>setDrillOpen(true)}
              style={{...glass({borderRadius:14}),flex:1,border:`1px solid rgba(255,180,80,0.3)`,padding:"12px",color:"rgba(255,200,100,0.9)",fontSize:12,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{fontSize:14}}>🔍</span> さらに深掘り
            </button>
          )}
        </div>
        {nextCatKey
          ?<PrimaryBtn onClick={onNext}>次のカテゴリーへ → {CATS[nextCatKey].icon} {CATS[nextCatKey].name}</PrimaryBtn>
          :<PrimaryBtn onClick={onNext}>✦ 総合AIに見てもらう</PrimaryBtn>
        }
        <GhostBtn onClick={onRetry}>🔄 ホームに戻る</GhostBtn>
      </div>

      {/* ④ 深掘りモーダル */}
      {drillOpen&&enrichedLikes.length>0&&(
        <DrillModal cat={cat} likes={enrichedLikes} onDone={(updated)=>{setEnrichedLikes(updated);onUpdateLikes&&onUpdateLikes(catKey,updated,nopes);setDrillOpen(false);}}/>
      )}

      <style>{`@keyframes ycp{0%,100%{opacity:.2;transform:scale(.75);}50%{opacity:1;transform:scale(1);}}`}</style>
    </div>
  );
}


function SummaryScreen({user,history,onHome,onES}) {
  const [msg,setMsg]=useState(""),[load,setLoad]=useState(true),[copied,setCopied]=useState(false);
  const totalDone=Object.keys(history).length;
  useEffect(()=>{
    const allLikes=CAT_KEYS.flatMap(k=>(history[k]?.likes||[]));
    if(!allLikes.length){setMsg("まだ「好き」が見つかっていません。各カテゴリーを診断してみましょう。");setLoad(false);return;}
    const breakdown=CAT_KEYS.filter(k=>history[k]).map(k=>`【${CATS[k].name}】好き：${history[k].likes.map(c=>c.w).join("、")||"なし"}`).join("\n");
    const mbtiDetail=user.mbti&&MBTI_TRAITS[user.mbti]?`\n【MBTIプロフィール】\nタイプ：${user.mbti}（${MBTI_TRAITS[user.mbti].nick}）\n本質：${MBTI_TRAITS[user.mbti].core}\n強み：${MBTI_TRAITS[user.mbti].strength}\n内側の特徴：${MBTI_TRAITS[user.mbti].inner}`:"";
    const prompt=`あなたは自己分析の専門コーチです。${user.name}さんの診断結果を総合的に分析してください。\n\n【カテゴリー別「好き」一覧】\n${breakdown}${mbtiDetail}\n\n【出力条件】\n- 4〜5文の日本語メッセージ\n- 「${user.name}さんの「好き」が示すのは〜」で始める\n- MBTIがある場合はその本質・強みと各カテゴリーの「好き」を有機的に結びつける\n- キーワードを2〜3個引用する\n- 最後は人生の指針になる一言で締める\n- 本文のみ返す`;
    if(!AI_ENABLED){ setMsg(summarizeByRules(history,user)); setLoad(false); return; }
    fetch(AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:prompt}]})})
    .then(r=>r.json()).then(d=>{setMsg(d?.content?.map(b=>b.text||"").join("")||summarizeByRules(history,user));setLoad(false);})
    .catch(()=>{setMsg(summarizeByRules(history,user));setLoad(false);});
  },[]);
  const handleCopy=()=>{
    const bycat=CAT_KEYS.filter(k=>history[k]).map(k=>`${CATS[k].icon}${CATS[k].name}：${history[k].likes.map(c=>c.w).join("、")||"なし"}`).join("\n");
    const text=`【YOU CHOOSE 総合診断】\n${user.name}${user.mbti?" ("+user.mbti+")":""}\n\n${bycat}\n\nあなたの総合結果：\n${load?"分析中...":msg}`;
    navigator.clipboard?.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  };
  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 16px 14px",overflow:"hidden",position:"relative",zIndex:1}}>
      <BgOrbs/><Logo/>
      <div style={{textAlign:"center",marginBottom:12,flexShrink:0}}>
        <div style={{color:T.textPri,fontSize:17,fontWeight:800,letterSpacing:1.2}}>総合診断</div>
        <div style={{color:T.textMute,fontSize:10,marginTop:3}}>{user.name}さん · {totalDone}/{CAT_KEYS.length}カテゴリー{totalDone<CAT_KEYS.length?"（暫定）":"完了"}{user.mbti&&` · ${user.mbti}`}</div>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",touchAction:"pan-y",display:"flex",flexDirection:"column",gap:9,minHeight:0}}>
        <div style={{background:"rgba(214,58,31,0.08)",border:"1px solid rgba(214,58,31,0.22)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:18,padding:"14px 16px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>✦</span><span style={{color:T.scarletBrt,fontSize:11,fontWeight:800,letterSpacing:0.8}}>あなたの総合結果</span></div>
            <button onClick={handleCopy} style={{...glass({borderRadius:7}),border:`1px solid ${copied?"rgba(61,184,122,0.4)":T.glassBorder}`,padding:"3px 9px",color:copied?T.green:T.textMute,fontSize:9,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.2s"}}>{copied?"✓ コピー済":"📋 コピー"}</button>
          </div>
          {load
            ?<div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 0"}}><div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:T.scarlet,animation:`ycp 1.3s ease-in-out ${i*0.22}s infinite`}}/>)}</div><span style={{color:T.textMute,fontSize:11}}>全カテゴリーを横断分析中…</span></div>
            :<div style={{color:"rgba(244,222,214,0.95)",fontSize:13,lineHeight:1.85,letterSpacing:0.1}}>{msg}</div>
          }
        </div>
        <div style={{...glass({borderRadius:15,padding:"12px 14px"}),flexShrink:0}}>
          <div style={{color:T.textSec,fontSize:10,fontWeight:700,letterSpacing:1,marginBottom:10}}>カテゴリー別 好きリスト</div>
          {["like","self"].map(gk=>(
            <div key={gk} style={{marginBottom:10}}>
              <div style={{color:T.textMute,fontSize:9,fontWeight:700,letterSpacing:1,marginBottom:6}}>{BIG_CATS[gk].icon} {BIG_CATS[gk].name}</div>
              {BIG_CATS[gk].keys.filter(k=>history[k]).map(k=>{
                const h=history[k],cat=CATS[k];
                return(
                  <div key={k} style={{marginBottom:7,paddingBottom:7,borderBottom:"1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{color:T.textSec,fontSize:10,fontWeight:700,marginBottom:4}}>{cat.icon} {cat.name} <span style={{color:T.scarletBrt,fontWeight:800}}>👍{h.likes.length}</span></div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {h.likes.length===0?<span style={{color:T.textMute,fontSize:9}}>なし</span>:h.likes.map((c,i)=><span key={i} style={{...glass({borderRadius:6}),padding:"3px 7px",fontSize:9,color:T.textPri,fontWeight:600}}>{c.e}{c.w}</span>)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:9,display:"flex",flexDirection:"column",gap:7,flexShrink:0}}>
        <PrimaryBtn onClick={onES}>📝 自己分析シートを作る</PrimaryBtn>
        <GhostBtn onClick={onHome}>← ホームに戻る</GhostBtn>
      </div>
      <style>{`@keyframes ycp{0%,100%{opacity:.2;transform:scale(.75);}50%{opacity:1;transform:scale(1);}}`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════
//  ⑧ ES出力画面
// ═══════════════════════════════════════════════════════
function ESScreen({user,history,onBack}) {
  const [esResult,setEsResult]=useState(null);
  const [load,setLoad]=useState(true);
  const [copied,setCopied]=useState(false);

  const allLikes=CAT_KEYS.flatMap(k=>(history[k]?.likes||[]).map(c=>({...c,cat:CATS[k].name})));
  const breakdown=CAT_KEYS.filter(k=>history[k]).map(k=>`[${CATS[k].name}] 好き:${history[k].likes.map(c=>c.w+(c.reason?`(${c.reason})`:"")).join("、")||"なし"} 嫌い:${history[k].nopes.map(c=>c.w).join("、")||"なし"}`).join("\n");
  const mbtiInfo=user.mbti&&MBTI_TRAITS[user.mbti]?`MBTI:${user.mbti}(${MBTI_TRAITS[user.mbti].nick}) 本質:${MBTI_TRAITS[user.mbti].core} 強み:${MBTI_TRAITS[user.mbti].strength}`:"";
  const modeObj=MODES.find(m=>m.key===user.mode);
  const modeLabel=modeObj?modeObj.label:"";
  const isSocialWorker=user.mode==="worker";

  useEffect(()=>{
    if(!allLikes.length){setEsResult({pr:"まだ診断が完了していません。",axis:"",vision:""});setLoad(false);return;}
    const prompt=[
      `あなたは就活・転職のプロコーチです。${user.name}さん（${modeLabel}）の自己分析結果からES・自己PR文を生成してください。`,
      mbtiInfo?`[MBTI] ${mbtiInfo}`:"",
      `[診断結果]\n${breakdown}`,
      `以下のJSON形式のみで返してください。前置き・コードブロック記号は不要です。`,
      `{`,
      `  "pr": "${isSocialWorker?"「私の強みは〜」で始まる転職用自己PR。これまでの経験を活かす視点で150字程度。":"「私は〜人間です」で始まる就活用自己PR。強みと根拠と活かし方を含む150字程度。"}",`,
      `  "axis": "「私が${isSocialWorker?"転職で":"仕事・進路で"}大切にしたい軸は〜」で始まる軸の言語化。嫌いリストからの逆算も含め80字程度。",`,
      `  "vision": "「${user.name}さんが目指す姿は〜」で始まる将来像。好きと強みから自然につながる未来を60字程度。"`,
      `}`
    ].filter(Boolean).join('\n');
    if(!AI_ENABLED){ setEsResult(esByRules(history,user)); setLoad(false); return; }
    fetch(AI_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1200,messages:[{role:"user",content:prompt}]})})
    .then(r=>r.json())
    .then(d=>{
      const raw=d?.content?.map(b=>b.text||"").join("").trim();
      try{const p=JSON.parse(raw.replace(/^```json|^```|```$/gm,"").trim());setEsResult({pr:p.pr||"",axis:p.axis||"",vision:p.vision||""});}
      catch{setEsResult(esByRules(history,user));}
      setLoad(false);
    })
    .catch(()=>{setEsResult(esByRules(history,user));setLoad(false);});
  },[]);

  const handleCopy=()=>{
    if(!esResult)return;
    const text=`【YOU CHOOSE 自己分析シート】\n${user.name}${user.mbti?" ("+user.mbti+")":""}${modeLabel?" / "+modeLabel:""}\n\n■ 自己PR\n${esResult.pr}\n\n■ 大切にしたい軸\n${esResult.axis}\n\n■ 将来像\n${esResult.vision}`;
    navigator.clipboard?.writeText(text).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});
  };

  const sections=esResult?[
    {label:"📝 自己PR",key:"pr",color:T.scarletBrt,bg:"rgba(214,58,31,0.08)",border:"rgba(214,58,31,0.22)"},
    {label:"🧭 大切にしたい軸",key:"axis",color:"rgba(255,210,100,0.95)",bg:"rgba(255,180,50,0.07)",border:"rgba(255,180,50,0.2)"},
    {label:"🌅 将来像",key:"vision",color:"rgba(100,200,160,0.95)",bg:"rgba(60,180,120,0.07)",border:"rgba(60,180,120,0.2)"},
  ]:[];

  return(
    <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 16px",overflow:"hidden",position:"relative",zIndex:1}}>
      <BgOrbs/><Logo/>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexShrink:0}}>
        <BackBtn onPress={onBack}/>
        <div style={{flex:1}}>
          <div style={{color:T.textPri,fontSize:15,fontWeight:800}}>自己分析シート</div>
          <div style={{color:T.textMute,fontSize:10,marginTop:1}}>{modeLabel} · ES・面接対策</div>
        </div>
        <button onClick={handleCopy} style={{...glass({borderRadius:9}),border:`1px solid ${copied?"rgba(61,184,122,0.4)":T.glassBorder}`,padding:"6px 12px",color:copied?T.green:T.textMute,fontSize:10,fontWeight:700,cursor:"pointer",WebkitTapHighlightColor:"transparent",transition:"all 0.2s"}}>
          {copied?"✓ コピー済":"📋 全コピー"}
        </button>
      </div>
      <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",touchAction:"pan-y",display:"flex",flexDirection:"column",gap:10,minHeight:0}}>
        {load
          ?<div style={{...glass({borderRadius:16,padding:"24px"}),display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
            <div style={{display:"flex",gap:4}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:T.scarlet,animation:`ycp 1.3s ease-in-out ${i*0.22}s infinite`}}/>)}</div>
            <span style={{color:T.textMute,fontSize:11}}>ES文を生成中…</span>
          </div>
          :sections.map(s=>(
            <div key={s.key} style={{background:s.bg,border:`1px solid ${s.border}`,backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderRadius:16,padding:"13px 15px",flexShrink:0}}>
              <div style={{color:s.color,fontSize:10,fontWeight:800,letterSpacing:0.8,marginBottom:8}}>{s.label}</div>
              <div style={{color:T.textPri,fontSize:12,lineHeight:1.85}}>{esResult[s.key]||"—"}</div>
            </div>
          ))
        }
        <div style={{...glass({borderRadius:13,padding:"11px 14px"}),flexShrink:0}}>
          <div style={{color:T.textMute,fontSize:9,lineHeight:1.6}}>
            💡 AIが生成した文章です。あなた自身の言葉に書き直してから使いましょう。面接では自分のエピソードを添えると説得力が増します。
          </div>
        </div>
      </div>
      <style>{`@keyframes ycp{0%,100%{opacity:.2;transform:scale(.75);}50%{opacity:1;transform:scale(1);}}`}</style>
    </div>
  );
}


//  ROOT
// ═══════════════════════════════════════════════════════
export default function App() {
  const [screen,setScreen]=useState("splash");
  const [user,setUser]=useState({name:"",mbti:null,mode:null});
  const [catKey,setCatKey]=useState(null);
  const [result,setResult]=useState({likes:[],nopes:[],date:null});
  const [history,setHistory]=useState({});
  const [quick,setQuick]=useState(false);   // ② クイック診断モード
  const [restored,setRestored]=useState(false); // 復元済みデータがあるか
  const hydrated=useRef(false);

  // ① 起動時に localStorage から復元
  useEffect(()=>{
    const s=loadStore();
    if(s&&s.user&&s.user.name){
      setUser(s.user);
      setHistory(s.history||{});
      if(typeof s.quick==="boolean") setQuick(s.quick);
      setRestored(true);
    }
    hydrated.current=true;
  },[]);

  // ① user / history / quick が変わるたび保存（オンボード完了後のみ）
  useEffect(()=>{
    if(!hydrated.current) return;
    if(!user.name) return;
    saveStore({user,history,quick});
  },[user,history,quick]);

  const saveHistory=(k,l,n)=>setHistory(h=>({...h,[k]:{likes:l,nopes:n,date:Date.now()}}));
  const getNextCatKey=()=>CAT_KEYS.filter(k=>k!==catKey&&!history[k])[0]||null;
  const handleFinish=(l,n)=>{const dt=Date.now();saveHistory(catKey,l,n);setResult({likes:l,nopes:n,date:dt});setScreen("result");};
  // 過去結果を開く（ホームの診断済みカードから）
  const handleViewPast=(k)=>{const h=history[k];if(!h)return;setCatKey(k);setResult({likes:h.likes,nopes:h.nopes,date:h.date});setScreen("result");};
  const handleResultNext=()=>{const nx=getNextCatKey();nx?(setCatKey(nx),setScreen("intro")):setScreen("summary");};

  // ① リセット
  const handleReset=()=>{
    clearStore();
    setUser({name:"",mbti:null,mode:null});
    setHistory({});
    setQuick(false);
    setRestored(false);
    setScreen("onboard");
  };

  // splash後の遷移先：保存データがあればhome、なければonboard
  const afterSplash=()=>{
    const s=loadStore();
    setScreen(s&&s.user&&s.user.name ? "home" : "onboard");
  };

  // 画面ごとの「戻る先」。null は戻れない（または専用処理）
  const goBack=()=>{
    switch(screen){
      case "intro":   setScreen("home"); break;
      case "result":  setScreen("home"); break;
      case "summary": setScreen("home"); break;
      case "es":      setScreen("summary"); break;
      // swipe（チョイス中）・splash・onboard・home は右スワイプ戻り無効
      default: break;
    }
  };

  // 右スワイプで戻る（チョイス中=swipe は除外）
  const edgeX=useRef(0), edgeY=useRef(0), edgeActive=useRef(false);
  const SWIPE_DISABLED = screen==="swipe" || screen==="splash" || screen==="onboard" || screen==="home";
  const onTouchStartEdge=e=>{
    if(SWIPE_DISABLED){edgeActive.current=false;return;}
    edgeX.current=e.touches[0].clientX;
    edgeY.current=e.touches[0].clientY;
    edgeActive.current=true;
  };
  const onTouchEndEdge=e=>{
    if(!edgeActive.current)return;
    edgeActive.current=false;
    const dx=e.changedTouches[0].clientX-edgeX.current;
    const dy=e.changedTouches[0].clientY-edgeY.current;
    // 横移動が十分大きく、縦移動が小さい右スワイプ
    if(dx>70 && Math.abs(dy)<60) goBack();
  };

  return (
    <div style={S.outer}>
      <div style={S.frame} onTouchStart={onTouchStartEdge} onTouchEnd={onTouchEndEdge}>
        <div style={S.screen}>
          {screen==="splash"   && <SplashScreen onDone={afterSplash}/>}
          {screen==="onboard"  && <OnboardScreen onDone={(n,m,md)=>{setUser({name:n,mbti:m,mode:md});setScreen("home");}}/>}
          {screen==="home"     && <HomeScreen user={user} history={history} quick={quick} setQuick={setQuick} onStart={k=>{setCatKey(k);setScreen("intro");}} onViewPast={handleViewPast} onSummary={()=>setScreen("summary")} onReset={handleReset}/>}
          {screen==="intro"    && <IntroScreen catKey={catKey} user={user} history={history} quick={quick} onConfirm={()=>setScreen("swipe")} onBack={()=>setScreen("home")}/>}
          {screen==="swipe"    && <SwipeScreen catKey={catKey} user={user} quick={quick} onBack={()=>setScreen("intro")} onFinish={handleFinish}/>}
          {screen==="result"   && <ResultScreen catKey={catKey} user={user} likes={result.likes} nopes={result.nopes} diagnosedAt={result.date} onUpdateLikes={(k,l,n)=>setHistory(h=>({...h,[k]:{likes:l,nopes:n,date:h[k]?.date||Date.now()}}))} onRetry={()=>setScreen("home")} onNext={handleResultNext} nextCatKey={getNextCatKey()}/>}
          {screen==="summary"  && <SummaryScreen user={user} history={history} onHome={()=>setScreen("home")} onES={()=>setScreen("es")}/>}
          {screen==="es"       && <ESScreen user={user} history={history} onBack={()=>setScreen("summary")}/>}
        </div>
      </div>
    </div>
  );
}
