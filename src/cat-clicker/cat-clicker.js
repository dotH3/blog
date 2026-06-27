// Minijuego TEMPORAL estilo Cookie Clicker: el gato chef cocina croquetas 🍪.
// Autocontenido (IIFE, sin dependencias). Reutiliza el #closure-stamp del cierre
// como botón clickeable. Borrar src/cat-clicker/ + las 2 líneas de index.html
// deja el blog igual al efecto de cierre original.
(function () {
    "use strict";

    const STORAGE_KEY = "h3-cat-clicker";
    const COIN = "🍪";

    // Catálogo: el costo escala como base * 1.15^owned.
    // tipo "click" suma a perClick; tipo "passive" suma a croquetas/segundo.
    const CATALOG = [
        { id: "cuchara",     name: "Cuchara",     tipo: "click",   base: 15,    efecto: 1,   desc: "+1 por click" },
        { id: "sarten",      name: "Sartén",      tipo: "click",   base: 200,   efecto: 5,   desc: "+5 por click" },
        { id: "cuchillo",    name: "Cuchillo",    tipo: "click",   base: 3000,  efecto: 20,  desc: "+20 por click" },
        { id: "souschef",    name: "Sous-chef",   tipo: "passive", base: 50,    efecto: 1,   desc: "1 🍪/s" },
        { id: "horno",       name: "Horno",       tipo: "passive", base: 500,   efecto: 8,   desc: "8 🍪/s" },
        { id: "foodtruck",   name: "Food truck",  tipo: "passive", base: 6000,  efecto: 50,  desc: "50 🍪/s" },
        { id: "restaurante", name: "Restaurante", tipo: "passive", base: 75000, efecto: 300, desc: "300 🍪/s" },
    ];

    function defaultState() {
        return { score: 0, perClick: 1, items: {} };
    }

    let state = defaultState();

    // ---- Persistencia (sin timestamps: no hay ganancias offline) ----
    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const data = JSON.parse(raw);
            state = {
                score: Number(data.score) || 0,
                perClick: 1,
                items: data.items && typeof data.items === "object" ? data.items : {},
            };
            recompute();
        } catch (e) {
            state = defaultState();
        }
    }
    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { /* sin espacio: ignorar */ }
    }

    // perClick y cps son derivados de items (fuente de verdad = cantidades).
    function owned(id) { return state.items[id] || 0; }
    function recompute() {
        let pc = 1;
        for (const it of CATALOG) {
            if (it.tipo === "click") pc += owned(it.id) * it.efecto;
        }
        state.perClick = pc;
    }
    function cps() {
        let c = 0;
        for (const it of CATALOG) {
            if (it.tipo === "passive") c += owned(it.id) * it.efecto;
        }
        return c;
    }
    function costOf(it) {
        return Math.ceil(it.base * Math.pow(1.15, owned(it.id)));
    }

    // ---- Formateo de números ----
    function fmt(n) {
        n = Math.floor(n);
        if (n < 1000) return String(n);
        const units = ["", "K", "M", "B", "T"];
        let u = 0;
        while (n >= 1000 && u < units.length - 1) { n /= 1000; u++; }
        return (n < 10 ? n.toFixed(1) : Math.floor(n)) + units[u];
    }
    function fmtCps(n) {
        if (n === 0) return "0";
        if (n < 10 && !Number.isInteger(n)) return n.toFixed(1);
        return fmt(n);
    }

    // ---- DOM ----
    let stamp, catImg;
    let elScore, elCps, elShop, btnToggle, panel;
    const rows = {}; // id -> { btn, cost, count }

    function buildUI() {
        const hud = document.createElement("div");
        hud.id = "cc-hud";
        hud.innerHTML = `
            <div id="cc-counter">
                <span id="cc-score">0</span>
                <span id="cc-coin">${COIN}</span>
            </div>
            <div id="cc-cps"><span id="cc-cps-val">0</span> 🍪/s</div>
            <button id="cc-toggle" type="button">tienda</button>
        `;

        panel = document.createElement("div");
        panel.id = "cc-shop";
        panel.hidden = true;

        const header = document.createElement("div");
        header.id = "cc-shop-head";
        header.innerHTML = `<span>cocina del gato</span>`;
        const reset = document.createElement("button");
        reset.id = "cc-reset";
        reset.type = "button";
        reset.textContent = "reiniciar";
        reset.addEventListener("click", doReset);
        header.appendChild(reset);
        panel.appendChild(header);

        const list = document.createElement("div");
        list.id = "cc-list";
        for (const it of CATALOG) {
            const row = document.createElement("button");
            row.className = "cc-item";
            row.type = "button";
            row.innerHTML = `
                <div class="cc-item-main">
                    <span class="cc-item-name">${it.name}</span>
                    <span class="cc-item-desc">${it.desc}</span>
                </div>
                <div class="cc-item-side">
                    <span class="cc-item-cost"></span>
                    <span class="cc-item-count">x0</span>
                </div>
            `;
            row.addEventListener("click", () => buy(it));
            list.appendChild(row);
            rows[it.id] = {
                btn: row,
                cost: row.querySelector(".cc-item-cost"),
                count: row.querySelector(".cc-item-count"),
            };
        }
        panel.appendChild(list);

        document.body.appendChild(hud);
        document.body.appendChild(panel);

        elScore = document.getElementById("cc-score");
        elCps = document.getElementById("cc-cps-val");
        btnToggle = document.getElementById("cc-toggle");
        btnToggle.addEventListener("click", () => {
            panel.hidden = !panel.hidden;
            btnToggle.classList.toggle("open", !panel.hidden);
        });
    }

    // ---- Interacción con el gato ----
    function onCatClick(e) {
        state.score += state.perClick;
        spawnFloat(e, state.perClick);
        squash();
        save();
        render();
    }

    function spawnFloat(e, amount) {
        const f = document.createElement("div");
        f.className = "cc-float";
        f.textContent = "+" + fmt(amount);
        const rect = stamp.getBoundingClientRect();
        const x = e ? e.clientX : rect.left + rect.width / 2;
        const y = e ? e.clientY : rect.top + rect.height / 2;
        f.style.left = x + "px";
        f.style.top = y + "px";
        document.body.appendChild(f);
        f.addEventListener("animationend", () => f.remove());
    }

    function squash() {
        if (!catImg) return;
        catImg.classList.remove("cc-squash");
        // reflow para reiniciar la animación si se clickea rápido
        void catImg.offsetWidth;
        catImg.classList.add("cc-squash");
    }
    function onSquashEnd() { catImg.classList.remove("cc-squash"); }

    // ---- Compras ----
    function buy(it) {
        const cost = costOf(it);
        if (state.score < cost) return;
        state.score -= cost;
        state.items[it.id] = owned(it.id) + 1;
        recompute();
        save();
        render();
    }

    function doReset() {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        state = defaultState();
        render();
    }

    // ---- Tick pasivo (solo mientras la pestaña está abierta) ----
    function tick() {
        const c = cps();
        if (c > 0) {
            state.score += c / 10; // cada 100 ms
        }
        renderLight();
    }

    // ---- Render ----
    // render(): refresca todo (HUD + filas de la tienda).
    function render() {
        elScore.textContent = fmt(state.score);
        elCps.textContent = fmtCps(cps());
        for (const it of CATALOG) {
            const r = rows[it.id];
            const cost = costOf(it);
            r.cost.textContent = fmt(cost) + " " + COIN;
            r.count.textContent = "x" + owned(it.id);
            r.btn.disabled = state.score < cost;
        }
    }
    // renderLight(): solo el contador y el disabled de los botones (para el tick).
    function renderLight() {
        elScore.textContent = fmt(state.score);
        for (const it of CATALOG) {
            const r = rows[it.id];
            r.btn.disabled = state.score < costOf(it);
        }
    }

    // ---- Arranque ----
    function init() {
        stamp = document.getElementById("closure-stamp");
        if (!stamp) return;
        catImg = stamp.querySelector("img");

        load();
        buildUI();
        render();

        stamp.addEventListener("click", onCatClick);
        if (catImg) catImg.addEventListener("animationend", onSquashEnd);

        setInterval(tick, 100);
        window.addEventListener("beforeunload", save);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
