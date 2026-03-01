import "./index.css";
import Overlay from "./windows/Overlay";
import Editor from "./windows/Editor";
import Settings from "./windows/Settings";

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  if (view === "overlay") return <Overlay />;
  if (view === "editor") return <Editor />;
  return <Settings />;
}

export default App;
