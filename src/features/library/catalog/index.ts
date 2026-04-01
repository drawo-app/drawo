import type { LibraryCatalog, LibraryCategoryId, LibrarySvgAsset } from "./types";

export type { LibraryCategoryId, LibrarySvgAsset } from "./types";

export const LIBRARY_CATEGORIES = [
  { id: "basic", name: "Basic", description: "General shapes and utilities" },
  { id: "flowchart", name: "Flowchart", description: "Flowchart symbols" },
  { id: "bpmn", name: "BPMN", description: "BPMN process symbols" },
  { id: "network", name: "Network", description: "Network infrastructure" },
  { id: "cloud", name: "Cloud", description: "Cloud services" },
  { id: "devops", name: "DevOps", description: "DevOps tools" },
  { id: "security", name: "Security", description: "Security & access" },
  { id: "devices", name: "Devices", description: "Hardware devices" },
  { id: "data", name: "Data", description: "Data storage & databases" },
  { id: "people", name: "People", description: "Users and roles" },
  { id: "communication", name: "Communication", description: "Messaging & APIs" },
  { id: "programs", name: "Programs", description: "Software & IDEs" },
  { id: "languages", name: "Languages", description: "Programming languages" },
  { id: "aws", name: "AWS", description: "Amazon Web Services" },
  { id: "custom", name: "Custom", description: "Custom assets" },
] as const satisfies LibraryCatalog["categories"];

export const LIBRARY_ASSETS: LibrarySvgAsset[] = [];

export const LIBRARY_CATALOG: LibraryCatalog = {
  categories: LIBRARY_CATEGORIES,
  assets: LIBRARY_ASSETS,
};

export function searchLibraryAssets(
  query: string,
  options?: { categoryId?: LibraryCategoryId },
): LibrarySvgAsset[] {
  const normalizedQuery = query.toLowerCase().trim();
  let assets = LIBRARY_ASSETS;
  if (options?.categoryId) {
    assets = assets.filter((a) => a.categoryId === options.categoryId);
  }
  if (!normalizedQuery) {
    return assets;
  }
  return assets.filter(
    (asset) =>
      asset.name.toLowerCase().includes(normalizedQuery) ||
      asset.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery)),
  );
}
