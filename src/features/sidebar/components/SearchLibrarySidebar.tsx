import { useMemo, useState, type KeyboardEvent } from "react";
import type { Scene } from "@core/scene";
import { parseRichText, type SceneElement } from "@core/elements";
import {
  LIBRARY_CATALOG,
  searchLibraryAssets,
  type LibraryCategoryId,
  type LibrarySvgAsset,
} from "@features/library/catalog";
import { toSvgDataUri } from "@features/library/svgAsset";
import "./SearchLibrarySidebar.css";
import {
  BoxMinimalistic,
  Ghost,
  Library,
  Magnifier,
  NotesMinimalistic,
  Text,
} from "@solar-icons/react";
import { ChevronLeft, ChevronRight, Xmark } from "@gravity-ui/icons";

type SidebarTab = "search" | "library";

interface SearchResult {
  id: string;
  label: string;
  typeLabel: string;
  text: string;
}

interface SearchLibrarySidebarProps {
  scene: Scene;
  isOpen: boolean;
  onOpenChange: (nextIsOpen: boolean) => void;
  onFocusElement: (id: string) => void;
  onInsertLibraryAsset: (asset: LibrarySvgAsset) => void;
}

const normalizeSearchText = (value: string): string => {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
};

const toPlainText = (value: string) =>
  parseRichText(value)
    .map((line) => line.runs.map((run) => run.text).join(""))
    .join("\n")
    .trim();

const getElementSearchPayload = (
  element: SceneElement,
): SearchResult | null => {
  if (element.type === "text") {
    const text = toPlainText(element.text);
    if (!text) {
      return null;
    }

    return {
      id: element.id,
      label: "Text",
      typeLabel: "Text",
      text,
    };
  }

  if (element.type === "rectangle" || element.type === "circle") {
    const text = toPlainText(element.text);
    if (!text) {
      return null;
    }

    return {
      id: element.id,
      label: element.type === "rectangle" ? "Rectángulo" : "Círculo",
      typeLabel: "Shape",
      text,
    };
  }

  return null;
};

const getSearchSnippet = (text: string, query: string): string => {
  if (!query) {
    return text;
  }

  const normalizedText = normalizeSearchText(text);
  const index = normalizedText.indexOf(query);
  if (index < 0) {
    return text;
  }

  const start = Math.max(0, index - 28);
  const end = Math.min(text.length, index + query.length + 48);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < text.length ? "..." : "";

  return `${prefix}${text.slice(start, end)}${suffix}`;
};

