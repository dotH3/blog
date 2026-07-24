// Renderizado de la estantería de biblioteca: lo usa biblioteca.html.

// Paleta plana para los lomos (sin imágenes de portada).
const SPINE_COLORS = [
  "#7c2d12", "#1e3a8a", "#14532d", "#581c87",
  "#7f1d1d", "#134e4a", "#78350f", "#312e81",
]

function hashOf(titulo) {
  let hash = 0
  for (let i = 0; i < titulo.length; i++) hash = (hash * 31 + titulo.charCodeAt(i)) | 0
  return Math.abs(hash)
}

// Arma la estantería a partir del array de libros y la agrega a container.
// Hay una sola tarjeta de detalle debajo del mueble: click en un lomo la
// llena, click en el mismo lomo la cierra.
export function renderBiblioteca(books, container) {
  const bookcase = document.createElement("div")
  bookcase.className = "bookcase"

  const shelf = document.createElement("div")
  shelf.className = "shelf"
  bookcase.appendChild(shelf)

  const detail = document.createElement("div")
  detail.className = "book-card coral-pixels-regular hidden"

  let openSpine = null

  books.forEach((book) => {
    const hash = hashOf(book.titulo)
    const color = SPINE_COLORS[hash % SPINE_COLORS.length]

    const spine = document.createElement("button")
    spine.type = "button"
    spine.className = "book-spine"
    spine.style.backgroundColor = color
    // Alto y ancho varían por título para que el estante se vea orgánico.
    // minHeight (no height): un título largo estira el lomo a lo largo en vez
    // de desbordar; ver .book-spine en style.css.
    spine.style.minHeight = `${11 + (hash % 7) * 0.5}rem`
    spine.style.width = `${2.4 + (hash % 4) * 0.25}rem`
    spine.setAttribute("aria-expanded", "false")
    spine.innerHTML = `
      <span class="book-spine-title">${book.titulo}</span>
      <span class="book-spine-author">${book.autor}</span>
      <span class="book-spine-dl" aria-hidden="true">⬇</span>
    `

    spine.addEventListener("click", () => {
      const alreadyOpen = openSpine === spine
      if (openSpine) openSpine.setAttribute("aria-expanded", "false")
      openSpine = null
      if (alreadyOpen) {
        detail.classList.add("hidden")
        return
      }
      openSpine = spine
      spine.setAttribute("aria-expanded", "true")
      detail.innerHTML = `
        <div class="book-cover" style="background-color: ${color}">
          <span>${book.titulo}</span>
        </div>
        <div>
          <h3 class="text-xl">${book.titulo}</h3>
          <p class="text-sm text-gray-500">${book.autor} · ${book.anio}</p>
          <p class="mt-2">${book.sinopsis}</p>
          <a href="./${book.pdf}" download class="inline-block mt-3 border border-black rounded px-3 py-1 hover:underline">
            ⬇ descargar
          </a>
        </div>
      `
      detail.classList.remove("hidden")
      detail.animate(
        [{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }],
        { duration: 180, easing: "ease-out" },
      )
      detail.scrollIntoView({ block: "nearest", behavior: "smooth" })
    })

    shelf.appendChild(spine)
  })

  const decor = document.createElement("span")
  decor.className = "shelf-decor"
  decor.setAttribute("aria-hidden", "true")
  decor.innerText = "🪴"
  shelf.appendChild(decor)

  container.appendChild(bookcase)
  container.appendChild(detail)
}
