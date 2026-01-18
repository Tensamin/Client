async function main() {
  const file = await Bun.file("public/licenses.json").json();

  for (const key of Object.keys(file)) {
    const current = file[key];
    delete current["path"];
    file[key] = current;
  }

  await Bun.write("public/licenses.json", JSON.stringify(file, null, 2));
}

main();
