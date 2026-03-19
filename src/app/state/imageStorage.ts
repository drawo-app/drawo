const IMAGE_DB_NAME = "drawo-images";
const IMAGE_DB_VERSION = 1;
const IMAGE_STORE_NAME = "images";
const MAX_IMAGE_DIMENSION_PX = 4096;
const IMAGE_WEBP_QUALITY = 0.86;

interface StoredImageRecord {
  id: string;
  blob: Blob;
  createdAt: number;
}

export interface PreparedImageAsset {
  assetId: string;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
}

const isIndexedDbSupported = () => typeof indexedDB !== "undefined";

const toDataError = (error: unknown, fallbackMessage: string) =>
  error instanceof Error ? error : new Error(fallbackMessage);

const generateImageAssetId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const openImageDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbSupported()) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = indexedDB.open(IMAGE_DB_NAME, IMAGE_DB_VERSION);

    request.onerror = () => {
      reject(toDataError(request.error, "Failed to open image database"));
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IMAGE_STORE_NAME)) {
        db.createObjectStore(IMAGE_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
};

const runImageStoreTransaction = async <T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> => {
  const db = await openImageDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(IMAGE_STORE_NAME, mode);
    const store = transaction.objectStore(IMAGE_STORE_NAME);
    const request = executor(store);

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(toDataError(request.error, "IndexedDB request failed"));
    };

    transaction.onerror = () => {
      reject(toDataError(transaction.error, "IndexedDB transaction failed"));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
};

const loadImageFromBlob = (blob: Blob): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to decode image blob"));
    };

    image.src = objectUrl;
  });
};

const getImageDimensions = async (blob: Blob) => {
  const image = await loadImageFromBlob(blob);
  return {
    naturalWidth: Math.max(1, image.naturalWidth),
    naturalHeight: Math.max(1, image.naturalHeight),
  };
};

export const optimizeImageBlob = async (
  blob: Blob,
): Promise<{ blob: Blob; naturalWidth: number; naturalHeight: number }> => {
  if (!blob.type.startsWith("image/")) {
    return {
      blob,
      ...(await getImageDimensions(blob)),
    };
  }

  try {
    const sourceImage = await loadImageFromBlob(blob);
    const sourceWidth = Math.max(1, sourceImage.naturalWidth);
    const sourceHeight = Math.max(1, sourceImage.naturalHeight);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION_PX / sourceWidth,
      MAX_IMAGE_DIMENSION_PX / sourceHeight,
    );
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      return {
        blob,
        naturalWidth: sourceWidth,
        naturalHeight: sourceHeight,
      };
    }

    context.drawImage(sourceImage, 0, 0, targetWidth, targetHeight);

    const optimizedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", IMAGE_WEBP_QUALITY);
    });

    if (!optimizedBlob) {
      return {
        blob,
        naturalWidth: sourceWidth,
        naturalHeight: sourceHeight,
      };
    }

    const shouldUseOptimized =
      scale < 1 || optimizedBlob.size < blob.size * 0.92;

    if (!shouldUseOptimized) {
      return {
        blob,
        naturalWidth: sourceWidth,
        naturalHeight: sourceHeight,
      };
    }

    return {
      blob: optimizedBlob,
      naturalWidth: targetWidth,
      naturalHeight: targetHeight,
    };
  } catch {
    return {
      blob,
      ...(await getImageDimensions(blob)),
    };
  }
};

export const optimizeImageFile = async (
  file: File,
): Promise<{ blob: Blob; naturalWidth: number; naturalHeight: number }> => {
  return optimizeImageBlob(file);
};

export const storeImageBlob = async (
  blob: Blob,
  id = generateImageAssetId(),
): Promise<string> => {
  await runImageStoreTransaction("readwrite", (store) =>
    store.put({
      id,
      blob,
      createdAt: Date.now(),
    } as StoredImageRecord),
  );

  return id;
};

export const getStoredImageBlob = async (id: string): Promise<Blob | null> => {
  const record = await runImageStoreTransaction<StoredImageRecord | undefined>(
    "readonly",
    (store) => store.get(id),
  );

  return record?.blob ?? null;
};

export const sourceToBlob = async (src: string): Promise<Blob> => {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error("Unable to fetch image source");
  }

  return response.blob();
};

export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read blob as DataURL"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Blob read failed"));
    reader.readAsDataURL(blob);
  });

export const prepareAndStoreImageFile = async (
  file: File,
): Promise<PreparedImageAsset> => {
  const optimized = await optimizeImageFile(file);
  const assetId = await storeImageBlob(optimized.blob);
  const src = URL.createObjectURL(optimized.blob);

  return {
    assetId,
    src,
    naturalWidth: optimized.naturalWidth,
    naturalHeight: optimized.naturalHeight,
  };
};
