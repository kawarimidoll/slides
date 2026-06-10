---
title: "GitHubのPRをレビューするTUI"
options:
  end_slide_shorthand: true
theme:
  override:
    footer:
      style: empty
---

<!-- new_lines: 10 -->
<!-- alignment: center -->
<!-- font_size: 2 -->

最近

<!-- pause -->

AIエージェントにコードを書かせる機会が増えた

<!-- pause -->

<!-- font_size: 1 -->
　　　　　　　　　　　　　レビュー
<!-- font_size: 2 -->
人間の仕事は **確認**

---

<!-- new_lines: 10 -->
<!-- alignment: center -->
<!-- font_size: 2 -->

CLIでエージェントを使うことが多い

<!-- pause -->

エージェントにPRも作ってもらう

<!-- pause -->

そのままターミナルでレビューできると楽

<!-- pause -->

TUIでPRを見たい

---

<!-- new_lines: 10 -->
<!-- alignment: center -->
<!-- font_size: 3 -->

つくったもの

<!-- pause -->

<!-- font_size: 1 -->
　　　　プルリク主義

<!-- font_size: 3 -->
**gh-prism**

---

<!-- jump_to_middle -->
<!-- alignment: center -->
<!-- font_size: 2 -->

既存ツールの課題

(開発開始当時)

---

<!-- new_lines: 10 -->
<!-- alignment: center -->
<!-- font_size: 3 -->

dlvhdr/diffnav

<!-- pause -->
<!-- font_size: 2 -->

PR全体差分は見られるがコミットごとに見られない
（ハッシュを一つずつ指定しないといけない）

---

<!-- new_lines: 10 -->
<!-- alignment: center -->
<!-- font_size: 3 -->

yoshiko-pg/difit (--tui)

<!-- pause -->
<!-- font_size: 2 -->

PR全体差分は見られるがコミットごとに見られない
（ハッシュを一つずつ指定しないといけない）

---

<!-- new_lines: 10 -->
<!-- alignment: center -->
<!-- font_size: 2 -->

コミットごとに確認したくない？

<!-- pause -->

コミットメッセージと一緒に確認したいよね

<!-- pause -->

gh-prismで確認するか〜〜〜〜〜


```bash
gh prism <PR_NUMBER>
```

<!-- font_size: 1 -->

qで進む
