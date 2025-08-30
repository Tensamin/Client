export function set(entry, newValue) {
  localStorage.setItem(entry, newValue);
}

export function get(entry) {
  return localStorage.getItem(entry);
}

export function remove(entry) {
  localStorage.removeItem(entry);
}

let ls = {
  set,
  get,
  remove,
};
export default ls;
