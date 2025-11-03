<script setup>
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useNav } from "@slidev/client";

// 歌詞を[開始時間(秒), テキスト]のタプル配列として定義
const lyricsParts = [
  [0.2, "歌詞1"],
  [13.71, "歌詞2"],
  [27.43, "歌詞3"],
  [34.78, "歌詞4"],
  [44.13, "歌詞5"],
  [50.88, "歌詞6"],
  [57.63, "歌詞7"],
  [64.6,  "歌詞8"],
  [70, ""],
  [74.53,  "歌詞9"],
  [87.99,  "歌詞10"],
  [101.68, "歌詞11"],
  [109.11, "歌詞12"],
  [118.47, "歌詞13"],
  [125.19, "歌詞14"],
  [131.94, "歌詞15"],
  [138.87, "歌詞16"],
  [144, ""],
  [158.94, "歌詞17"],
  [172.43, "歌詞18"],
  [179.86, "歌詞19"],
  [186, ""],
  [219.76, "歌詞20"],
  [226.51, "歌詞21"],
  [233.31, "歌詞22"],
  [240.23, "歌詞23"],
  [243.49, "歌詞24"],
  [250.16, "歌詞25"],
  [256.94, "歌詞26"],
  [263.89, "歌詞27"],
  [270, ""],
];

const { currentSlideNo } = useNav();
const isPlaying = ref(false);
const isPaused = ref(false);
const visibleLyricIndex = ref(-1);
const startTime = ref(0);
const hideTimers = ref([]);

// キーボードイベントハンドラー
const handleKeyPress = (event) => {
  // pキーで再生/一時停止をトグル
  if (event.key === "p" || event.key === "P") {
    if (!isPlaying.value) {
      // 初回スタート
      isPlaying.value = true;
      startTime.value = performance.now();
      startLyricsDisplay();
    } else {
      // 一時停止/再開のトグル
      isPaused.value = !isPaused.value;
      if (isPaused.value) {
        // 一時停止時: すべてのタイマーをクリア
        hideTimers.value.forEach((timer) => clearTimeout(timer));
        hideTimers.value = [];
      } else {
        // 再開時: 再度タイマーをセットアップ
        startLyricsDisplay();
      }
    }
  }
};

// 歌詞の表示制御
const startLyricsDisplay = () => {
  // 既存のタイマーをクリア
  hideTimers.value.forEach((timer) => clearTimeout(timer));
  hideTimers.value = [];

  const currentTime = performance.now() - startTime.value;

  lyricsParts.forEach((part, index) => {
    const showDelay = part[0] * 1000 - currentTime;

    if (showDelay > 0) {
      // 表示タイマー
      const showTimer = setTimeout(() => {
        if (!isPaused.value) {
          visibleLyricIndex.value = index;

          // 次の歌詞の開始時間まで表示し続ける
          const nextStartTime =
            index + 1 < lyricsParts.length
              ? lyricsParts[index + 1][0] * 1000
              : Infinity;
          const hideDelay =
            nextStartTime - (performance.now() - startTime.value);

          // 非表示タイマー
          const hideTimer = setTimeout(() => {
            if (!isPaused.value && visibleLyricIndex.value === index) {
              visibleLyricIndex.value = -1;
            }
          }, hideDelay);

          hideTimers.value.push(hideTimer);
        }
      }, showDelay);

      hideTimers.value.push(showTimer);
    }
  });
};

onMounted(() => {
  // キーボードイベントリスナーを登録
  window.addEventListener("keydown", handleKeyPress);
});

onUnmounted(() => {
  // クリーンアップ
  window.removeEventListener("keydown", handleKeyPress);
  hideTimers.value.forEach((timer) => clearTimeout(timer));
});
</script>

<template>
  <div
    class="fixed top-0 right-0 h-full bg-black z-100"
    style="width: var(--lyrics-width, 60px); overflow: visible"
  >
    <div class="relative h-full">
      <span
        v-for="(part, index) in lyricsParts"
        :key="index"
        class="lyrics-text absolute text-white text-18px whitespace-nowrap"
        :style="{
          'font-family': '凸版文久明朝, Toppan Bunkyu Mincho, serif',
          'letter-spacing': '0.08em',
          transform: 'rotate(90deg)',
          'transform-origin': 'left top',
          opacity: visibleLyricIndex === index ? 1 : 0,
          transition: 'opacity 0.3s',
          left: '42px',
          top: '10px',
        }"
      >
        {{ part[1] }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.lyrics-text {
  pointer-events: none;
}
</style>
