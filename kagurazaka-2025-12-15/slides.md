---
title: わたしのdotfiles活用
sub_title: とりあえず「dotfiles管理してない」状態を脱却しよう
author: kawarimidoll
options:
  end_slide_shorthand: true
---

dotfilesとは
===

- ホームディレクトリ（など）にある `.` で始まる設定ファイル群のこと
  - `ls -la ~` すると見られる
  - `.zshrc` `.vimrc` `.gitconfig` など
- 由来はUNIXの歴史的経緯
  - `ls` の設計中、カレントディレクトリの `.` を読み飛ばしたくなった
  - 「最初の1字がドットのファイルは隠しファイルにする」というコードにした
  - 設定などの隠したいファイルをドット始まりにする文化が生まれた
  - Rob Pikeは後悔してるっぽい

<!-- new_lines: 2 -->

参考：[1つの横着から隠しファイルが生まれた瞬間](https://mattn.kaoriya.net/etc/20190419120056.htm)

<!-- new_lines: 2 -->

## さらに今回話すのは

- これらをGitリポジトリで管理する文化（？）

---

なぜdotfilesを管理するのか
===

要するに「なぜ設定ファイルをGitで管理するのか？」

## 短期的なメリット

- 環境のバックアップ（PCが壊れても安心）
- 新マシンでの設定復元の簡易化
- 複数マシンでの設定共有

## 長期的なメリット

- 履歴管理（`git log`でいつでも前の設定を見られる）
- 設定を言語化する習慣がつく
- 他人のdotfilesを読んで学べる（GitHub上に多数公開）

---

どうdotfilesを管理するのか 甲
===

## 基本的な構造

設定ファイルはホーム直下にある**ことが多い**（他の場合は後述）

```
~/
├── .zshrc
├── .vimrc
└── ...
```

→ とはいえホーム直下のファイルは直接Git管理しづらい

（ホームをそのままGitリポジトリにしたくない）

---

どうdotfilesを管理するのか 乙
===

## 解決策

ホーム直下の設定ファイルはシンボリックリンクにして、実体は別ディレクトリでGit管理する

```
~/dotfiles/           # Git管理するディレクトリ
├── .zshrc            # 実体ファイル
├── .vimrc
└── ...

~/                    # ホームディレクトリ
├── .zshrc -> ~/dotfiles/.zshrc   # シンボリックリンク
├── .vimrc -> ~/dotfiles/.vimrc
└── ...
```

dotfilesの実体を置く場所はどこでもよいけど、ホーム直下が楽

これの配置も自動化している（後述）

---

ホーム直下じゃない設定ファイル
===

ホーム直下にいろいろ置くと散らかるので、最近はXDG Base Directory仕様に従うツールが多い

## XDG Base Directory

設定ファイルの標準的な配置場所の仕様

環境変数で決めることができるが、一般的には以下

```bash
~/.config/   # XDG_CONFIG_HOME（設定ファイル）
~/.cache/    # XDG_CACHE_HOME（キャッシュ）
~/.local/share/   # XDG_DATA_HOME（データ）
~/.local/state/   # XDG_STATE_HOME（状態）
```

たとえばNeovimの設定ファイルは `~/.config/nvim/init.lua` に置く

---

わたしのdotfiles構成
===

ここで見られる：https://github.com/kawarimidoll/dotfiles


```
~/dotfiles
├── .config/       # XDG準拠の設定群
│   ├── nvim/      # Neovim
│   ├── ghostty/   # ターミナル
│   ├── zsh/       # シェル
│   └── ...
│
├── bin/           # 自作スクリプト
├── etc/           # OS別セットアップ
│   ├── mac/
│   └── linux/
│
├── .zshenv        # シェル設定
├── flake.nix      # Nixパッケージ定義
└── install.sh     # セットアップスクリプト
```

- 現在はほぼ設定ファイルは `.config/` に集約していて、トップレベルにはあまりない
- `bin/` に自作実行ファイルを配置、 `etc/` は雑多なスクリプト置き場
  - この辺はunixの伝統的なディレクトリ構成を参考にすると迷わない
- `install.sh` でセットアップを自動化（後述）
- `flake.nix` はNixを使ったCLIツール管理
  - 今回は話さない
  - [記事に書いている](https://zenn.dev/kawarimidoll/articles/0a4ec8bab8a8ba)

---

install.sh
===

別環境でも簡単にセットアップできるようにするためのスクリプト

READMEに書いてるが、以下のコマンド実行で環境を整えられるようにしている

```bash
bash -c "$(curl -L bit.ly/kawarimidots)"
```

この短縮URLは最新の `install.sh` の実ファイルにリダイレクトされる \
（raw.githubusercontent.comが長いため）


**3つのフェーズに分離**
1. **download** : dotfilesを取得
2. **link** : シンボリックリンクを作成
3. **setup** : アプリケーションのインストール

`justfile` とかを使う方法もあるが、ブートストラップならシェルスクリプトが楽

---

実行するとこういうのが出る
===

```
❯ sh install.sh

       _       _    __ _ _
    __| | ___ | |_ / _(_) | ___  ___
   / _` |/ _ \| __| |_| | |/ _ \/ __|
  | (_| | (_) | |_|  _| | |  __/\__ \
   \__,_|\___/ \__|_| |_|_|\___||___/

  author: @kawarimidoll
  repository: https://github.com/kawarimidoll/dotfiles

  This script includes:
  (1) download dotfiles
  (2) link dotfiles
  (3) setup applications

  Select:
  [a] run all above
  [d] only download dotfiles
  [l] only link dotfiles
  [s] only setup applications
  You can use multiple choose like 'dl'
```

---

install.sh: download機能
===

これはほんとにPC最初のセットアップでしか使わない

dotfilesのリポジトリ自体を `~/dotfiles/` に持ってくる処理 \
（ `bash -c "$(curl -L bit.ly/kawarimidots)"` で実行すると `install.sh` しかないため）

1. dotfilesが既にあるなら終了
2. gitがあればgit cloneで取得
3. gitがなければcurlかwgetでダウンロードしてtarballを展開
  - まあ普通はgitがあるはず
4. どれもなければエラー終了

---

install.sh: link機能
===

これはよく使う 便利

```bash {all|2-3|5-8|9-17|18-19|all} +line_numbers
link_dotfiles() {
  # git管理化のドット始まりのパスを取得してループ
  for f in $(git ls-files | grep -E '^\.' | grep -vE '\.git')
  do
    mkdir -p "$HOME/$(dirname "$f")"
    # die_if_errorは自作エラーチェッカー
    # ディレクトリを作成できなかったら終了
    die_if_error "create directory $f"
    if [ -L "$HOME/$f" ]; then
      # 既存リンクのリンク先を取得
      existing_target=$(readlink "$HOME/$f")
      if [ "$existing_target" = "$DOT_DIR/$f" ]; then
        # 既に正しいリンクがあるのでスキップ
        echo "skip (already exists): $f"
        continue
      fi
    fi
    # シンボリックリンクを作成
    ln -sniv "$DOT_DIR/$f" "$HOME/$f"
  done
}
```

冪等性があるので何度実行しても大丈夫

---

install.sh: setup機能
===

こっちも最近は重要性が下がっている

（正直mac環境しか使ってないけど）OSごとのセットアップを分離している

```bash
# OS自動判定
OS='unknown'
if [ "$(uname)" = "Darwin" ]; then
  OS='mac'
elif [ "$(uname)" = "Linux" ]; then
  OS='linux'
fi

# OS別スクリプトを実行
os_install_sh="${DOT_DIR}/etc/${OS}/install.sh"
[ -f "$os_install_sh" ] && sh -c "$os_install_sh"
```

macなら `/etc/mac/install.sh` が実行される

ここにはツールインストール処理などを書く（次項）

---

設定だけじゃなくツールも管理
===

設定が復旧できてもそれを使うツールがなければ意味がない

たとえば macOSならHomebrewでツールをインストールする

```bash
brew bundle dump
```

↑ で `Brewfile` にインストール済みツールを書き出し、 `brew bundle install` で再インストールできる

こういうのをOS別セットアップスクリプトに書いておく

なぜ最近重要性が下がっているかというとCLIツールは（ほぼ）Nix管理に移行したから

再掲：

- [homebrewからnixに移行した記事](https://zenn.dev/kawarimidoll/articles/0a4ec8bab8a8ba)

---

あとは自作便利スクリプトは`bin/`に置いとくと便利
===

たとえば `git` コマンドは、 `git-` で始まる実行ファイルが `PATH` にあればサブコマンドとして認識する

```bash
# ~/dotfiles/bin/git-hello
#!/bin/bash
echo "Hello, git!"
```

↓ 上のようなファイルがあると

```bash
❯ git hello
# Hello, git!
```

---

dotfilesを始めよう
===

## とりあえずdotfiles作ろう

```bash
# dotfilesディレクトリを作成して初期化
mkdir ~/dotfiles && cd ~/dotfiles
git init

# 既存の設定ファイルを移動してシンボリックリンクを作成
mkdir .config
mv ~/.zshrc .zshrc
ln -s ~/dotfiles/.zshrc ~/.zshrc

# コミットを作る
git add .zshrc && git commit -m "add .zshrc"
```

## ポイント

- 既にPC触ってるんだから既に設定ファイルはあるはず
  - まずはそれをホーム以下の構造を保ったまま `~/dotfiles/` に移動してシンボリックリンクを作る
- 1ファイルから始めて少しずつ育てる
  - とかいわずにあるやつを可能な限り全部入れよう
- **秘匿情報を入れないように注意**
- 今後追加するツールの設定は最初からdotfiles管理下に置く

---

<!-- jump_to_middle -->

Thanks!
===

---

<!-- new_lines: 6 -->

![bye](./bye.png)
