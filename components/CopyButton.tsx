import { useState } from 'react';

export function CopyButton({
  text,
  className = 'btn-quiet',
  label = 'コピー',
}: {
  text: string;
  className?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では何もしない
    }
  }

  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? 'コピーしました' : label}
    </button>
  );
}
