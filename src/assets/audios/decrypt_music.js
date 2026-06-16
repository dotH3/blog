// Desencriptado de canciones en el navegador (Web Crypto).
// Espeja a encrypt_music.js (Node): AES-256-CBC, clave = SHA-256(passphrase),
// IV = primeros 16 bytes. Payload desencriptado:
//   [len nombre (2 bytes BE)] [nombre utf8] [bytes del audio]
// Cada post encriptado pide su propia key inline.
(function () {
  async function deriveKey(passphrase) {
    const hash = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(passphrase)
    );
    return crypto.subtle.importKey("raw", hash, { name: "AES-CBC" }, false, [
      "decrypt",
    ]);
  }

  async function decryptFile(url, passphrase) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const buf = new Uint8Array(await res.arrayBuffer());
    const iv = buf.slice(0, 16);
    const data = buf.slice(16);
    const key = await deriveKey(passphrase);
    // Si la key es incorrecta, el padding PKCS7 no valida y esto lanza.
    const dec = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-CBC", iv }, key, data)
    );
    const nameLen = (dec[0] << 8) | dec[1];
    const name = new TextDecoder().decode(dec.subarray(2, 2 + nameLen));
    const audio = dec.subarray(2 + nameLen);
    return { name, blob: new Blob([audio], { type: "audio/mpeg" }) };
  }

  async function unlock(player, passphrase) {
    const audio = player.querySelector("audio");
    const { name, blob } = await decryptFile(audio.dataset.enc, passphrase);
    audio.src = URL.createObjectURL(blob);
    audio.removeAttribute("data-enc");

    const fallback = name.replace(/\.[^.]+$/, "");
    audio.dataset.title = fallback;
    player.classList.remove("locked");
    const ph = player.querySelector(".sp-cover-ph");
    if (ph) ph.textContent = "♪";
    const nameEl = player.querySelector(".sp-name");
    if (nameEl) nameEl.textContent = fallback;
    const form = player.querySelector(".sp-unlock");
    if (form) form.remove();

    // Re-lee el ID3 (portada + nombre) ahora que el audio está desbloqueado.
    if (typeof window.loadSongMetadata === "function") window.loadSongMetadata();
  }

  function wire(player) {
    const form = player.querySelector(".sp-unlock");
    if (!form || form.dataset.wired) return;
    form.dataset.wired = "1";
    const input = form.querySelector(".sp-key");
    const status = form.querySelector(".sp-unlock-status");

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const key = input.value;
      if (!key) return;
      status.textContent = "…";
      try {
        await unlock(player, key);
      } catch (err) {
        console.error("[decrypt] falló", err);
        status.textContent = "✗ key incorrecta";
      }
    });
  }

  function init() {
    document.querySelectorAll(".song-player.locked").forEach(wire);
  }

  // Los posts se renderizan async; reintenta hasta que aparezcan.
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
  // Por si el fetch de posts.json todavía no terminó al cargar este script.
  let tries = 0;
  const poll = setInterval(() => {
    init();
    if (document.querySelector(".song-player.locked .sp-unlock[data-wired]") || ++tries > 40) {
      clearInterval(poll);
    }
  }, 250);
})();
