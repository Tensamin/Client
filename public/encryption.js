async function encrypt_base64_using_aes(base64String, password) {
  let decodedData = Uint8Array.from(atob(base64String), (c) =>
    c.charCodeAt(0),
  );

  let passwordEncoder = new TextEncoder();
  let passwordHash = await crypto.subtle.digest(
    "SHA-256",
    passwordEncoder.encode(password),
  );

  let derivedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(passwordHash),
    { name: "AES-CBC", length: 256 },
    false,
    ["encrypt"],
  );

  let iv = crypto.getRandomValues(new Uint8Array(16));

  let encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    derivedKey,
    decodedData,
  );

  let combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  let base64Encrypted = btoa(String.fromCharCode(...combined));

  return base64Encrypted;
}

async function decrypt_base64_using_aes(base64EncryptedString, password) {
  let combinedDecoded = Uint8Array.from(
    atob(base64EncryptedString),
    (c) => c.charCodeAt(0),
  );

  let iv = combinedDecoded.slice(0, 16);
  let ciphertext = combinedDecoded.slice(16);

  let passwordEncoder = new TextEncoder();
  let passwordHash = await crypto.subtle.digest(
    "SHA-256",
    passwordEncoder.encode(password),
  );

  let derivedKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(passwordHash),
    { name: "AES-CBC", length: 256 },
    false,
    ["decrypt"],
  );

  let decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: "AES-CBC",
      iv: iv,
    },
    derivedKey,
    ciphertext,
  );

  let decryptedData = new Uint8Array(decryptedBuffer);
  let originalBase64String = btoa(String.fromCharCode(...decryptedData));

  return originalBase64String;
}

self.onmessage = async function (e) {
  let { type, data, key, id } = e.data;

  switch (type) {
    case "encrypt_base64_using_aes":
      let result1;

      try {
        result1 = await encrypt_base64_using_aes(data, key)
      } catch (err) {
        result1 = err.message
      }

      self.postMessage({ id: id, result: result1 });
      break;

    case "decrypt_base64_using_aes":
      let result2;

      try {
        result2 = await decrypt_base64_using_aes(data, key)
      } catch (err) {
        result2 = err.message
      }

      self.postMessage({ id: id, result: result2 });
      break;

    case "encrypt_base64_using_pubkey":
      let result3;

      try {
        result3 = await encrypt_base64_using_pubkey(data, key)
      } catch (err) {
        result3 = err.message
      }

      self.postMessage({ id: id, result: result3 });
      break;

    case "decrypt_base64_using_privkey":
      let result4;

      try {
        result4 = await decrypt_base64_using_privkey(data, key)
      } catch (err) {
        result4 = err.message
      }

      self.postMessage({ id: id, result: result4 });
      break;

    default:
      break;
  }
};