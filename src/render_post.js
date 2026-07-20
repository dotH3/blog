// Renderizado compartido de posts: lo usan index.html (single-page) y post.html.

// Agrega al container los párrafos y media (img/video/audio/canción encriptada)
// de un post. El player encriptado depende de window.openKeyModal (decrypt_music.js).
export function renderPostContent(post, container) {
  post.content.forEach((p) => {
    const pElement = document.createElement("p")
    pElement.innerText = p
    container.appendChild(pElement)
  })

  if (post.img) {
    const img = document.createElement("img")
    img.src = `./${post.img}`
    img.alt = post.date
    img.loading = "lazy"
    img.className = "max-w-full rounded mt-2"
    container.appendChild(img)
  }

  if (post.video) {
    const video = document.createElement("video")
    video.src = `./${post.video}`
    video.controls = true
    video.preload = "none"
    video.className = "max-w-full rounded mt-2"
    container.appendChild(video)
  }

  if (post.audio || post.song) {
    const audio = document.createElement("audio")
    audio.src = `./${post.audio || post.song}`
    audio.controls = true
    audio.preload = "none"
    audio.className = "w-full mt-2"
    container.appendChild(audio)
  }

  if (post.songEnc) {
    const player = document.createElement("div")
    player.className = "song-player locked mt-2"
    player.dataset.content = post.content.join(' ')
    player.innerHTML = `
      <div class="flex items-center gap-2 min-w-0">
        <div class="sp-cover-wrap shrink-0 w-14 h-14 rounded flex items-center justify-center bg-black/10">
          <img class="sp-cover w-14 h-14 rounded hidden" alt="portada" />
          <span class="sp-cover-ph"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-label="encriptado"><path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V7a3 3 0 0 1 3-3z"/></svg></span>
          <span class="sp-play-ind">▶</span>
        </div>
        <span class="sp-name min-w-0 truncate">${post.songEnc.split('/').pop()}</span>
      </div>
      <audio data-enc="./${post.songEnc}" preload="none"></audio>`

    const audio = player.querySelector("audio")
    const playInd = player.querySelector(".sp-play-ind")
    player.querySelector(".sp-cover-wrap").addEventListener("click", () => {
      if (player.classList.contains("locked")) {
        window.openKeyModal(player)
        return
      }
      if (audio.paused) audio.play(); else audio.pause()
    })
    audio.addEventListener("play", () => playInd.textContent = "⏸")
    audio.addEventListener("pause", () => playInd.textContent = "▶")
    audio.addEventListener("ended", () => playInd.textContent = "▶")

    container.appendChild(player)
  }
}

// Lee el ID3 del audio ya desbloqueado: "artista – título" + portada.
// decrypt_music.js la llama (vía window.loadSongMetadata) después de un unlock exitoso.
export function loadSongMetadata() {
  if (!window.jsmediatags) return
  document.querySelectorAll(".song-player").forEach((player) => {
    const audio = player.querySelector("audio")
    // Saltea las encriptadas todavía bloqueadas (sin src real aún).
    if (!audio || audio.dataset.enc || !audio.src) return
    const nameEl = player.querySelector(".sp-name")
    const cover = player.querySelector(".sp-cover")
    fetch(audio.src)
      .then((res) => res.blob())
      .then((blob) => {
        jsmediatags.read(blob, {
          onSuccess: ({ tags }) => {
            const label = [tags.artist, tags.title]
              .map((s) => (s || "").trim()).filter(Boolean).join(" – ")
            if (label && nameEl) {
              nameEl.textContent = label
              audio.dataset.title = label
            }
            const pic = tags.picture
            if (pic && pic.data && pic.data.length && cover) {
              let bin = ""
              for (let i = 0; i < pic.data.length; i++) bin += String.fromCharCode(pic.data[i])
              cover.src = `data:${pic.format};base64,${btoa(bin)}`
              cover.classList.remove("hidden")
              const ph = player.querySelector(".sp-cover-ph")
              if (ph) ph.classList.add("hidden")
            }
          },
          onError: (err) => console.error("[meta] jsmediatags falló", err),
        })
      })
      .catch((err) => console.error("[meta] no se pudo leer el audio", err))
  })
}
