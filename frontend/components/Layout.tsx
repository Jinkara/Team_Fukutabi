import Head from "next/head";
import type { ReactNode } from "react";

type Props = {
  /** 画面タイトル（<title> に入ります。不要なら省略可） */
  title?: string;
  children: ReactNode;
};

/** 画面共通の横幅センタリングだけを担う最小レイアウト */
export default function Layout({ title, children }: Props) {
  return (
    <>
      {title !== undefined && (
        <Head>
          <title>{title} | SerendiGo</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
      )}
      <div className="layout-container">{children}</div>
      <style jsx>{`
        .layout-container {
          max-width: 420px; /* スマホ想定の幅 */
          margin: 0 auto;
        }
      `}</style>
    </>
  );
}
