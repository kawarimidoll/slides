#!/bin/bash

echo '----- press start -----' | centering | tte matrix --rain-time 20

read -r -p '' _ans

clear

(cfonts "Terminal";cfonts "Night") | centering | tte sweep --final-gradient-direction diagonal

read -r -p 'Next: introduce [Enter] ' _ans

clear

printf "こんばんは\n\n"

read -r -p '' _ans

printf "\e]66;s=3;こんばんは\a\n\n\n"

read -r -p '' _ans

printf "\e]66;s=2;kawarimidollです\a\n\n"

mcat ./kawarimidoll.png --opts "width=10%"

read -r -p '' _ans

printf "\n\n自己紹介は \e[34m\e[4mhttps://kawarimidoll.github.io\e[m にあります\n"

qrtool encode -t ascii "https://kawarimidoll.github.io" | sed -e 's/#/█/g;1,3d' | head -n -2

read -r -p '' _ans

# echo -e 'Terminal Night 開催うれし〜〜〜 ✌️\n'

mcat ./parrot.gif

hearts=(🩷 🧡 💛 💚 💙 🩵 💜 🤎 🩶 🤍 💖)
count=${#hearts[@]}

  for ((loop = 0; loop < 5; loop++)); do
    for ((i = 0; i < count; i++)); do
      printf "\r%s Terminal Night 開催うれし〜〜〜 %s" "${hearts[i]}" "${hearts[i]}"
      sleep 0.1
    done
  done

  printf "\n"

  read -r -p '' _ans

  printf "\e]66;s=2;今日の話は聴いても別に生産性とか効率とか上がりません\aので\n\n"

  echo 'ゆったり聴いてください'

  read -r -p '' _ans

  printf "\n\e[33;1mターミナル面白いな\e[mと思ってもらえたらうれしい\n\n"
  printf "\e[9mそして沼ろう！\e[m\n\n"

  read -r -p 'Next: open pipe, type >>, see ghostty, after that, back here [Enter] ' _ans

  clear

  rxpipes -P 5

  tuios

  bunx github:LunarEclipseCode/mapscii --latitude 35.681 --longitude 139.707 --zoom 3

  clear

  pokemonsay -p Pikachu -N -t 'pika?'

  read -r -p 'Next: こんばんは [Enter] ' _ans

  clear

  pokemonsay -p Pikachu -N 'こんばんは'

  read -r -p 'Next: open lrc file, after that, see kagurazaka-terminal [Enter] ' _ans

  clear

  nvim

  cha https://kagurazaka-terminal.connpass.com/

  printf "\e]66;s=2;kawarimidollでした\a\n\n" | centering

  read -r -p '' _ans

  printf "\e]66;s=3;Thanks!\a\n\n" | centering

  read -r -p '' _ans

  mcat bye.png

  echo ''
