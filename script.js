const editor = document.getElementById("editor");
const canvasArea = document.getElementById("canvas-area");
const header = document.getElementById("header");
const colorBtn = document.getElementById("color-btn");
const picker = document.getElementById("picker");
const tooltip = document.getElementById("tooltip");

const dictionary = new Map();

editor.addEventListener("paste", e => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
});

async function loadDictionary(url) {
    try {
        const res = await fetch(url);
        const text = await res.text();
        text.split("\n").forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;
            const comma = trimmed.indexOf(",");
            if (comma === -1) return;
            const keyPart = trimmed.slice(0, comma).trim();
            const meaning = trimmed.slice(comma + 1).trim();
            if (!keyPart) return;
            if (keyPart.startsWith("code:")) {
                const code = parseInt(keyPart.slice(5));
                if (!isNaN(code)) dictionary.set(String.fromCodePoint(code), meaning);
            } else {
                dictionary.set(keyPart, meaning);
            }
        });
    } catch (e) {
        console.warn("Could not load dictionary:", e);
    }
}

loadDictionary("listecaracteresMokev5.csv");

editor.addEventListener("input", () => {
    const chars = [...new Set(editor.textContent)].filter(c => c.trim() !== "");
    console.log(chars.map(c => `code:${c.codePointAt(0)}, [meaning]`).join("\n"));
});

// Tooltip
editor.addEventListener("mousemove", (e) => {
    const line = e.target.closest("#editor div");
    if (!line) { tooltip.style.display = "none"; return; }
    const text = line.textContent;
    if (!text || text.trim() === "") { tooltip.style.display = "none"; return; }
    const translated = [...text]
        .map(ch => dictionary.get(ch) ?? `[code:${ch.codePointAt(0)}]`)
        .join(" ");
    tooltip.textContent = translated;
    const x = Math.min(e.clientX + 14, window.innerWidth - tooltip.offsetWidth - 10);
    const y = Math.min(e.clientY + 14, window.innerHeight - tooltip.offsetHeight - 10);
    tooltip.style.left = x + "px";
    tooltip.style.top = y + "px";
    tooltip.style.display = "block";
});

editor.addEventListener("mouseleave", () => { tooltip.style.display = "none"; });

// Stroke controls
const strokeWidthInput = document.getElementById("stroke-width");
const strokeValLabel = document.getElementById("stroke-val");
let currentStrokeColor = "#000000";
strokeWidthInput.style.accentColor = "#000000";   // ← initial value

function applyStroke() {
    const width = strokeWidthInput.value;
    strokeValLabel.textContent = width;
    editor.querySelectorAll("div").forEach(line => {
        line.style.webkitTextStroke = `${width}px ${currentStrokeColor}`;
        line.style.paintOrder = "stroke fill";
    });
}

strokeWidthInput.addEventListener("input", applyStroke);

// ── PRESETS — edit these freely ──────────────────────────────
const PRESETS = [
    { name: "Wood Type", bg: "#1C1C1A", text: "#B89674", header: "#D8B045", stroke: "#543A2A" },
    { name: "Gold", bg: "#D8B045", text: "#FFFFFF", header: "#543A2A", stroke: "#CA1716" },
    { name: "Sky", bg: "#9CD0DE", text: "#FFFFFF", header: "#00793E", stroke: "#1C1C1A" },
    { name: "Green", bg: "#00793E", text: "#543A2A", header: "#9CD0DE", stroke: "#D8B045" },
    { name: "Chocolate", bg: "#543A2A", text: "#9CD0DE", header: "#B89674", stroke: "#FFFFFF" },
    { name: "Pan-Africa", bg: "#1C1C1A", text: "#00793E", header: "#CA1716", stroke: "#CA1716" },
    { name: "Swiss Cottage", bg: "#FFFFFF", text: "#1C1C1A", header: "#9CD0DE", stroke: "#B89674" },
    { name: "Bɔgɔlanfini", bg: "#543A2A", text: "#D8B045", header: "#FFFFFF", stroke: "#FFFFFF" },
    { name: "Kayes", bg: "#D8B045", text: "#CA1716", header: "#FFFFFF", stroke: "#1C1C1A" },
   // #FEB312
];
// ─────────────────────────────────────────────────────────────

function applyPreset(p) {
    document.body.style.background = p.bg;
    picker.style.background = p.bg;
    picker.style.borderColor = p.text + "44";
    picker.style.color = p.text;
    tooltip.style.background = p.bg;
    tooltip.style.color = p.text;
    editor.style.color = p.text;
    header.style.color = p.header;
    currentStrokeColor = p.stroke;
    strokeWidthInput.style.accentColor = p.text;   // ← directly on the element
    applyStroke();
}

const presetList = document.getElementById("preset-list");
PRESETS.forEach(p => {
    const btn = document.createElement("button");
    btn.textContent = p.name;
    btn.style.cssText = `
        display: block; width: 100%; text-align: left;
        padding: 8px 10px; margin-bottom: 6px;
        border: 1px solid #cccccc; border-radius: 6px;
        cursor: pointer; font-family: "Moke", sans-serif;
        font-size: 18px; background: ${p.bg}; color: ${p.text};
    `;
    btn.addEventListener("click", () => applyPreset(p));
    presetList.appendChild(btn);
});

