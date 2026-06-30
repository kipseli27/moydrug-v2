#!/bin/bash
# Запуск Metro bundler для разработки
# Использование: pm2 start server/start-metro.sh --name metro-dev

cd ~/moydrug-v2
npm install --silent
npx expo start --tunnel --non-interactive
