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
function renderComments(listEl, comments) {
  listEl.textContent = ""

  if (!comments.length) {
    const empty = document.createElement("p")
    empty.className = "text-gray-400"
    empty.textContent = "sé el primero en comentar"
    listEl.appendChild(empty)
    return
  }

  for (const c of comments) {
    const item = document.createElement("div")
    item.className = "border-t border-black/20 pt-3"

    const head = document.createElement("div")
    head.className = "flex flex-wrap items-baseline gap-x-2"

    const author = document.createElement("span")
    author.className = "font-bold"
    author.textContent = c.username

    const date = document.createElement("span")
    date.className = "text-sm text-gray-400"
    date.textContent = formatDate(c.created_at)

    head.appendChild(author)
    head.appendChild(date)

    const msg = document.createElement("p")
    msg.className = "mt-1 whitespace-pre-wrap break-words"
    msg.textContent = c.message

    item.appendChild(head)
    item.appendChild(msg)
    listEl.appendChild(item)
  }
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
