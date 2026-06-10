#!/bin/bash

(cfonts "Terminal";cfonts "Night 2") | deno task scattered

(cfonts "speaker" -f tiny;cfonts "kawarimidoll" -f tiny) | deno task explode

(figlet -f 'small' '2026-03-27';figlet -f 'slant' 'in Mercari';echo '.') | deno task rain

(cfonts 'theme' -f chrome;cfonts 'gh prism' -f pallet|sed -e 's/─/ /g') | deno task vortex

presenterm slides.md

/Users/kawarimidoll/ghq/github.com/kawarimidoll/gh-prism/target/release/gh-prism --demo
