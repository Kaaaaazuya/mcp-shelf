import { CopyButton } from './CopyButton';

export function CopyBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <div className="copy-head">
        <h3>{title}</h3>
        <CopyButton text={text} />
      </div>
      <pre className="codeblock">{text}</pre>
    </div>
  );
}
