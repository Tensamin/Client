#!/usr/bin/env bash
# ./bump.sh <new-version> [--dry-run]

set -euo pipefail

FILES=(
	"package.json"
	"desktop/package.json"
	"desktop/aur/bin/PKGBUILD"
	"mobile/package.json"
	"mobile/app.json"
	"web/package.json"
)

BACKUP=true
DRY_RUN=false
GIT_COMMIT=false
GIT_TAG=false
COMMIT_MSG="chore: bump version"

print_usage() {
	cat <<EOF
Usage: $0 <new-version> [--dry-run]

Examples:
	$0 0.1.17                 # update files and write changes
	$0 0.1.17 --dry-run       # show the replacements without writing files

EOF
}

if [[ $# -lt 1 ]]; then
	print_usage
	exit 1
fi

NEW_VERSION="$1"
shift || true

while [[ $# -gt 0 ]]; do
	case "$1" in
		--dry-run)
			DRY_RUN=true
			shift
			;;
		-h|--help)
			print_usage
			exit 0
			;;
		*)
			echo "Unknown option: $1" >&2
			print_usage
			exit 1
			;;
	esac
done

timestamp() { date +%Y%m%d%H%M%S; }

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red() { printf '\033[0;31m%s\033[0m\n' "$1"; }

update_file() {
	local file="$1"
	local newv="$2"
	local tmp
	tmp=$(mktemp)

	if [[ ! -f "$file" ]]; then
		echo "Skipping missing file: $file" >&2
		return 1
	fi


	sed -E \
		-e "s/\"version\"[[:space:]]*:[[:space:]]*\"[^\"]+\"/\"version\": \"$newv\"/g" \
		-e "s/data-version=[\"'][^\"']+[\"']/data-version=\\\"$newv\\\"/g" \
		-e "s/\"data-version\"[[:space:]]*:[[:space:]]*\"[^\"]+\"/\"data-version\": \"$newv\"/g" \
		-e "s/(export[[:space:]]+const[[:space:]]+VERSION[[:space:]]*=[[:space:]]*)['\"][^'\"]+['\"]/\\1'$newv'/g" \
		-e "s/((const|let|var)[[:space:]]+(VERSION|version|AppVersion|appVersion)[[:space:]]*=[[:space:]]*)['\"][^'\"]+['\"]/\\1'$newv'/g" \
		-e "s/(pkgver[[:space:]]*=[[:space:]]*)(['\"]?)([^'\"[:space:]]+)(['\"]?)/\\1\\2$newv\\4/g" \
		"$file" >"$tmp"

	if ! cmp -s -- "$file" "$tmp"; then
		if [[ "$DRY_RUN" == true ]]; then
			green "(dry-run) Would update: $file"
			rm -f -- "$tmp"
			return 0
		fi
		echo "Updating $file..."
		mv -- "$tmp" "$file"
		return 0
	else
		rm -f -- "$tmp"
		if [[ "$DRY_RUN" == true ]]; then
			red "(dry-run) Would NOT update: $file"
			return 1
		fi
		echo "No version patterns matched in $file" >&2
		return 1
	fi
}

modified_any=false
errors=0

for f in "${FILES[@]}"; do
	if update_file "$f" "$NEW_VERSION"; then
		modified_any=true
	else
		true
	fi
done

if [[ "$DRY_RUN" == true ]]; then
	echo "Dry-run complete. No changes written."
	exit 0
fi

if [[ "$modified_any" == false ]]; then
	echo "No files were updated." >&2
	exit 1
fi

echo "Version bumped to $NEW_VERSION."
