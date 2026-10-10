import React from "react";
import ReactDOM from "react-dom/client";
import axios from "axios";
import "./index.css";
import "./redesign.css";
import "./branding.css";
import App from "./App";

if (process.env.REACT_APP_API_URL) {
  axios.defaults.baseURL = process.env.REACT_APP_API_URL.replace(/\/+$/, "");
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
