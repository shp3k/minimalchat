import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("MinimalChat root element is missing");
}

const root = ReactDOM.createRoot(rootElement);

function renderStartupError(error: unknown) {
  console.error("MinimalChat startup failed", error);

  root.render(
    <main className="grid h-screen min-h-[600px] min-w-[900px] place-items-center bg-background p-8 text-primaryText">
      <section className="w-full max-w-md rounded-2xl border border-red-500/20 bg-panel p-6 shadow-glow">
        <h1 className="text-lg font-semibold">Не удалось запустить MinimalChat</h1>
        <p className="mt-2 text-sm leading-6 text-secondaryText">
          Приложение столкнулось с ошибкой при загрузке. Перезапустите его. Если ошибка повторится, установите последнюю
          версию из GitHub Releases.
        </p>
        <button
          type="button"
          className="mt-5 h-10 rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:brightness-110"
          onClick={() => window.location.reload()}
        >
          Перезапустить
        </button>
      </section>
    </main>
  );
}

window.addEventListener("error", (event) => {
  renderStartupError(event.error ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  renderStartupError(event.reason);
});

import("./App")
  .then(({ App }) => {
    root.render(<App />);
  })
  .catch(renderStartupError);
