<script setup>
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useNav } from "@slidev/client";

// 歌詞を[開始時間(秒), テキスト]のタプル配列として定義
const lyricsParts = [
  [0, "歌詞1"],
  [3, "歌詞2"],
  [12, "歌詞3"],
  [19, "歌詞4"],
  [38, "歌詞5"],
  [45, "歌詞6"],
  [51, "歌詞7"],
  [57, "歌詞8"],
  [64, "歌詞9"],
  [71, "歌詞10"],
  [89, "歌詞11"],
  [94, "歌詞12"],
  [102, "歌詞13"],
  [108, "歌詞14"],
  [114, "歌詞15"],
  [122, "歌詞16"],
  [129, "歌詞17"],
  [135, "歌詞18"],
  [141, "歌詞19"],
  [144, "歌詞20"],
  [146, "歌詞21"],
  [154, "歌詞22"],
  [158, "歌詞23"],
];

const { currentSlideNo } = useNav();
const shouldScroll = ref(false);
const isPaused = ref(false);
const scrollStarted = ref(false);

// キーボードイベントハンドラー
const handleKeyPress = (event) => {
  // pキーで再生/一時停止をトグル
  if (event.key === "p" || event.key === "P") {
    if (!scrollStarted.value) {
      // 初回スタート
      scrollStarted.value = true;
      shouldScroll.value = true;
    } else {
      // 一時停止/再開のトグル
      isPaused.value = !isPaused.value;
    }
  }
};

// 8つ目のスライドに達したときに自動スクロールを開始（オプション）
// コメントアウトすることで手動開始のみにできます
watch(currentSlideNo, (newSlide) => {
  if (newSlide >= 8 && !scrollStarted.value) {
    scrollStarted.value = true;
    shouldScroll.value = true;
  }
});

onMounted(() => {
  // キーボードイベントリスナーを登録
  window.addEventListener("keydown", handleKeyPress);

  // 初期状態でもスライド番号をチェック
  if (currentSlideNo.value >= 8) {
    scrollStarted.value = true;
    shouldScroll.value = true;
  }
});

onUnmounted(() => {
  // クリーンアップ
  window.removeEventListener("keydown", handleKeyPress);
});
// 開始が15秒 文字の入が28秒 ディレイが2秒
// 8つめのスライドに達してから11秒後にスクロール開始
// part[0]に11を足せばずらせるか
</script>

<template>
  <div class="fixed top-0 left-0 w-full h-60px bg-black overflow-hidden z-100">
    <div class="relative h-full">
      <span
        v-for="(part, index) in lyricsParts"
        :key="index"
        class="lyrics-text absolute top-0 left-0 text-white text-24px leading-60px whitespace-nowrap w-800px min-w-800px overflow-visible opacity-0"
        :class="{ scrolling: shouldScroll, paused: isPaused }"
        :style='
          {
            "animation-delay": shouldScroll
              ? `${part[0] + 11}s`
              : "unset",
            "font-family": "Moralerspace Krypton, sans-serif",
            transform: "translateX(100vw)",
          }
        '
      >
        {{ part[1] }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* アニメーションが有効な場合の各要素のスクロール */
.lyrics-text.scrolling {
  opacity: 1 !important;
  animation: scroll-text 15s linear forwards;
}

/* 一時停止状態 */
.lyrics-text.scrolling.paused {
  animation-play-state: paused;
}

@keyframes scroll-text {
  0% {
    transform: translateX(100vw);
  }
  100% {
    transform: translateX(-1000px);
  }
}
</style>
