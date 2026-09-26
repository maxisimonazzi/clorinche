#!/bin/sh
# Uso: sh granja/p.sh vaca[,chancho...]
cd "$(dirname "$0")/.." && node drawings/preview.mjs --id "$1"
