import { createRoot } from "react-dom/client";
import StudyApp from "../app/study-app";
import "../app/globals.css";
import { setAssetBase } from "../app/asset-path";
setAssetBase("./");
const unused = () => {};
createRoot(document.getElementById("root")!).render(
  <StudyApp user={null} localOnly onSignIn={unused} onSignOut={unused} onManageAccount={unused} />,
);
