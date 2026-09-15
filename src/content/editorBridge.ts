/**
 * Runs in the page's MAIN world so it can reach LeetCode's Monaco instance.
 * It only ever answers explicit requests from the isolated content script;
 * nothing is read or sent proactively.
 */
(() => {
  const REQ = "SH_EDITOR_REQUEST";
  const RES = "SH_EDITOR_RESPONSE";

  type MonacoLike = {
    editor?: {
      getModels?: () => Array<{ getValue: () => string; getLanguageId?: () => string; uri?: { toString(): string } }>;
      getEditors?: () => Array<{ getModel: () => { getValue: () => string; getLanguageId?: () => string } | null; hasTextFocus?: () => boolean }>;
    };
  };

  function read(): { code: string; language: string } | null {
    const monaco = (window as unknown as { monaco?: MonacoLike }).monaco;
    if (!monaco?.editor) return null;

    // Prefer the editor with focus (LeetCode may have several models, e.g. testcases).
    const editors = monaco.editor.getEditors?.() ?? [];
    const focused = editors.find((e) => e.hasTextFocus?.());
    const model = focused?.getModel() ?? pickBestModel(monaco.editor.getModels?.() ?? []);
    if (!model) return null;
    return { code: model.getValue(), language: model.getLanguageId?.() ?? "" };
  }

  function pickBestModel<T extends { getValue: () => string; uri?: { toString(): string } }>(models: T[]): T | null {
    if (!models.length) return null;
    // Longest non-empty model is almost always the solution editor.
    return models
      .filter((m) => !/testcase|stdin/i.test(m.uri?.toString() ?? ""))
      .sort((a, b) => b.getValue().length - a.getValue().length)[0] ?? models[0];
  }

  window.addEventListener("message", (ev: MessageEvent) => {
    if (ev.source !== window || ev.data?.type !== REQ) return;
    const snapshot = read();
    window.postMessage(
      { type: RES, nonce: ev.data.nonce, code: snapshot?.code ?? "", language: snapshot?.language ?? "" },
      "*",
    );
  });
})();
