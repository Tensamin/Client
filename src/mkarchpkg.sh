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

require_download_tool() {
  if command -v curl >/dev/null 2>&1; then
    DOWNLOAD_TOOL="curl"
  elif command -v wget >/dev/null 2>&1; then
    DOWNLOAD_TOOL="wget"
  else
    echo "Error: required tool 'curl' or 'wget' not found in PATH" >&2
    exit 1
  fi
}

sanitize_desc() {
  printf "%s" "$1" | sed 's/"/\\"/g'
}

main() {
  ensure_tool "sha256sum"
  ensure_tool "bsdtar"
  ensure_tool "makepkg"
  require_download_tool

  rm -rf "${AUR_DIR}"
  mkdir -p "${AUR_DIR}"

  local release_filename="tensamin-linux-x64-${PKGVER}.deb"
  local release_url="https://github.com/Tensamin/Frontend/releases/download/v${PKGVER}-desktop-apps/${release_filename}"
  local dest_file="${AUR_DIR}/${release_filename}"

  echo "Downloading ${release_url} -> ${dest_file}"
  if [[ "${DOWNLOAD_TOOL}" = "curl" ]]; then
    curl -fL --retry 3 -o "${dest_file}" "${release_url}"
  else
    wget -qO "${dest_file}" "${release_url}"
  fi

  if [[ ! -f "${dest_file}" ]]; then
    echo "Error: download failed, file not found: ${dest_file}" >&2
    exit 1
  fi

  local sha256
  sha256="$(sha256sum "${dest_file}" | awk '{print $1}')"
  if [[ -z "${sha256}" ]]; then
    echo "Error: failed to compute sha256" >&2
    exit 1
  fi
  echo "SHA256: ${sha256}"

  local deb_file="${release_filename}"

  local depends_str optdepends_str provides_str conflicts_str
  depends_str="$(join_array "${DEPENDS[@]}")"
  optdepends_str="$(join_array "${OPTDEPENDS[@]}")"
  provides_str="$(join_array "${PROVIDES[@]}")"
  conflicts_str="$(join_array "${CONFLICTS[@]}")"

  local pkgdesc_escaped
  pkgdesc_escaped="$(sanitize_desc "${PKGDESC}")"

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

source_${ARCH_PACMAN}=("${release_url}")
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