colorBtn.addEventListener("click", e => { e.stopPropagation(); picker.classList.toggle("open"); });
document.addEventListener("click", () => picker.classList.remove("open"));
picker.addEventListener("click", e => e.stopPropagation());

// Font sizing
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.style.display = "none";
const ctx = canvas.getContext("2d");
const FONT = "Moke, sans-serif";

function getW() { return canvasArea.offsetWidth - 48; }
function getH() { return canvasArea.offsetHeight; }

function ensureOneLine() {
    if (!editor.querySelector("div")) {
        editor.innerHTML = "";
        const d = document.createElement("div");
        d.innerHTML = "<br>";
        editor.appendChild(d);
        const r = document.createRange();
        r.setStart(d, 0);
        r.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(r);
    }
    Array.from(editor.childNodes).forEach(n => {
        if (n.nodeType === 3 || n.nodeName === "BR") {
            const d = document.createElement("div");
            d.innerHTML = n.textContent || "<br>";
            editor.replaceChild(d, n);
        }
    });
}

function measureAt(text, size) {
    ctx.font = `${size}px ${FONT}`;
    return ctx.measureText(text).width;
}

function fitToWidth(text, W) {
    if (!text || text.trim() === "") return 0;
    let lo = 1, hi = 2000, best = 1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (measureAt(text, mid) <= W) { best = mid; lo = mid + 1; }
        else hi = mid - 1;
    }
    return best;
}

function getCurrentDiv() {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return null;
    let node = sel.getRangeAt(0).startContainer;
    while (node && node.parentNode !== editor) node = node.parentNode;
    return (node && node.nodeName === "DIV") ? node : null;
}

function updatePlaceholder() {
    const lines = editor.querySelectorAll("div");
    const isEmpty = lines.length === 0 ||
        (lines.length === 1 &&
            (lines[0].textContent.trim() === "" ||
                lines[0].innerHTML === "<br>" ||
                lines[0].innerHTML === ""));
    editor.classList.toggle("empty", isEmpty);
}

function resizeAll() {
    ensureOneLine();
    const W = getW();
    const H = getH();
    const strokeW = strokeWidthInput.value;
    Array.from(editor.querySelectorAll("div")).forEach((line, i, arr) => {
        const fw = fitToWidth(line.textContent, W);
        line.style.fontSize = Math.min(fw, H) + "px";
        line.style.marginBottom = "0";
        line.style.webkitTextStroke = `${strokeW}px ${currentStrokeColor}`;
        line.style.paintOrder = "stroke fill";
    });
    updatePlaceholder();
}

ensureOneLine();

editor.addEventListener("keydown", e => {
    if (e.key === "Enter") {
        e.preventDefault();
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        const curDiv = getCurrentDiv();
        const newDiv = document.createElement("div");
        newDiv.innerHTML = "<br>";
        if (curDiv) {
            const afterRange = document.createRange();
            afterRange.setStart(range.endContainer, range.endOffset);
            afterRange.setEnd(curDiv, curDiv.childNodes.length);
            const after = afterRange.toString();
            if (after) { afterRange.deleteContents(); newDiv.textContent = after; }
            curDiv.after(newDiv);
        } else {
            editor.appendChild(newDiv);
        }
        const r = document.createRange();
        r.setStart(newDiv.firstChild, 0);
        r.collapse(true);
        sel.removeAllRanges();
        sel.addRange(r);
        resizeAll();
    }
});

editor.addEventListener("input", resizeAll);
window.addEventListener("resize", resizeAll);
resizeAll();

async function saveAsImage() {
    const { default: html2canvas } = await import("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js");
    tooltip.style.display = "none";
    picker.classList.remove("open");

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevCanvasOverflow = canvasArea.style.overflow;
    const prevCanvasHeight = canvasArea.style.height;
    const prevEditorMin = editor.style.minHeight;

    document.body.style.overflow = "visible";
    document.documentElement.style.overflow = "visible";
    canvasArea.style.overflow = "visible";
    canvasArea.style.height = "auto";
    editor.style.minHeight = editor.scrollHeight + "px";

    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));

    const capture = await html2canvas(document.body, {
        useCORS: true,
        scale: window.devicePixelRatio || 1,
        backgroundColor: document.body.style.background || "#ffffff",
        width: document.body.scrollWidth,
        height: document.body.scrollHeight,
        windowWidth: document.body.scrollWidth,
        windowHeight: document.body.scrollHeight,
    });

    document.body.style.overflow = prevBodyOverflow;
    document.documentElement.style.overflow = prevHtmlOverflow;
    canvasArea.style.overflow = prevCanvasOverflow;
    canvasArea.style.height = prevCanvasHeight;
    editor.style.minHeight = prevEditorMin;

    capture.toBlob(blob => {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "moke-tester.png";
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
}

document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveAsImage();
    }
});