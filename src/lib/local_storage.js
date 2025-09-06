function set(entry, newValue) {
  localStorage.setItem(entry, newValue);
}

function get(entry) {
  return localStorage.getItem(entry);
}

function remove(entry) {
  localStorage.removeItem(entry);
}

let ls = { set, get, remove }
export default ls;