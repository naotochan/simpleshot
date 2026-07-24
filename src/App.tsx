import "./index.css";
import Overlay from "./windows/Overlay";
import Editor from "./windows/Editor";
import Settings from "./windows/Settings";
import { AppChromeProvider } from "./lib/AppChromeProvider";

function AppRouter() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "overlay") return <Overlay />;
  if (view === "editor") return <Editor />;
  return <Settings />;
}

function App() {
  return (
    <AppChromeProvider>
      <AppRouter />
    </AppChromeProvider>
  );
}

export default App;
