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
    const trigger = player.querySelector(".sp-unlock-trigger");
    if (trigger) trigger.remove();

    // Re-lee el ID3 (portada + nombre) ahora que el audio está desbloqueado.
    // En try aparte: si falla, el decrypt ya fue OK, no es "key incorrecta".
    try {
      if (typeof window.loadSongMetadata === "function") window.loadSongMetadata();
    } catch (err) {
      console.error("[decrypt] loadSongMetadata falló (no afecta el unlock)", err);
    }
  }

  // Modal único compartido por todos los players.
  let currentPlayer = null;
  function getModal() {
    const dialog = document.getElementById("key-modal");
    if (!dialog || dialog.dataset.wired) return dialog;
    dialog.dataset.wired = "1";
    const form = dialog.querySelector(".sp-unlock");
    const input = form.querySelector(".sp-key");
    const status = form.querySelector(".sp-unlock-status");
    const cancel = form.querySelector(".sp-unlock-cancel");

    cancel.addEventListener("click", () => dialog.close());

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const key = input.value;
      if (!key || !currentPlayer) return;
      status.textContent = "…";
      try {
        const player = currentPlayer;
        await unlock(player, key);
        dialog.close();
        const audio = player.querySelector("audio");
        if (audio) audio.play().catch(() => {});
      } catch (err) {
        console.error("[decrypt] falló", err);
        status.textContent = "✗ key incorrecta";
      }
    });
    return dialog;
  }

  function openKeyModal(player) {
    const dialog = getModal();
    if (!dialog || !player) return;
    currentPlayer = player;
    const title = dialog.querySelector(".sp-unlock-title");
    if (title) title.textContent = player.dataset.content || "encriptado";
    const input = dialog.querySelector(".sp-key");
    const status = dialog.querySelector(".sp-unlock-status");
    input.value = "";
    status.textContent = "";
    dialog.showModal();
    input.focus();
  }
  // El play del reproductor bloqueado abre el modal (ver initAudioPlayers).
  window.openKeyModal = openKeyModal;
})();
