import { Component, Suspense, use, type ReactNode } from 'react';

function Skeleton() {
  return (
    <>
      <span className="skeleton" aria-hidden="true" />
      <span className="sr-only">読み込み中</span>
    </>
  );
}

function Resolved<T>({ value, children }: { value: Promise<T>; children: (resolved: T) => ReactNode }) {
  return <>{children(use(value))}</>;
}

/** 集計の取得に失敗しても、ページの残りは表示する */
class Unavailable extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <>
          <span aria-hidden="true">—</span>
          <span className="sr-only">取得できませんでした</span>
        </>
      );
    }
    return this.props.children;
  }
}

/** loader の defer() で届く値を表示する。届くまでは灰色の仮表示、失敗したら「—」 */
export function Loaded<T>({ value, children }: { value: Promise<T>; children: (resolved: T) => ReactNode }) {
  return (
    <Unavailable>
      <Suspense fallback={<Skeleton />}>
        <Resolved value={value}>{children}</Resolved>
      </Suspense>
    </Unavailable>
  );
}
