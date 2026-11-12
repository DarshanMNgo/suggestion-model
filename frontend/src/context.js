import { createContext, useContext } from "react";

// Everything the screens share: translations, "refresh data" and small helpers.
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
