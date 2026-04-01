export type LibraryCategoryId =
  | "basic"
  | "flowchart"
  | "bpmn"
  | "network"
  | "cloud"
  | "devops"
  | "security"
  | "devices"
  | "data"
  | "people"
  | "communication"
  | "programs"
  | "languages"
  | "aws"
  | "custom";

export interface LibrarySvgAsset {
  id: string;
  name: string;
  categoryId: LibraryCategoryId;
  tags: string[];
  viewBox: string;
  svg: string;
  defaultWidth: number;
  defaultHeight: number;
}

export interface LibraryCategory {
  id: LibraryCategoryId;
  name: string;
  description: string;
}

export interface LibraryCatalog {
  categories: LibraryCategory[];
  assets: LibrarySvgAsset[];
}
