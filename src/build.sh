sudo rm -rf node_modules dist package-lock.json /home/web/.cache/electron /home/web/.cache/electron-builder /root/.cache/electron /root/.cache/electron-builder
npm i

docker run --rm -ti \
 --env ELECTRON_CACHE="/root/.cache/electron" \
 --env ELECTRON_BUILDER_CACHE="/root/.cache/electron-builder" \
 -v ${PWD}:/project \
 -v ~/.cache/electron:/root/.cache/electron \
 -v ~/.cache/electron-builder:/root/.cache/electron-builder \
 electronuserland/builder:wine \
 npm run electron-build