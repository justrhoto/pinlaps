import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import { DataProvider } from "./store/DataProvider.tsx";
import { SyncProvider } from "./sync/SyncProvider.tsx";
import "./index.css";
import "./styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <DataProvider>
      <SyncProvider>
        <App />
      </SyncProvider>
    </DataProvider>
  </ErrorBoundary>,
);
