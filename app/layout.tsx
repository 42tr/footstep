import type { Metadata, Viewport } from "next";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "小脚印 · 宝宝成长纪念站",
    template: "%s · 小脚印",
  },
  description:
    "只属于一家人的成长纪念册：照片视频相册、按月龄的成长时间线、身高体重曲线和「第一次」里程碑打卡。",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icon-180.png",
  },
  manifest: "/manifest.webmanifest",
  // 家庭私密站点，不希望被任何搜索引擎收录
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fdf7ec",
};

function BackgroundDecor() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <svg className="absolute -left-24 -top-28 h-[380px] w-[380px] opacity-[0.5]" viewBox="0 0 200 200">
        <path
          fill="#F5D06F"
          opacity="0.28"
          d="M44.7-9.9C53.9 8.5 54.5 40.4 39.6 55.3 24.7 70.2 -5.7 68.1 -24.9 55.6 -44.1 43.1 -52.1 20.2 -47.7 2.6 -43.3 -15 -26.5 -27.3 -6.6 -29.4 13.3 -31.5 35.5 -28.3 44.7 -9.9Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg className="absolute -right-32 top-1/3 h-[420px] w-[420px] opacity-[0.45]" viewBox="0 0 200 200">
        <path
          fill="#8FB9D9"
          opacity="0.3"
          d="M38.9-16.6C50.9 1.4 61.4 27.9 51.6 40.3 41.8 52.7 11.7 51 -14.1 44.4 -39.9 37.8 -61.4 26.3 -63.5 10.3 -65.6 -5.7 -48.3 -26.2 -30.4 -35.6 -12.5 -45 5.9 -43.4 20.1 -34.6 34.3 -25.8 26.9 -34.6 38.9 -16.6Z"
          transform="translate(100 100)"
        />
      </svg>
      <svg className="absolute -bottom-40 left-1/4 h-[360px] w-[360px] opacity-[0.4]" viewBox="0 0 200 200">
        <path
          fill="#7FA98B"
          opacity="0.26"
          d="M41.2 -22.9C52.6 -4.9 60.5 15.4 51.3 27.4 42.1 39.4 15.8 43.1 -8.9 41.6 -33.6 40.1 -56.7 33.4 -61.4 19.4 -66.1 5.4 -52.4 -15.9 -36.5 -30.4 -20.6 -44.9 -2.5 -52.6 12.9 -48.7 28.3 -44.8 29.8 -40.9 41.2 -22.9Z"
          transform="translate(100 100)"
        />
      </svg>
    </div>
  );
}

/**
 * 根布局只负责 html/body 和背景装饰。
 * 导航、页脚属于「家庭区」，放在 (family)/layout.tsx 里——
 * 这样登录页和错误页不会泄漏任何登录后的界面元素。
 */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh antialiased">
        <BackgroundDecor />
        {children}
      </body>
    </html>
  );
}
