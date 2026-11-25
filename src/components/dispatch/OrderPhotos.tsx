import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t, useLang } from "@/lib/i18n";

export const PHOTOS_REQUIRED = 3;
const BUCKET = "order-photos";

type Photo = { path: string; url: string };

// Shrinks a camera photo to max 1600px and re-encodes it as JPEG (~300 KB) before upload.
async function compress(file: File): Promise<Blob> {
  const src = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
    const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * scale);
    c.height = Math.round(img.naturalHeight * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", 0.8));
    return blob ?? file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(src);
  }
}

export function useOrderPhotos(orderId: string) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    const { data } = await supabase.storage.from(BUCKET).list(orderId, { sortBy: { column: "name", order: "asc" } });
    const paths = (data ?? []).filter((f) => f.name && !f.name.startsWith(".")).map((f) => `${orderId}/${f.name}`);
    if (!paths.length) { setPhotos([]); setLoaded(true); return; }
    const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
    setPhotos((signed ?? []).filter((s) => s.signedUrl).map((s) => ({ path: s.path!, url: s.signedUrl })));
    setLoaded(true);
  }, [orderId]);
  useEffect(() => { void load(); }, [load]);
  return { photos, loaded, reload: load };
}

// Driver: take the 3 required photos of an accepted order (camera opens directly on phones).
export function OrderPhotoCapture({ orderId, onCount }: { orderId: string; onCount: (n: number) => void }) {
  useLang();
  const { photos, reload } = useOrderPhotos(orderId);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const cb = useRef(onCount);
  cb.current = onCount;
  useEffect(() => { cb.current(photos.length); }, [photos.length]);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compress(file);
      const path = `${orderId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      await reload();
    } catch (e) {
      toast.error(`${t("photoFailed")}: ${(e as Error).message}`);
    }
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  const remove = async (path: string) => {
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) toast.error(error.message);
    await reload();
  };

  const missing = Math.max(0, PHOTOS_REQUIRED - photos.length);
  return (
    <div className="mt-3">
      <p className="text-sm font-semibold">{t("photosTitle")}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.path} className="relative aspect-square overflow-hidden rounded-xl bg-secondary">
            <img src={p.url} alt="" className="size-full object-cover" />
            <button type="button" onClick={() => remove(p.path)} aria-label={t("remove")}
              className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
              <X className="size-4" />
            </button>
          </div>
        ))}
        {Array.from({ length: missing }).map((_, i) => (
          <button key={i} type="button" disabled={busy} onClick={() => input.current?.click()}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/40 text-xs font-semibold text-primary disabled:opacity-50">
            <Camera className="size-6" />
            {busy && i === 0 ? t("uploading") : `${t("photo")} ${photos.length + i + 1}`}
          </button>
        ))}
      </div>
      {missing > 0 && <p className="mt-2 text-xs text-muted-foreground">{t("photosRequired", { n: missing })}</p>}
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => void upload(e.target.files?.[0])} />
    </div>
  );
}

// Admin: view an order's photos (tap to open full size).
export function OrderPhotoGallery({ orderId }: { orderId: string }) {
  useLang();
  const { photos, loaded } = useOrderPhotos(orderId);
  if (!loaded) return <p className="mt-2 text-xs text-muted-foreground">{t("loading")}</p>;
  if (!photos.length) return <p className="mt-2 text-xs text-muted-foreground">{t("noPhotos")}</p>;
  return (
    <div className="mt-2 grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <a key={p.path} href={p.url} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-lg bg-secondary">
          <img src={p.url} alt="" className="size-full object-cover" />
        </a>
      ))}
    </div>
  );
}
