import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-900 relative">
      {/* Floating Elements for fantasy football feel */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-green-500/10 rounded-full blur-xl" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-xl" />
      <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-lime-500/10 rounded-full blur-xl" />
      {/* Logo and Heading */}
      <div className="z-10 flex flex-col items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent text-center">
          Sign up to AuctionDraft.io
        </h1>
      </div>
      {/* Clerk SignIn component */}
      <div className="z-10 w-full max-w-md flex justify-center">
        <SignUp routing="hash" />
      </div>
    </div>
  );
}
