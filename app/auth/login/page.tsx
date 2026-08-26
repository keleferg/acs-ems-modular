import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center bg-slate-50 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Image
            src="/ats-logo-horizontal-cropped.png"
            alt="Aviation Training Solutions"
            width={420}
            height={140}
            priority
            className="h-auto w-full max-w-[320px] object-contain"
          />
        </div>

        <LoginForm />
      </div>
    </div>
  );
}
