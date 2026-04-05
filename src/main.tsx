import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Drawo,
  DrawoCanvas,
  DrawoEmptyState,
  DrawoToolBar,
  DrawoTopBar,
  DrawoUndoBar,
  DrawoZoomBar,
} from "./lib";

// Default - renders everything automatically
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Drawo></Drawo>
  </StrictMode>,
);

// Custom example (uncomment to test):
// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <Drawo>
//       <DrawoTopBar left={<h1>My App</h1>} right={<span>Custom</span>} />
//       <DrawoCanvas />
//       <DrawoToolBar />
//       <DrawoUndoBar />
//       <DrawoZoomBar />
//     </Drawo>
//   </StrictMode>,
// );
