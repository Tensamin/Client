mkdir work
cd work
cp '../out/make/deb/x64/tensamin_'$npm_package_version'_amd64.deb' .
debtap -Q 'tensamin_'$npm_package_version'_amd64.deb'
rm 'tensamin_'$npm_package_version'_amd64.deb'
mkdir package
tar -xf 'tensamin-'$npm_package_version'-1-x86_64.pkg.tar.zst' -C ./package
rm 'tensamin-'$npm_package_version'-1-x86_64.pkg.tar.zst'
echo "pkgname = tensamin" > ./package/.PKGINFO
echo "pkgver = 0.1.1-1" >> ./package/.PKGINFO
echo "pkgdesc = Super secure messaging app" >> ./package/.PKGINFO
echo "url = https://tensamin.methanium.net" >> ./package/.PKGINFO
echo "packager = Methanium" >> ./package/.PKGINFO
echo "arch = x86_64" >> ./package/.PKGINFO
echo "license = " >> ./package/.PKGINFO
echo "depends = gtk3" >> ./package/.PKGINFO
echo "depends = alsa-lib" >> ./package/.PKGINFO
echo "depends = xdg-utils" >> ./package/.PKGINFO
echo "depends = nss" >> ./package/.PKGINFO
echo "depends = libxss" >> ./package/.PKGINFO
echo "depends = libgcrypt" >> ./package/.PKGINFO
echo "depends = ttf-liberation" >> ./package/.PKGINFO
echo "depends = dbus" >> ./package/.PKGINFO
echo "depends = libpulse" >> ./package/.PKGINFO
echo "depends = libva" >> ./package/.PKGINFO
echo "depends = libffi" >> ./package/.PKGINFO
echo "optdepends = pipewire: Screen sharing" >> ./package/.PKGINFO
echo "optdepends = kdialog: Native dialogs on KDE Plasma" >> ./package/.PKGINFO
echo "optdepends = gtk4: for --gtk-version=4" >> ./package/.PKGINFO
echo "optdepends = org.freedesktop.secrets: Password storage backend on GNOME / Xfce" >> ./package/.PKGINFO
echo "optdepends = kwallet: Password storage backend on KDE Plasma" >> ./package/.PKGINFO
cd package
tar -cf tensamin.pkg.tar.zst .PKGINFO .MTREE .INSTALL usr
mv tensamin.pkg.tar.zst ../..
cd ../..
rm -rf work