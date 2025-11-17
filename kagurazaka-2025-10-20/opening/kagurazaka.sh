#!/bin/bash

# centeringはこの時点でpathを通していた
# https://github.com/kawarimidoll/dotfiles/commit/02c8906f622b81a40891962281473b039e019cc7

clear

termdown "${1:-20}" -c10 -b -q5

(cfonts "Kagurazaka";cfonts "Terminal 1") | centering | tte blackhole
(cfonts "Kagurazaka";cfonts "Terminal 1") | centering | tte colorshift --travel --travel-direction vertical --reverse-travel-direction --cycles 5

read -p "Next: when it is [Y/n] " ans

carl | centering

read -p "Next: where are we [Y/n] " ans

# mapscii --latitude 35.70055 --longitude 139.734188 --zoom 3
# 施設名を出すためにfork版を使用
bunx github:LunarEclipseCode/mapscii --latitude 35.70055 --longitude 139.734188 --zoom 3

csview kagurazaka-terminal.csv --style rounded | centering | lolcat --animate --spread=1.0

read -p "Next: what are we [Y/n] " ans

echo -e "Kagurazaka\n  Terminal 1" | pokemonsay -N -p alcremie-vanilla-cream-strawberry | centering

message="わたしたちは、

- ターミナルエミュレータ
- シェル
- CLIツール
- TUIツール
- dotfiles
- テキストエディタ

などについて語るエンジニア勉強会です。

主に神楽坂地区周辺での開催を予定しています。
"

echo "$message" | centering | lolcrab -g fruits -a


read -p "Next: let's get excited [Y/n] " ans

message="参加者の皆様、SNS等で実況したり
感想をブログに書いたりして
来られなかった人たちを
悔しがらせてください！！
#kagurazaka_terminal

※撮影可否は各登壇者によります
"

echo "$message" | kittysay | centering

read -p "Next: fire [Y/n] " ans

cacafire

globe -inc2 -g10

astroterm -cC -s 1000 -f 64 -i Tokyo

asciiquarium
