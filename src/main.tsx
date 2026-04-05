import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Drawo } from "./lib/Drawo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Drawo />
  </StrictMode>,
);
