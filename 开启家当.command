#!/bin/bash
# 双击启动：家当 + AI 看图服务，然后自动打开浏览器
cd "$(dirname "$0")"
if ! curl -s -o /dev/null --max-time 1 http://localhost:8793; then
  nohup python3 server.py >/tmp/jiadang.log 2>&1 &
  sleep 1
fi
open http://localhost:8793
