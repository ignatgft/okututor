import { useEffect, useRef, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, RotateCcw } from "lucide-react";

export type CropAspect = "1:1" | "4:3" | "free";

interface Props {
  open: boolean;
  src: string;
  fileName?: string;
  initialAspect?: CropAspect;
  onClose: () => void;
  onSave: (blob: Blob, previewUrl: string) => void;
}

export default function PhotoCropModal({ open, src, initialAspect = "1:1", onClose, onSave }: Props): JSX.Element | null {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropRef = useRef<HTMLDivElement>(null);

  const [aspect, setAspect] = useState<CropAspect>(initialAspect);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [baseSize, setBaseSize] = useState({ w: 400, h: 400 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [saving, setSaving] = useState(false);

  // Reset when src changes / open
  useEffect(() => {
    if (open) {
      setScale(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setAspect(initialAspect);
    }
  }, [open, src, initialAspect]);

  const handleImageLoad = useCallback(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (!img || !container) return;
    const natW = img.naturalWidth;
    const natH = img.naturalHeight;
    setNaturalSize({ w: natW, h: natH });
    const rect = container.getBoundingClientRect();
    const cw = rect.width || 400;
    const ch = rect.height || 320;
    // fit image into container with 90% margin, preserve aspect
    const fit = Math.min((cw * 0.92) / natW, (ch * 0.92) / natH, 1);
    // if image smaller than crop, we still want it to cover; initial scale will handle
    setBaseSize({ w: natW * fit, h: natH * fit });
    // after fitting, ensure it covers crop area: auto-zoom if needed
    // crop size approx 0.75 * min(cw,ch) for 1:1
    // compute minimal cover scale after fit
    // we keep scale at 1 initially, user can zoom; but if image is tiny vs crop, bump scale
    // we'll compute after crop size is known via aspect; for now keep 1
  }, []);

  useEffect(() => {
    if (!open) return;
    const img = imageRef.current;
    if (img?.complete && img.naturalWidth) handleImageLoad();
  }, [open, handleImageLoad]);

  // Drag to pan image
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button") || (e.target as HTMLElement).closest("input")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset({ x: dragStart.current.ox + dx, y: dragStart.current.oy + dy });
  };
  const onPointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    dragStart.current = null;
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(3, Math.max(0.5, s + delta)));
  };

  const rotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);

  const handleSave = async () => {
    const container = containerRef.current;
    const img = imageRef.current;
    const cropEl = cropRef.current;
    if (!container || !img || !cropEl) return;
    setSaving(true);
    try {
      const containerRect = container.getBoundingClientRect();
      const cropRect = cropEl.getBoundingClientRect();

      const cropX = cropRect.left - containerRect.left;
      const cropY = cropRect.top - containerRect.top;
      const cropW = cropRect.width;
      const cropH = cropRect.height;

      const DPR = window.devicePixelRatio || 1;
      // viewport canvas — represents what user sees in container
      const viewportCanvas = document.createElement("canvas");
      viewportCanvas.width = Math.round(containerRect.width * DPR);
      viewportCanvas.height = Math.round(containerRect.height * DPR);
      const vctx = viewportCanvas.getContext("2d");
      if (!vctx) throw new Error("no 2d context");
      vctx.scale(DPR, DPR);
      // fill white background (for JPEG export)
      vctx.fillStyle = "#ffffff";
      vctx.fillRect(0, 0, containerRect.width, containerRect.height);

      // draw image with current transforms
      vctx.save();
      // translate to center + offset
      vctx.translate(containerRect.width / 2 + offset.x, containerRect.height / 2 + offset.y);
      vctx.rotate((rotation * Math.PI) / 180);
      vctx.scale(scale, scale);
      // draw image centered
      vctx.drawImage(img, -baseSize.w / 2, -baseSize.h / 2, baseSize.w, baseSize.h);
      vctx.restore();

      // output size: keep high quality — 800 on longest side or 600 for square
      let exportW: number;
      let exportH: number;
      if (aspect === "1:1") {
        exportW = 600;
        exportH = 600;
      } else if (aspect === "4:3") {
        exportW = 800;
        exportH = 600;
      } else {
        // free: keep crop aspect, 800 on longest
        const ratio = cropW / cropH;
        if (ratio >= 1) {
          exportW = 800;
          exportH = Math.round(800 / ratio);
        } else {
          exportH = 800;
          exportW = Math.round(800 * ratio);
        }
        // clamp to reasonable max 1200
        if (exportW > 1200 || exportH > 1200) {
          const s = 1200 / Math.max(exportW, exportH);
          exportW = Math.round(exportW * s);
          exportH = Math.round(exportH * s);
        }
      }

      const outCanvas = document.createElement("canvas");
      outCanvas.width = exportW;
      outCanvas.height = exportH;
      const octx = outCanvas.getContext("2d");
      if (!octx) throw new Error("no out ctx");
      octx.imageSmoothingEnabled = true;
      octx.imageSmoothingQuality = "high";
      // draw cropped region scaled to export size
      octx.drawImage(
        viewportCanvas,
        cropX * DPR,
        cropY * DPR,
        cropW * DPR,
        cropH * DPR,
        0,
        0,
        exportW,
        exportH
      );

      const blob: Blob | null = await new Promise((resolve) =>
        outCanvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
      );
      if (!blob) throw new Error("toBlob failed");
      const previewUrl = URL.createObjectURL(blob);
      onSave(blob, previewUrl);
    } catch (e) {
      console.error("crop save failed", e);
      // fallback: just pass original src blob fetch?
      try {
        const res = await fetch(src);
        const b = await res.blob();
        onSave(b, src);
      } catch { /* ignore */ }
    } finally {
      setSaving(false);
    }
  };

  // close on Esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  // crop box dimensions based on aspect and container
  // we render crop box via CSS absolute center with fixed %; use inline style computed from aspect
  // For simplicity, fixed sizes in CSS adapt; but we need JS for export math to match visual.
  // Crop box visual size: we use CSS to set width/height via custom properties derived from aspect
  // Here compute style object to pass to cropRef
  const getCropStyle = (): React.CSSProperties => {
    // percentages relative to container
    if (aspect === "1:1") {
      return { width: "68%", aspectRatio: "1 / 1", maxWidth: "340px", maxHeight: "340px" };
    }
    if (aspect === "4:3") {
      return { width: "76%", aspectRatio: "4 / 3", maxWidth: "380px", maxHeight: "285px" };
    }
    // free — 80% width, 70% height, but allow any ratio ( визуально 4:3-ish )
    return { width: "78%", height: "68%", maxWidth: "380px", maxHeight: "300px" };
  };

  return (
    <div className="photo-crop-overlay" role="dialog" aria-modal="true" aria-label="Редактирование фото">
      <div className="photo-crop-backdrop" onClick={onClose} />
      <div className="photo-crop-modal">
        <div className="photo-crop-header">
          <h2>Редактирование фото</h2>
          <button type="button" className="photo-crop-close" onClick={onClose} aria-label="Закрыть">
            <X size={20} />
          </button>
        </div>

        <div className="photo-crop-viewport-wrap">
          <div
            ref={containerRef}
            className="photo-crop-viewport"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={handleWheel}
            style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
          >
            {/* hidden img for canvas draw source — also visible */}
            <img
              ref={imageRef}
              src={src}
              alt="preview"
              draggable={false}
              onLoad={handleImageLoad}
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: baseSize.w,
                height: baseSize.h,
                maxWidth: "none",
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${scale})`,
                transformOrigin: "center center",
                userSelect: "none",
                pointerEvents: "none",
                display: naturalSize.w ? "block" : "none",
              }}
            />
            {/* crop box */}
            <div ref={cropRef} className="photo-crop-box" style={getCropStyle()}>
              <div className="photo-crop-grid">
                <span className="photo-crop-grid-line v1" />
                <span className="photo-crop-grid-line v2" />
                <span className="photo-crop-grid-line h1" />
                <span className="photo-crop-grid-line h2" />
              </div>
              {/* corner handles — decorative but also hint drag */}
              <span className="photo-crop-handle tl" />
              <span className="photo-crop-handle tr" />
              <span className="photo-crop-handle bl" />
              <span className="photo-crop-handle br" />
            </div>
            {/* overlay outside crop is via box-shadow on .photo-crop-box */}
          </div>
        </div>

        <div className="photo-crop-controls">
          <div className="photo-crop-zoom-row">
            <button type="button" className="photo-crop-icon-btn" onClick={() => setScale((s) => Math.max(0.5, s - 0.15))} aria-label="Уменьшить">
              <ZoomOut size={18} />
            </button>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.05}
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="photo-crop-slider"
              aria-label="Масштаб"
            />
            <button type="button" className="photo-crop-icon-btn" onClick={() => setScale((s) => Math.min(3, s + 0.15))} aria-label="Увеличить">
              <ZoomIn size={18} />
            </button>
          </div>

          <div className="photo-crop-rotate-row">
            <button type="button" className="photo-crop-rotate-btn" onClick={rotateLeft}>
              <RotateCcw size={18} /> Повернуть влево
            </button>
            <button type="button" className="photo-crop-rotate-btn" onClick={rotateRight}>
              Повернуть вправо <RotateCw size={18} />
            </button>
          </div>

          <div className="photo-crop-aspect">
            <p className="photo-crop-aspect-label">Пропорции</p>
            <div className="photo-crop-aspect-btns">
              {(["1:1", "4:3", "free"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  className={`photo-crop-aspect-btn ${aspect === a ? "active" : ""}`}
                  onClick={() => setAspect(a)}
                >
                  {a === "free" ? "свободный" : a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="photo-crop-footer">
          <button type="button" className="btn btn-secondary photo-crop-footer-btn" onClick={onClose} disabled={saving}>
            Отмена
          </button>
          <button type="button" className="btn btn-primary photo-crop-footer-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Сохранение..." : "Сохранить и применить"}
          </button>
        </div>
      </div>
    </div>
  );
}
