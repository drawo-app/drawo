export const isMac = () => {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform);
};

export const Alt = () => {
  return isMac() ? "⌥" : "Alt";
};
export const Ctrl = () => {
  return isMac() ? "⌘" : "Ctrl";
};
export const Shift = () => {
  return isMac() ? "⇧" : "Shift";
};
export const Backspace = () => {
  return isMac() ? "⌫" : "Del";
};
export const Enter = () => {
  return isMac() ? "⏎" : "Enter";
};
