#!/usr/bin/env bash
set -euo pipefail

PKGNAME="tensamin-bin"
_PKGNAME="tensamin"
PKGVER="0.1.1"
PKGREL="1"
PKGDESC="Super secure messaging app"
URL="https://tensamin.methanium.net"
LICENSE_ID="custom"
ARCH_PACMAN="x86_64"
DEB_ARCH="amd64"
LOCAL_DEB_PATH="./out/make/deb/x64/${_PKGNAME}_${PKGVER}_${DEB_ARCH}.deb"
DEPENDS=(
  "gtk3"
  "alsa-lib"
  "xdg-utils"
  "nss"
  "libxss"
  "libgcrypt"
  "ttf-liberation"
  "dbus"
  "libpulse"
  "libva"
  "libffi"
)
OPTDEPENDS=(
  "pipewire: Screen sharing"
  "kdialog: Native dialogs on KDE Plasma"
  "gtk4: for --gtk-version=4"
  "gnome-keyring: Password storage backend (org.freedesktop.secrets)"
  "kwallet: Password storage backend on KDE Plasma"
)
PROVIDES=( "tensamin" )
CONFLICTS=( )
AUR_DIR="${_PKGNAME}-aur"

# ---

join_array() {
  local out=""
  local item
  for item in "$@"; do
    out+="'${item//'/'\/}' "
  done
  # trim trailing space
  printf "%s" "${out% }"
}

ensure_tool() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Error: required tool '$1' not found in PATH" >&2
    exit 1
  }
}

sanitize_desc() {
  printf "%s" "$1" | sed 's/"/\\"/g'
}

main() {
  ensure_tool "sha256sum"
  ensure_tool "bsdtar"
  ensure_tool "makepkg"

  rm -rf "${AUR_DIR}"

  local deb_file="${_PKGNAME}_${PKGVER}_${DEB_ARCH}.deb"
  local sha256=""

    local abs_local
    abs_local="$(realpath -m "${LOCAL_DEB_PATH}")"
    if [[ ! -f "${abs_local}" ]]; then
      echo "Error: LOCAL_DEB_PATH not found: ${abs_local}" >&2
      exit 1
    fi
    sha256="$(sha256sum "${abs_local}" | awk '{print $1}')"

  local depends_str optdepends_str provides_str conflicts_str
  depends_str="$(join_array "${DEPENDS[@]}")"
  optdepends_str="$(join_array "${OPTDEPENDS[@]}")"
  provides_str="$(join_array "${PROVIDES[@]}")"
  conflicts_str="$(join_array "${CONFLICTS[@]}")"

  local pkgdesc_escaped
  pkgdesc_escaped="$(sanitize_desc "${PKGDESC}")"

  rm -rf "${AUR_DIR}"
  mkdir -p "${AUR_DIR}"

  cp "${abs_local}" "${AUR_DIR}/${deb_file}"

  cat >"${AUR_DIR}/PKGBUILD" <<EOF
# Maintainer: Methanium
pkgname=${PKGNAME}
pkgver=${PKGVER}
pkgrel=${PKGREL}
pkgdesc="${pkgdesc_escaped}"
arch=('${ARCH_PACMAN}')
url="${URL}"
license=('${LICENSE_ID}')
depends=(${depends_str})
optdepends=(${optdepends_str})
provides=(${provides_str})
conflicts=(${conflicts_str})

source_${ARCH_PACMAN}=("${deb_file}")
sha256sums_${ARCH_PACMAN}=("${sha256}")

package() {
  bsdtar -O -xf "\${srcdir}/${deb_file}" data.tar.* \\
    | bsdtar -C "\${pkgdir}" --no-same-owner -xv
}
EOF

  (
    cd "${AUR_DIR}"
    makepkg --printsrcinfo > .SRCINFO
  )
}

main "$@"
