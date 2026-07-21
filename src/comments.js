// Comentarios globales (tipo libro de visitas) contra el Worker de Cloudflare.
// GET  /comments        -> { comments: [{ username, message, created_at }] }
// POST /comments {username, message} -> 201 | 429 (rate limit) | 4xx {error}
//
// El backend es el mismo de la primera versión del blog; acá solo cambia el
// front para encajar con el diseño nuevo (columna central, fuente pixel, Tailwind).

const API_URL = "https://blog-api.joaquinbastias321.workers.dev/comments"

// created_at llega como "YYYY-MM-DD HH:MM:SS" en UTC desde D1.
function formatDate(raw) {
  if (!raw) return ""
  const d = new Date(raw.replace(" ", "T") + "Z")
  if (isNaN(d)) return raw
  return d.toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit",
  })
}

// Render seguro: SIEMPRE con textContent (nunca innerHTML) porque el contenido
// viene de gente desconocida -> evita XSS almacenado.
// Cada comentario es una línea de chat ("nombre: mensaje"), del más viejo al
// más nuevo, para que el último quede abajo como en un chat de stream.
function renderComments(listEl, comments) {
  listEl.textContent = ""

  if (!comments.length) {
    const empty = document.createElement("p")
    empty.className = "text-gray-400"
    empty.textContent = "sé el primero en comentar"
    listEl.appendChild(empty)
    return
  }

  const ordered = [...comments].sort(
    (a, b) => String(a.created_at).localeCompare(String(b.created_at))
  )

  for (const c of ordered) {
    const line = document.createElement("p")
    line.className = "chat-line whitespace-pre-wrap"
    // La fecha completa queda en el tooltip para no ensuciar la línea.
    line.title = formatDate(c.created_at)

    const author = document.createElement("span")
    author.className = "chat-user text-[#ff0000] uppercase"
    author.textContent = c.username

    line.appendChild(author)
    line.appendChild(document.createTextNode(" " + c.message))
    listEl.appendChild(line)
  }

  listEl.scrollTop = listEl.scrollHeight
}

// Conecta el <section id="comments"> ya presente en el HTML.
export function mountComments(root) {
  if (!root) return

  const listEl = root.querySelector("#comment-list")
  const statusEl = root.querySelector("#comment-status")
  const formEl = root.querySelector("#comment-form")
  const usernameEl = root.querySelector("#c-username")
  const messageEl = root.querySelector("#c-message")
  const btnEl = formEl.querySelector("button[type=submit]")

  async function loadComments() {
    try {
      const res = await fetch(API_URL)
      if (!res.ok) throw new Error("status " + res.status)
      const data = await res.json()
      renderComments(listEl, data.comments || [])
    } catch (err) {
      statusEl.textContent = "no se pudieron cargar los comentarios"
    }
  }

  // Refresco periódico para que el chat se sienta vivo. Se saltea si la pestaña
  // no está a la vista o si el visitante scrolleó hacia arriba a leer (el
  // re-render pega el scroll abajo y lo sacaría de donde está mirando).
  setInterval(() => {
    if (document.hidden) return
    const distanciaAlFondo = listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight
    if (distanciaAlFondo > 40) return
    loadComments()
  }, 30000)

  formEl.addEventListener("submit", async (e) => {
    e.preventDefault()
    const username = usernameEl.value.trim()
    const message = messageEl.value.trim()
    if (!username || !message) return

    btnEl.disabled = true
    statusEl.textContent = "enviando..."

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, message }),
      })

      if (res.status === 429) {
        statusEl.textContent = "tranqui, esperá un toque antes de volver a comentar"
        return
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        statusEl.textContent = data.error || "algo salió mal"
        return
      }

      messageEl.value = ""
      statusEl.textContent = "¡gracias!"
      await loadComments()
    } catch (err) {
      statusEl.textContent = "no se pudo enviar"
    } finally {
      btnEl.disabled = false
    }
  })

  loadComments()
}
