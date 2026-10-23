import type { CameraView } from "expo-camera";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { FrameImage } from "./api";

/** Largeur des images envoyées à l'IA : assez pour lire des détails, assez légère pour être rapide. */
const TARGET_WIDTH = 1024;

/**
 * Capture une image de la caméra, la réduit et la compresse.
 * L'image reste en mémoire uniquement le temps de l'envoi : rien n'est enregistré dans la galerie.
 */
export async function captureFrame(camera: CameraView | null): Promise<FrameImage | null> {
  if (!camera) return null;
  try {
    const photo = await camera.takePictureAsync({ quality: 0.7, shutterSound: false, skipProcessing: false });
    if (!photo?.uri) return null;
    const ctx = ImageManipulator.manipulate(photo.uri);
    if (photo.width > TARGET_WIDTH) ctx.resize({ width: TARGET_WIDTH });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
    if (!saved.base64) return null;
    return { data: saved.base64, mediaType: "image/jpeg", capturedAt: new Date().toISOString() };
  } catch {
    return null;
  }
}
