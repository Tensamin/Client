sudo mkdir ./release -p

# Windows & Debian
sudo cp "$PWD/dist/tensamin-frontend Setup $npm_package_version.exe" ./release/$npm_package_version-Tensamin.exe -f
sudo cp $PWD/dist/tensamin-frontend_$npm_package_version'_amd64.deb' ./release/$npm_package_version-Tensamin-amd64.deb -f
sudo cp $PWD/dist/tensamin-frontend_$npm_package_version'_arm64.deb' ./release/$npm_package_version-Tensamin-arm64.deb -f

sudo cp "$PWD/dist/tensamin-frontend Setup $npm_package_version.exe" ./release/Tensamin.exe -f
sudo cp $PWD/dist/tensamin-frontend_$npm_package_version'_amd64.deb' ./release/Tensamin-amd64.deb -f
sudo cp $PWD/dist/tensamin-frontend_$npm_package_version'_arm64.deb' ./release/Tensamin-arm64.deb -f

# Arch
#sudo cp "$PWD/dist/tensamin-frontend-$npm_package_version.tar.xz" ./release/aur/amd64.tar.xz
#sudo cp "$PWD/dist/tensamin-frontend-$npm_package_version-arm64.tar.xz" ./release/aur/arm64.tar.xz
echo Packaged!