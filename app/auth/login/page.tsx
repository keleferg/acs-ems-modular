import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-10">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex w-full justify-center">
          <Image
            src="/ats-logo-horizontal.png"
            alt="Aviation Training Solutions"
            width={1536}
            height={1024}
            priority
            className="h-auto w-full object-contain"
          />
        </div>

        <div className="mx-auto w-full max-w-md">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
