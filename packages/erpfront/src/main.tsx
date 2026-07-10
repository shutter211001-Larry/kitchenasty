import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { api } from './lib/api';
import "./i18n";
import "./index.css";
import App from "./App.tsx";

        "http://localhost:3000/shutter-erp",
      );
    }
  }
  return config;
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
