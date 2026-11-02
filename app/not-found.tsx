import Link from "next/link";
import { Btn } from "@/components/controls";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <div className="scrap-card mx-auto max-w-md px-6 py-14 text-center">
      <Logo className="mx-auto h-14 w-14" />
      <h1 className="font-display mt-4 text-2xl font-bold text-ink">这一页不存在</h1>
      <p className="mt-2 text-sm text-ink-soft">可能是链接打错了，回到首页继续翻相册吧。</p>
      <div className="mt-6 flex justify-center">
        <Link href="/">
          <Btn>回首页</Btn>
        </Link>
      </div>
    </div>
  );
}
