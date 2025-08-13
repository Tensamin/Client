mkdir ./release -p

cp "$PWD/dist/tensamin-frontend Setup $npm_package_version.exe" ./release/$npm_package_version-Tensamin.exe -f
cp $PWD/dist/tensamin-frontend_$npm_package_version'_amd64.deb' ./release/$npm_package_version-Tensamin-amd64.deb -f
cp $PWD/dist/tensamin-frontend_$npm_package_version'_arm64.deb' ./release/$npm_package_version-Tensamin-arm64.deb -f
cp "$PWD/dist/tensamin-frontend-$npm_package_version.tar.xz" ./release/$npm_package_version-Tensamin-amd64.tar.xz -f
cp "$PWD/dist/tensamin-frontend-$npm_package_version-arm64.tar.xz" ./release/$npm_package_version-Tensamin-arm64.tar.xz -f

cp "$PWD/dist/tensamin-frontend Setup $npm_package_version.exe" ./release/Tensamin.exe -f
cp $PWD/dist/tensamin-frontend_$npm_package_version'_amd64.deb' ./release/Tensamin-amd64.deb -f
cp $PWD/dist/tensamin-frontend_$npm_package_version'_arm64.deb' ./release/Tensamin-arm64.deb -f
cp "$PWD/dist/tensamin-frontend-$npm_package_version.tar.xz" ./release/Tensamin-amd64.tar.xz -f
cp "$PWD/dist/tensamin-frontend-$npm_package_version-arm64.tar.xz" ./release/Tensamin-arm64.tar.xz -f

echo Packaged!