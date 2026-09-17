import { useCallback, useRef, useState } from "react";
import { UploadCloud, X, Pencil, Image as ImageIcon, AlertCircle } from "lucide-react";
import PhotoCropModal from "./PhotoCropModal";
import { normalizeMediaUrl } from "../../utils/mediaUrl";
import "./PhotoDropzone.css";

interface Props {
  value?: string | null;
  onChange: (file: File, previewUrl: string, blob: Blob) => void;
  onRemove?: () => void;
  required?: boolean;
  error?: string;
  compact?: boolean;
  disabled?: boolean;
  hint?: string;
}

const ACCEPT = "image/jpeg,image/png,image/jpg";
const MAX_BYTES = 5 * 1024 * 1024;

export default function PhotoDropzone({ value, onChange, onRemove, required, error, compact = false, disabled, hint }: Props): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const pendingFileName = useRef<string>("photo.jpg");

  const displayError = error || localError;

  const validate = (file: File): string | null => {
    if (!file.type.match(/^image\/(jpeg|jpg|png)$/)) {
      return "Поддерживаются только JPG и PNG";
    }
    if (file.size > MAX_BYTES) return "Фото до 5 МБ";
    return null;
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const err = validate(file);
    if (err) {
      setLocalError(err);
      return;
    }
    setLocalError(null);
    pendingFileName.current = file.name || "photo.jpg";
    const url = URL.createObjectURL(file);
    setCropSrc(url);
    setCropOpen(true);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  }, [disabled, handleFiles]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // reset input to allow same file re-select
    if (e.target) e.target.value = "";
  };

  const handleCropSave = (blob: Blob, previewUrl: string) => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
    const file = new File([blob], pendingFileName.current, { type: blob.type || "image/jpeg" });
    onChange(file, previewUrl, blob);
  };

  const handleCropClose = () => {
    setCropOpen(false);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  };

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const displayValue = normalizeMediaUrl(value) ?? value;

  const handleEditExisting = async () => {
    if (!value) return;
    const urlToFetch = normalizeMediaUrl(value) ?? value;
    // fetch remote image as blob to allow re-cropping (avoid taint)
    try {
      const res = await fetch(urlToFetch, { mode: "cors" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      pendingFileName.current = "photo.jpg";
      setCropSrc(url);
      setCropOpen(true);
    } catch {
      // fallback: open file picker
      openFileDialog();
    }
  };

  // compact variant — for PgResumeEditor (Image 3)
  if (compact) {
    return (
      <div className="photo-dropzone-compact-wrap">
        <div
          className={`photo-dropzone-compact ${dragOver ? "drag-over" : ""} ${value ? "has-value" : ""} ${displayError ? "has-error" : ""}`}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={!value ? openFileDialog : undefined}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!value) openFileDialog(); }}}
          aria-label="Загрузите фото"
        >
          {displayValue ? (
            <>
              <img src={displayValue} alt="Фото резюме" className="photo-dropzone-compact-thumb" />
              <div className="photo-dropzone-compact-info">
                <p className="photo-dropzone-compact-title">
                  {hint ? "Фото загружено" : "Загрузите чёткое фото"}
                  <span className="photo-dropzone-compact-badge">✓</span>
                </p>
                <p className="photo-dropzone-compact-hint">Нажмите для замены · JPG, PNG до 5 МБ · 600×600 px</p>
              </div>
              <div className="photo-dropzone-compact-actions" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="photo-dropzone-icon-btn" onClick={handleEditExisting} aria-label="Редактировать">
                  <Pencil size={16} />
                </button>
                {onRemove && (
                  <button type="button" className="photo-dropzone-icon-btn danger" onClick={onRemove} aria-label="Удалить">
                    <X size={16} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="photo-dropzone-compact-icon">
                <UploadCloud size={24} />
              </div>
              <div className="photo-dropzone-compact-info">
                <p className="photo-dropzone-compact-title">Загрузите чёткое фото</p>
                <p className="photo-dropzone-compact-hint">Перетащите фото сюда или нажмите для выбора</p>
                <p className="photo-dropzone-compact-meta">JPG, PNG до 5 МБ · Рекомендуемый размер: 600×600 px</p>
              </div>
            </>
          )}
        </div>
        {displayError ? (
          <p className="photo-dropzone-error" role="alert"><AlertCircle size={14} /> {displayError}</p>
        ) : required && !value ? (
          <p className="photo-dropzone-error" role="alert"><AlertCircle size={14} /> Фото обязательно для публикации</p>
        ) : null}
        <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onInputChange} tabIndex={-1} />
        {cropSrc && <PhotoCropModal open={cropOpen} src={cropSrc} onClose={handleCropClose} onSave={handleCropSave} initialAspect="1:1" />}
      </div>
    );
  }

  // large variant — for wizard (Image 2)
  return (
    <div className="photo-dropzone-wrap">
      {!displayValue ? (
        <div
          className={`photo-dropzone ${dragOver ? "drag-over" : ""} ${displayError ? "has-error" : ""}`}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={openFileDialog}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFileDialog(); }}}
        >
          <div className="photo-dropzone-icon-lg">
            <UploadCloud size={48} strokeWidth={1.5} />
          </div>
          <p className="photo-dropzone-title">Перетащите фото сюда<br />или нажмите для выбора</p>
          <p className="photo-dropzone-hint">JPG, PNG до 5 МБ</p>
        </div>
      ) : (
        <div className="photo-dropzone-preview">
          <img src={displayValue} alt="Фото" className="photo-dropzone-preview-img" />
          <div className="photo-dropzone-preview-overlay">
            <button type="button" className="photo-dropzone-preview-btn" onClick={handleEditExisting}>
              <Pencil size={16} /> Редактировать
            </button>
            <button type="button" className="photo-dropzone-preview-btn secondary" onClick={openFileDialog}>
              <ImageIcon size={16} /> Заменить
            </button>
            {onRemove && (
              <button type="button" className="photo-dropzone-preview-btn danger" onClick={onRemove}>
                <X size={16} /> Удалить
              </button>
            )}
          </div>
          <p className="photo-dropzone-preview-hint">Перетащите новое фото для замены · JPG, PNG до 5 МБ</p>
        </div>
      )}
      {displayError && <p className="photo-dropzone-error" role="alert"><AlertCircle size={14} /> {displayError}</p>}
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onInputChange} tabIndex={-1} />
      {cropSrc && <PhotoCropModal open={cropOpen} src={cropSrc} onClose={handleCropClose} onSave={handleCropSave} initialAspect="1:1" />}
    </div>
  );
}
