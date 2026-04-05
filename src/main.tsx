import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Drawo } from "./lib";

// Default - renders everything automatically
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Drawo></Drawo>
  </StrictMode>,
);
