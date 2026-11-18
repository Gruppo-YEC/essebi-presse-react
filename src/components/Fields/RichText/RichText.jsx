import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { CheckField } from '../../ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '../../ui/dialog';

import { ResourceManager } from "../../../core/resource-manager";
import Icon from '../../BodyElements/Icon';

/**
 * RichText
 *
 * Props:
 *  - entity: qualsiasi oggetto contestuale (usato per ResourceManager)
 *  - update: funzione da chiamare su modifica -> update(fieldKey, nuovo_valore_html)
 *  - value: stringa HTML iniziale del contenuto
 *  - fieldKey: chiave del campo da aggiornare
 *
 * Funzioni chiave:
 *  - Toolbar: grassetto, corsivo, sottolineato, barrato, elenchi, link (modal),
 *    immagine (URL o upload con ResourceManager + resize), code inline, code block,
 *    select blocchi, editor HTML (modal)
 *  - Paste: incolla testo come HTML minimale (<p>/<br>)
 *  - Immagini: resize con maniglie + modifica via modal
 */
export default function RichText({ entity, update, value = "", fieldKey }) {
  const wrapperRef = useRef(null);
  const editorRef = useRef(null);
  const lastHtmlRef = useRef("");
  const savedSelectionRef = useRef(null);

  // ---- UI state ----
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(true);

  const [htmlModalOpen, setHtmlModalOpen] = useState(false);
  const [htmlDraft, setHtmlDraft] = useState("");

  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [imgMode, setImgMode] = useState("url"); // "url" | "file"
  const [imgUrl, setImgUrl] = useState("");
  const [imgFile, setImgFile] = useState(null);
  const [imgAlt, setImgAlt] = useState("");
  const [imgUploading, setImgUploading] = useState(false);
  const [imgWidthPx, setImgWidthPx] = useState("");
  const [imgHeightPx, setImgHeightPx] = useState("");
  const [editingExistingImage, setEditingExistingImage] = useState(false);

  // In-editor image selection & overlay
  const [selectedImg, setSelectedImg] = useState(null);
  const [overlayBox, setOverlayBox] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    visible: false,
  });
  const resizingRef = useRef(null); // {startX, startY, startW, startH, corner}

  // Inizializza editor
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || "";
      lastHtmlRef.current = value || "";
    }
  }, []);

  // Sync esterno -> editor
  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.innerHTML;
    if (typeof value === "string" && value !== current) {
      editorRef.current.innerHTML = value || "";
      lastHtmlRef.current = value || "";
      setSelectedImg(null);
      setOverlayBox((b) => ({ ...b, visible: false }));
    }
  }, [value]);

  // Invoca update se l'HTML è cambiato
  const sync = () => {
    if (!editorRef.current) return;
    const newHtml = editorRef.current.innerHTML;
    if (newHtml === lastHtmlRef.current) return;
    lastHtmlRef.current = newHtml;
    if (typeof update === "function") {
      try {
        update(fieldKey, newHtml);
      } catch (_) {}
    }
  };

  const focusEditor = () => {
    if (editorRef.current) editorRef.current.focus();
  };

  const handleMouseDown = (e) => e.preventDefault(); // preserva selezione sui bottoni

  const exec = (command, arg = null) => {
    if (typeof window === "undefined") return;
    focusEditor();
    document.execCommand(command, false, arg);
    setTimeout(sync, 0);
  };

  const handleButton = (e, command, arg = null) => {
    e.preventDefault();
    exec(command, arg);
  };

  // ====== SELECTION UTILS ======
  const saveSelection = () => {
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    const range = savedSelectionRef.current;
    if (!range) return false;
    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel) return false;
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  };

  const getNodeUp = (start, tag) => {
    let node = start;
    const TAG = tag.toUpperCase();
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && node.tagName === TAG) return node;
      node = node.parentNode;
    }
    return null;
  };

  const findLinkNearSelection = () => {
    const sel = window.getSelection ? window.getSelection() : null;
    let link = null;
    if (sel && sel.rangeCount > 0) link = getNodeUp(sel.anchorNode, "A");
    if (!link && savedSelectionRef.current)
      link = getNodeUp(savedSelectionRef.current.startContainer, "A");
    return link;
  };
  const findImgNearSelection = () => {
    const sel = window.getSelection ? window.getSelection() : null;
    let img = null;
    if (sel && sel.rangeCount > 0) img = getNodeUp(sel.anchorNode, "IMG");
    if (!img && savedSelectionRef.current)
      img = getNodeUp(savedSelectionRef.current.startContainer, "IMG");
    return img;
  };

  // ====== LINK ======
  const openLinkModal = () => {
    saveSelection();
    const a = findLinkNearSelection();
    setLinkUrl(a ? a.getAttribute("href") || "" : "");
    setLinkNewTab(a ? a.getAttribute("target") === "_blank" : true);
    setLinkModalOpen(true);
  };

  const confirmLink = () => {
    setLinkModalOpen(false);
    const restored = restoreSelection();
    if (!restored) focusEditor();
    if (!linkUrl) return;

    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0 && sel.isCollapsed) {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${linkUrl}">${linkUrl}</a>`
      );
    } else {
      document.execCommand("createLink", false, linkUrl);
    }

    const anchor = findLinkNearSelection();
    if (anchor) {
      if (linkNewTab) {
        anchor.setAttribute("target", "_blank");
        anchor.setAttribute("rel", "noopener noreferrer");
      } else {
        anchor.removeAttribute("target");
        anchor.removeAttribute("rel");
      }
    }
    setTimeout(sync, 0);
  };

  const unwrapAnchor = (a) => {
    const parent = a.parentNode;
    while (a.firstChild) parent.insertBefore(a.firstChild, a);
    parent.removeChild(a);
  };

  const removeLink = () => {
    const restored = restoreSelection();
    if (!restored) focusEditor();
    let anchor = findLinkNearSelection();
    if (anchor) {
      unwrapAnchor(anchor);
    } else {
      document.execCommand("unlink", false);
    }
    setLinkModalOpen(false);
    setTimeout(sync, 0);
  };

  // ====== CODE WRAPS ======
  const wrapSelectionWith = (before, after) => {
    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const container = document.createElement("div");
    const selectionHtml = range.cloneContents();
    container.appendChild(selectionHtml);
    const selectedHtml = container.innerHTML || sel.toString();
    if (!selectedHtml) return;
    range.deleteContents();
    const frag = range.createContextualFragment(
      `${before}${selectedHtml}${after}`
    );
    range.insertNode(frag);
    sel.removeAllRanges();
    const newRange = document.createRange();
    if (editorRef.current) {
      newRange.selectNodeContents(editorRef.current);
      newRange.collapse(false);
      sel.addRange(newRange);
    }
    sync();
  };
  const insertCodeInline = (e) => {
    e.preventDefault();
    wrapSelectionWith("<code>", "</code>");
  };
  const insertCodeBlock = (e) => {
    e.preventDefault();
    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0) {
      exec("insertHTML", "<pre><code>\n// codice\n</code></pre>");
      return;
    }
    const range = sel.getRangeAt(0);
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());
    const selectedHtml = container.innerHTML || "";
    const block = selectedHtml
      ? `<pre><code>${selectedHtml}</code></pre>`
      : `<pre><code>\n// codice\n</code></pre>`;
    range.deleteContents();
    const frag = range.createContextualFragment(block);
    range.insertNode(frag);
    sel.removeAllRanges();
    sync();
  };

  // ====== PASTE -> HTML minimale ======
  const escapeHtml = (str) =>
    (str || "").replace(/[&<>\"']/g, (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]
    );
  const escapeAttr = (str) =>
    (str || "").replace(/[&<>\"']/g, (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch]
    );

  const textToMinimalHtml = (plain) => {
    const norm = (plain || "").replace(/\r\n?/g, "\n");
    const paragraphs = norm.split(/\n{2,}/);
    const html = paragraphs
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");
    return html || "<p><br></p>";
  };

  const onPaste = (e) => {
    e.preventDefault();
    focusEditor();
    const cd = e.clipboardData || window.clipboardData;
    const text = cd.getData("text/plain");
    const minimal = textToMinimalHtml(text);
    document.execCommand("insertHTML", false, minimal);
    setTimeout(sync, 0);
  };

  // ====== FONT SELECT ======
  // font classici web-safe: presenti ovunque, nessun caricamento esterno
  const FONT_FAMILIES = [
    { label: "Arial", value: "Arial, sans-serif" },
    { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
    { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
    { label: "Tahoma", value: "Tahoma, Geneva, sans-serif" },
    { label: "Trebuchet MS", value: "'Trebuchet MS', Helvetica, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
    { label: "Garamond", value: "Garamond, serif" },
    { label: "Palatino", value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
    { label: "Courier New", value: "'Courier New', Courier, monospace" },
  ];

  const onChangeFont = (e) => {
    const font = e.target.value;
    if (!font) return;
    focusEditor();
    // styleWithCSS: span con font-family invece del tag <font> deprecato
    try { document.execCommand("styleWithCSS", false, true); } catch (_) {}
    document.execCommand("fontName", false, font);
    try { document.execCommand("styleWithCSS", false, false); } catch (_) {}
    e.target.selectedIndex = 0;
    setTimeout(sync, 0);
  };

  // ====== BLOCK SELECT ======
  const onChangeBlock = (e) => {
    const tag = e.target.value;
    if (!tag) return;
    focusEditor();
    const TAG = tag.toUpperCase();
    document.execCommand("formatBlock", false, TAG);
    document.execCommand("formatBlock", false, `<${TAG}>`);
    e.target.selectedIndex = 0;
    setTimeout(sync, 0);
  };

  // ====== HTML MODAL ======
  const openHtmlModal = () => {
    const current = editorRef.current ? editorRef.current.innerHTML : "";
    setHtmlDraft(current);
    setHtmlModalOpen(true);
  };
  const confirmHtmlModal = () => {
    if (!editorRef.current) {
      setHtmlModalOpen(false);
      return;
    }
    editorRef.current.innerHTML = htmlDraft;
    setHtmlModalOpen(false);
    setTimeout(sync, 0);
  };

  // ====== IMMAGINI ======
  const dataUrlToBase64 = (dataUrl) => {
    if (!dataUrl) return "";
    const idx = dataUrl.indexOf(",");
    return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  };

  const styleFromWH = (w, h) => {
    const parts = [];
    if (w && parseInt(w)) parts.push(`width:${parseInt(w, 10)}px`);
    if (h && parseInt(h)) parts.push(`height:${parseInt(h, 10)}px`);
    return parts.length ? ` style="${parts.join(";")}"` : "";
  };

  const insertImageAtSelection = (url, alt = "", w = "", h = "") => {
    if (!url) return;
    const restored = restoreSelection();
    if (!restored) focusEditor();
    const styleAttr = styleFromWH(w, h);
    const html = `<img src="${url}" alt="${escapeAttr(alt)}"${styleAttr} />`;
    document.execCommand("insertHTML", false, html);
    setTimeout(sync, 0);
  };

  const applyImageChanges = (img, url, alt, w, h) => {
    if (!img) return;
    if (url) img.setAttribute("src", url);
    img.setAttribute("alt", alt || "");
    if (w && parseInt(w)) img.style.width = `${parseInt(w, 10)}px`;
    else img.style.removeProperty("width");
    if (h && parseInt(h)) img.style.height = `${parseInt(h, 10)}px`;
    else img.style.removeProperty("height");
  };

  // Apri modal immagine: se c'è un'immagine selezionata, apri in modalità "modifica"
  const openImageModal = () => {
    const img = selectedImg || findImgNearSelection();
    saveSelection();

    if (img) {
      setEditingExistingImage(true);
      setImgUrl(img.getAttribute("src") || "");
      setImgAlt(img.getAttribute("alt") || "");
      const w =
        img.style && img.style.width
          ? parseInt(img.style.width)
          : img.getAttribute("width")
          ? parseInt(img.getAttribute("width"))
          : Math.round(img.width);
      const h =
        img.style && img.style.height
          ? parseInt(img.style.height)
          : img.getAttribute("height")
          ? parseInt(img.getAttribute("height"))
          : Math.round(img.height);
      setImgWidthPx(isFinite(w) ? String(w) : "");
      setImgHeightPx(isFinite(h) ? String(h) : "");
      setImgMode("url"); // in edit non mostro l'opzione file
      setImgFile(null);
    } else {
      setEditingExistingImage(false);
      setImgUrl("");
      setImgAlt("");
      setImgWidthPx("");
      setImgHeightPx("");
      setImgMode("url");
      setImgFile(null);
    }
    setImgModalOpen(true);
  };

  const confirmImage = async () => {
    try {
      let finalUrl = imgUrl.trim();
      setImgUploading(true);

      // Upload solo in inserimento (non in modifica esistente)
      if (!editingExistingImage && imgMode === "file" && imgFile) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onerror = () => reject(new Error("Lettura file fallita"));
          reader.onload = () => resolve(dataUrlToBase64(reader.result));
          reader.readAsDataURL(imgFile);
        });
        const resp = await ResourceManager.uploadBase64(
          base64,
          imgFile.name,
          entity
        );
        const body =
          resp && typeof resp === "object" && (resp.hash || resp.extension)
            ? resp
            : resp && resp.body
            ? resp.body
            : resp;
        finalUrl = ResourceManager.getFileUrl(body, entity);
      }

      if (editingExistingImage) {
        const img = selectedImg || findImgNearSelection();
        applyImageChanges(img, finalUrl, imgAlt, imgWidthPx, imgHeightPx);
        setImgModalOpen(false);
        setImgUploading(false);
        setTimeout(() => {
          positionImageOverlay();
          sync();
        }, 0);
        return;
      }

      setImgModalOpen(false);
      setImgUploading(false);
      insertImageAtSelection(finalUrl, imgAlt, imgWidthPx, imgHeightPx);
    } catch (err) {
      console.error("Errore upload/modifica immagine:", err);
      setImgUploading(false);
    }
  };

  // ====== OVERLAY & RESIZE in-editor ======
  const positionImageOverlay = () => {
    const img = selectedImg;
    if (!img || !wrapperRef.current) {
      setOverlayBox((b) => ({ ...b, visible: false }));
      return;
    }
    const imgRect = img.getBoundingClientRect();
    const wrapRect = wrapperRef.current.getBoundingClientRect();
    setOverlayBox({
      left: imgRect.left - wrapRect.left,
      top: imgRect.top - wrapRect.top,
      width: imgRect.width,
      height: imgRect.height,
      visible: true,
    });
  };

  useEffect(() => {
    const onWin = () => positionImageOverlay();
    window.addEventListener("resize", onWin);
    return () => window.removeEventListener("resize", onWin);
  }, [selectedImg]);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const onScroll = () => positionImageOverlay();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [selectedImg]);

  const onEditorClick = (e) => {
    const t = e.target;
    if (t && t.tagName === "IMG") {
      setSelectedImg(t);
      positionImageOverlay();
    } else {
      if (selectedImg) {
        setSelectedImg(null);
        setOverlayBox((b) => ({ ...b, visible: false }));
      }
    }
  };

  const startResize = (corner, e) => {
    if (!selectedImg) return;
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = selectedImg.offsetWidth;
    const startH = selectedImg.offsetHeight;
    resizingRef.current = { corner, startX, startY, startW, startH };
    document.addEventListener("mousemove", onResizing);
    document.addEventListener("mouseup", endResize, { once: true });
  };

  const onResizing = (e) => {
    const r = resizingRef.current;
    if (!r || !selectedImg) return;
    const dx = e.clientX - r.startX;
    const dy = e.clientY - r.startY;
    const horizSign = r.corner.includes("e") ? 1 : -1;
    let newW = Math.max(24, Math.round(r.startW + horizSign * dx));
    const ratio = r.startW / r.startH || 1;
    let newH = Math.max(24, Math.round(newW / ratio));
    if (Math.abs(dy) > Math.abs(dx)) {
      const vertSign = r.corner.includes("s") ? 1 : -1;
      newH = Math.max(24, Math.round(r.startH + vertSign * dy));
      newW = Math.max(24, Math.round(newH * ratio));
    }
    selectedImg.style.width = `${newW}px`;
    selectedImg.style.height = `${newH}px`;
    positionImageOverlay();
  };

  const endResize = () => {
    document.removeEventListener("mousemove", onResizing);
    resizingRef.current = null;
    setTimeout(sync, 0);
  };

  // Gestione input
  const onInput = () => sync();

  // Stili
  const styles = useMemo(
    () => ({
      container: {
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        position: "relative",
        fontFamily:
          "system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji'",
      },
      toolbar: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        alignItems: "center",
        padding: 8,
        background: "#f8fafc",
        borderBottom: "1px solid #e2e8f0",
        zIndex: 2,
      },
      btn: {
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        padding: "6px 10px",
        fontSize: 13,
        background: "white",
        color: "#000",
        cursor: "pointer",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      },
      select: {
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        padding: "6px 8px",
        fontSize: 13,
        background: "white",
        color: "#000",
        cursor: "pointer",
      },
      editor: {
        minHeight: 160,
        maxHeight: 480,
        padding: 12,
        outline: "none",
        overflow: "auto",
      },
      overlayLayer: {
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 3,
      },
      helperCss: (
        <style>{`
          .rt-editor * { box-sizing: border-box; }
          .rt-editor a { color: #2563eb; text-decoration: underline; }
          .rt-editor img { max-width: 100%; height: auto; }
          .rt-editor code {
            background: #f1f5f9; padding: 0.1em 0.3em; border-radius: 6px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          }
          .rt-editor pre {
            background: #0b1020; color: #e2e8f0; padding: 12px;
            border-radius: 10px; overflow: auto;
          }
          .rt-editor pre code { background: transparent; padding: 0; }
          .rt-editor ul { list-style: disc inside; margin: 0.5em 0; padding-left: 1em; }
          .rt-editor ol { list-style: decimal inside; margin: 0.5em 0; padding-left: 1em; }
          .rt-toolbar-sep { width: 1px; height: 22px; background: #e2e8f0; margin: 0 2px; }

          /* Overlay resize immagine */
          .rt-img-box { position:absolute; border:1px dashed #3b82f6; border-radius:6px; }
          .rt-img-handle { position:absolute; width:10px; height:10px; background:#3b82f6; border:2px solid #fff; border-radius:999px; pointer-events:auto; }
          .rt-img-handle.nw { left:-6px; top:-6px; cursor:nwse-resize; }
          .rt-img-handle.ne { right:-6px; top:-6px; cursor:nesw-resize; }
          .rt-img-handle.sw { left:-6px; bottom:-6px; cursor:nesw-resize; }
          .rt-img-handle.se { right:-6px; bottom:-6px; cursor:nwse-resize; }
        `}</style>
      ),
      textareaMono: {
        fontFamily:
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        fontSize: 13,
      },
    }),
    []
  );

  return (
    <div ref={wrapperRef} style={styles.container}>
      {styles.helperCss}
      <div style={styles.toolbar}>
        <select
          defaultValue=""
          style={styles.select}
          title="Tipo di blocco"
          onChange={onChangeBlock}
        >
          <option value="" disabled>
            Paragrafo / Titoli
          </option>
          <option value="p">Paragrafo</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <select
          defaultValue=""
          style={styles.select}
          title="Font"
          onChange={onChangeFont}
        >
          <option value="" disabled>
            Font
          </option>
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="rt-toolbar-sep" />
        <button
          type="button"
          title="Grassetto"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={(e) => handleButton(e, "bold")}
        >
          <Icon name="bold" />
        </button>
        <button
          type="button"
          title="Corsivo"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={(e) => handleButton(e, "italic")}
        >
          <Icon name="italic" />
        </button>
        <button
          type="button"
          title="Sottolineato"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={(e) => handleButton(e, "underline")}
        >
          <Icon name="underline" />
        </button>
        <button
          type="button"
          title="Barrato"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={(e) => handleButton(e, "strikeThrough")}
        >
          <Icon name="strikethrough" />
        </button>
        <span className="rt-toolbar-sep" />
        <button
          type="button"
          title="Elenco puntato"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={(e) => handleButton(e, "insertUnorderedList")}
        >
          <Icon name="list-ul" />
        </button>
        <button
          type="button"
          title="Elenco numerato"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={(e) => handleButton(e, "insertOrderedList")}
        >
          <Icon name="list-ol" />
        </button>
        <span className="rt-toolbar-sep" />
        <button
          type="button"
          title="Link"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={openLinkModal}
        >
          <Icon name="link" />
        </button>
        <button
          type="button"
          title="Immagine"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={openImageModal}
        >
          <Icon name="image" />
        </button>
        <span className="rt-toolbar-sep" />
        <button
          type="button"
          title="Codice inline"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={insertCodeInline}
        >
          <Icon name="code" />
        </button>
        <button
          type="button"
          title="Blocco di codice"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={insertCodeBlock}
        >
          <Icon name="file-code" />
        </button>
        <span className="rt-toolbar-sep" />
        <button
          type="button"
          title="HTML sorgente"
          style={styles.btn}
          onMouseDown={handleMouseDown}
          onClick={openHtmlModal}
        >
          <Icon name="code" /> HTML
        </button>
      </div>

      <div
        ref={editorRef}
        className="rt-editor"
        style={styles.editor}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        onInput={onInput}
        onPaste={onPaste}
        onClick={onEditorClick}
      />

      {/* Overlay per resize immagine */}
      <div style={styles.overlayLayer} aria-hidden>
        {overlayBox.visible && (
          <div
            className="rt-img-box"
            style={{
              left: overlayBox.left,
              top: overlayBox.top,
              width: overlayBox.width,
              height: overlayBox.height,
            }}
          >
            <div className="rt-img-handle nw" onMouseDown={(e) => startResize("nw", e)} />
            <div className="rt-img-handle ne" onMouseDown={(e) => startResize("ne", e)} />
            <div className="rt-img-handle sw" onMouseDown={(e) => startResize("sw", e)} />
            <div className="rt-img-handle se" onMouseDown={(e) => startResize("se", e)} />
          </div>
        )}
      </div>

      {/* Modal: Link */}
      <Dialog open={linkModalOpen} onOpenChange={(open) => { if (!open) setLinkModalOpen(false) }}>
        <DialogContent className='top-1/2 -translate-y-1/2'>
          <DialogHeader>
            <DialogTitle>Inserisci/Modifica link</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="mb-4">
                <Label htmlFor="linkUrl">URL</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  autoFocus
                />
              </div>
              <CheckField
                id="linkNewTab"
                label="Apri in una nuova scheda"
                checked={linkNewTab}
                onCheckedChange={(checked) => setLinkNewTab(checked === true)}
              />
            </form>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline-secondary" onClick={removeLink}>
              Rimuovi link
            </Button>
            <Button variant="secondary" onClick={() => setLinkModalOpen(false)}>
              Annulla
            </Button>
            <Button variant="primary" onClick={confirmLink}>
              Conferma
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: HTML sorgente */}
      <Dialog open={htmlModalOpen} onOpenChange={(open) => { if (!open) setHtmlModalOpen(false) }}>
        <DialogContent size="lg" className='top-1/2 -translate-y-1/2'>
          <DialogHeader>
            <DialogTitle>HTML sorgente</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => e.preventDefault()}>
              <Textarea
                id="htmlSource"
                rows={16}
                value={htmlDraft}
                onChange={(e) => setHtmlDraft(e.target.value)}
                spellCheck={false}
                style={styles.textareaMono}
              />
            </form>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setHtmlModalOpen(false)}>
              Annulla
            </Button>
            <Button variant="primary" onClick={confirmHtmlModal}>
              Applica
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Immagine */}
      <Dialog open={imgModalOpen} onOpenChange={(open) => { if (!open) setImgModalOpen(false) }}>
        <DialogContent className='top-1/2 -translate-y-1/2'>
          <DialogHeader>
            <DialogTitle>
              {editingExistingImage ? "Modifica immagine" : "Inserisci immagine"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form onSubmit={(e) => e.preventDefault()}>
              {!editingExistingImage && (
                <div className="mb-4" style={{ display: "flex", gap: 12 }}>
                  <label className='flex cursor-pointer items-center gap-2' htmlFor="imgModeUrl">
                    <input
                      type="radio"
                      id="imgModeUrl"
                      name="imgMode"
                      className='accent-primary'
                      checked={imgMode === "url"}
                      onChange={() => setImgMode("url")}
                    />
                    Da URL
                  </label>
                  <label className='flex cursor-pointer items-center gap-2' htmlFor="imgModeFile">
                    <input
                      type="radio"
                      id="imgModeFile"
                      name="imgMode"
                      className='accent-primary'
                      checked={imgMode === "file"}
                      onChange={() => setImgMode("file")}
                    />
                    Da file
                  </label>
                </div>
              )}
              {imgMode === "url" || editingExistingImage ? (
                <div className="mb-4">
                  <Label htmlFor="imgUrl">URL immagine</Label>
                  <Input
                    id="imgUrl"
                    type="url"
                    placeholder="https://.../immagine.jpg"
                    value={imgUrl}
                    onChange={(e) => setImgUrl(e.target.value)}
                  />
                </div>
              ) : (
                <div className="mb-4">
                  <Label htmlFor="imgFile">File immagine</Label>
                  <Input
                    id="imgFile"
                    type="file"
                    accept="image/*"
                    className='p-1'
                    onChange={(e) =>
                      setImgFile(
                        e.target.files && e.target.files[0]
                          ? e.target.files[0]
                          : null
                      )
                    }
                  />
                </div>
              )}
              <div
                className="mb-4"
                style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
              >
                <div>
                  <Label htmlFor="imgWidth">Larghezza (px)</Label>
                  <Input
                    id="imgWidth"
                    type="number"
                    min={1}
                    placeholder="auto"
                    value={imgWidthPx}
                    onChange={(e) => setImgWidthPx(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="imgHeight">Altezza (px)</Label>
                  <Input
                    id="imgHeight"
                    type="number"
                    min={1}
                    placeholder="auto"
                    value={imgHeightPx}
                    onChange={(e) => setImgHeightPx(e.target.value)}
                  />
                </div>
              </div>
              <div className="mb-1">
                <Label htmlFor="imgAlt">Alt (testo alternativo)</Label>
                <Input
                  id="imgAlt"
                  type="text"
                  value={imgAlt}
                  onChange={(e) => setImgAlt(e.target.value)}
                  placeholder="Descrizione dell'immagine"
                />
              </div>
            </form>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setImgModalOpen(false)}
              disabled={imgUploading}
            >
              Annulla
            </Button>
            <Button
              variant="primary"
              onClick={confirmImage}
              disabled={
                imgUploading ||
                (!editingExistingImage &&
                  (imgMode === "url" ? !imgUrl : !imgFile))
              }
            >
              {imgUploading ? "Caricamento..." : editingExistingImage ? "Applica" : "Inserisci"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/*
Esempio d'uso:
<RichText
  entity={myEntity}
  fieldKey="descrizione"
  value="<p>Testo <strong>iniziale</strong></p>"
  update={(key, html) => console.log("Aggiorna", key, html)}
/>
*/