export const SearchLibrarySidebar = ({
  scene,
  isOpen,
  onOpenChange,
  onFocusElement,
  onInsertLibraryAsset,
}: SearchLibrarySidebarProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>("search");
  const [query, setQuery] = useState("");
  const [activeResultIndex, setActiveResultIndex] = useState(0);
  const [activeLibraryCategory, setActiveLibraryCategory] =
    useState<LibraryCategoryId | null>(null);
  const [selectedLibraryAssetId, setSelectedLibraryAssetId] = useState<
    string | null
  >(null);

  const normalizedQuery = normalizeSearchText(query);

  const searchResults = useMemo(() => {
    const searchable = scene.elements
      .map((element) => getElementSearchPayload(element))
      .filter((payload): payload is SearchResult => payload !== null);

    if (!normalizedQuery) {
      return searchable;
    }

    return searchable.filter((item) =>
      normalizeSearchText(item.text).includes(normalizedQuery),
    );
  }, [normalizedQuery, scene.elements]);

  const clampedResultIndex =
    searchResults.length === 0
      ? 0
      : Math.min(activeResultIndex, searchResults.length - 1);

  const goToResult = (index: number) => {
    if (searchResults.length === 0) {
      return;
    }

    const nextIndex =
      ((index % searchResults.length) + searchResults.length) %
      searchResults.length;
    setActiveResultIndex(nextIndex);
    onFocusElement(searchResults[nextIndex].id);
  };

  const handleSearchSubmit = () => {
    if (searchResults.length === 0) {
      return;
    }

    goToResult(clampedResultIndex);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearchSubmit();
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      goToResult(clampedResultIndex + 1);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      goToResult(clampedResultIndex - 1);
    }
  };

  const libraryAssets = useMemo(() => {
    return searchLibraryAssets(query, {
      categoryId: activeLibraryCategory,
    });
  }, [activeLibraryCategory, query]);

  if (!isOpen) {
    return null;
  }

  return (
    <aside
      id="search-library-sidebar"
      className="sidebar-page-panel"
      role="dialog"
    >
      <div
        className="sidebar-tabs"
        role="tablist"
        aria-label="Buscar o librería"
      >
        <button
          type="button"
          className={`sidebar-tab ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
          role="tab"
          aria-selected={activeTab === "search"}
        >
          <Magnifier weight="BoldDuotone" size={15} />
          Buscar
        </button>
        <button
          type="button"
          className={`sidebar-tab ${activeTab === "library" ? "active" : ""}`}
          onClick={() => setActiveTab("library")}
          role="tab"
          aria-selected={activeTab === "library"}
        >
          <Library weight="BoldDuotone" size={15} />
          Librería
        </button>
        <button
          type="button"
          className="sidebar-page-close"
          onClick={() => onOpenChange(false)}
          aria-label="Cerrar sidebar"
        >
          <Xmark className="size-4" />
        </button>
      </div>

      {activeTab === "search" ? (
        <section className="sidebar-section">
          <div className="sidebar-search-wrap">
            <Magnifier size={16} className="sidebar-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveResultIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Buscar texto en elementos..."
              className="sidebar-search-input"
            />
          </div>

          <div className="sidebar-search-toolbar">
            <span className="sidebar-search-count">
              {searchResults.length === 0
                ? "0 resultados"
                : `${clampedResultIndex + 1}/${searchResults.length}`}
            </span>
            <div className="sidebar-search-actions">
              <button
                type="button"
                className="sidebar-mini-btn"
                onClick={() => goToResult(clampedResultIndex - 1)}
                disabled={searchResults.length === 0}
                title="Anterior"
              >
                <ChevronLeft className="size-7" />
              </button>
              <button
                type="button"
                className="sidebar-mini-btn"
                onClick={() => goToResult(clampedResultIndex + 1)}
                disabled={searchResults.length === 0}
                title="Siguiente"
              >
                <ChevronRight className="size-7" />
              </button>
            </div>
          </div>

          <div className="sidebar-search-results">
            {searchResults.length === 0 ? (
              <div className="sidebar-empty-state">
                <Ghost weight="BoldDuotone" />
                <p>No hay coincidencias con ese texto.</p>
              </div>
            ) : (
              searchResults.map((result, index) => (
                <button
                  key={result.id}
                  type="button"
                  className={`sidebar-result-item ${
                    clampedResultIndex === index ? "active" : ""
                  }`}
                  onClick={() => goToResult(index)}
                >
                  <span className="sidebar-result-meta">
                    <span className="sidebar-result-type">
                      {result.typeLabel.toUpperCase() === "TEXT" ? (
                        <>
                          <Text />
                        </>
                      ) : result.typeLabel.toUpperCase() === "SHAPE" ? (
                        <>
                          <NotesMinimalistic />
                        </>
                      ) : (
                        <>{result.typeLabel}</>
                      )}
                    </span>
                    <span className="sidebar-result-label">{result.label}</span>
                  </span>
                  <span className="sidebar-result-text">
                    "{getSearchSnippet(result.text, normalizedQuery)}"
                  </span>
                </button>
              ))
            )}
          </div>
        </section>
      ) : (
        <section className="sidebar-section">
          <div className="sidebar-search-wrap">
            <Magnifier size={16} className="sidebar-search-icon" />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar assets por nombre o tags..."
              className="sidebar-search-input"
            />
          </div>

          <div className="sidebar-library-categories" role="tablist">
            <button
              type="button"
              className={`sidebar-library-category-pill ${
                activeLibraryCategory === null ? "active" : ""
              }`}
              onClick={() => setActiveLibraryCategory(null)}
            >
              Todo
              <span>{LIBRARY_CATALOG.assets.length}</span>
            </button>
            {LIBRARY_CATALOG.categories.map((category) => {
              const count = LIBRARY_CATALOG.assets.filter(
                (asset) => asset.categoryId === category.id,
              ).length;
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`sidebar-library-category-pill ${
                    activeLibraryCategory === category.id ? "active" : ""
                  }`}
                  onClick={() => setActiveLibraryCategory(category.id)}
                  title={category.description}
                >
                  {category.name}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>

          <p className="sidebar-library-note">
            {libraryAssets.length} asset{libraryAssets.length === 1 ? "" : "s"}{" "}
            disponible
            {activeLibraryCategory ? "s en la categoría" : "s"}.
          </p>

          {libraryAssets.length === 0 ? (
            <div className="sidebar-empty-state sidebar-library-empty-state">
              <Ghost weight="BoldDuotone" />
              <p>No hay resultados para tu búsqueda.</p>
            </div>
          ) : (
            <div className="sidebar-library-grid">
              {libraryAssets.map((asset) => {
                const previewSrc = toSvgDataUri(asset.svg);
                const isSelected = selectedLibraryAssetId === asset.id;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`sidebar-library-asset ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedLibraryAssetId(asset.id);
                      onInsertLibraryAsset(asset);
                    }}
                    title={`${asset.name} • ${asset.tags.join(", ")}`}
                  >
                    <div className="sidebar-library-asset-preview">
                      {previewSrc ? (
                        <img src={previewSrc} alt={asset.name} loading="lazy" />
                      ) : (
                        <BoxMinimalistic />
                      )}
                    </div>
                    <div className="sidebar-library-asset-meta">
                      <span className="sidebar-library-asset-name">
                        {asset.name}
                      </span>
                      <span className="sidebar-library-asset-tags">
                        {asset.tags.slice(0, 3).join(" · ")}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}
    </aside>
  );
};
