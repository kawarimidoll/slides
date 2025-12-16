#!/bin/bash

(cfonts "Kagurazaka";cfonts "Terminal 2") | centering | tte beams --beam-row-symbols ☆ ･ ･ --beam-column-symbols ☆ ･ ･

read -r -p '' _ans

csview kagurazaka-terminal.csv --style rounded | centering
