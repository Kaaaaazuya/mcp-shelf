import { useState } from 'react';
import { INITIAL_PRESET, PRESETS } from '../lib/console-presets';

interface Result {
  status: string;
  ok: boolean;
  text: string;
  expanded: boolean;
}

/** ツール結果の content[].text が JSON なら展開して読みやすくする */
export function formatResponse(json: unknown): { text: string; expanded: boolean } {
  const result = (json as { result?: { content?: { type: string; text: string }[] } })?.result;
  const first = result?.content?.[0];
  if (first?.type === 'text') {
    try {
      return { text: JSON.stringify(JSON.parse(first.text), null, 2), expanded: true };
    } catch {
      return { text: first.text, expanded: true };
    }
  }
  return { text: JSON.stringify(json, null, 2), expanded: false };
}

export function McpConsole({ initialResponse }: { initialResponse: unknown }) {
  const [active, setActive] = useState(INITIAL_PRESET);
  const [result, setResult] = useState<Result>({
    status: '200 OK',
    ok: true,
    ...formatResponse(initialResponse),
  });
  const [pending, setPending] = useState(false);

  async function send(index: number) {
    setActive(index);
    setPending(true);
    // react/purity は描画中の呼び出しを咎めるルールだが、ここはクリック時に走る send の中
    // oxlint-disable-next-line react/purity
    const started = performance.now();
    try {
      const res = await fetch('/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(PRESETS[index].body),
      });
      // oxlint-disable-next-line react/purity
      const ms = Math.round(performance.now() - started);
      const json = await res.json();
      setResult({
        status: `${res.status} ${res.statusText || ''}`.trim() + ` · ${ms} ms`,
        ok: res.ok,
        ...formatResponse(json),
      });
    } catch (err) {
      setResult({ status: 'エラー', ok: false, text: String(err), expanded: false });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="console" aria-label="MCP コンソール">
      <div className="console-head">
        <h2>その場で呼んでみる</h2>
        <p>ボタンを押すと、このサイトに本物のリクエストを送ります</p>
      </div>
      <div className="console-tabs" role="tablist" aria-label="送るリクエスト">
        {PRESETS.map((preset, i) => (
          <button
            key={preset.label}
            type="button"
            role="tab"
            aria-selected={i === active}
            onClick={() => send(i)}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="console-pane">
        <div className="console-pane-head mono">→ POST /mcp</div>
        <pre className="codeblock">{JSON.stringify(PRESETS[active].body, null, 2)}</pre>
      </div>
      <div className="console-pane">
        <div className="console-pane-head">
          <span className="mono">
            {result.expanded ? '← レスポンス（content[0].text を展開）' : '← レスポンス'}
          </span>
          <span
            className={result.ok ? 'console-status' : 'console-status is-error'}
            aria-live="polite"
          >
            {pending ? '送信中…' : result.status}
          </span>
        </div>
        {/* レスポンス欄は高さ固定でスクロールするので、キーボードでもスクロールできるようフォーカス可能にしておく */}
        {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
        <pre className="codeblock response" tabIndex={0}>
          {result.text}
        </pre>
      </div>
    </section>
  );
}
