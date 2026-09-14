'use client';

import MorphSlider from '@/components/MorphSlider';
import { SignUp } from '@clerk/nextjs';

const sliderItems = [
  { image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?q=80&w=1600&auto=format&fit=crop', caption: 'Private & Secure Connections' },
  { image: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1600&auto=format&fit=crop', caption: 'High-Quality Video Calls' },
  { image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1600&auto=format&fit=crop', caption: 'Exclusive Invite-Only Groups' }
];

export default function SignupPage() {
  return (
    <div className="w-[100vw] h-[100vh] min-h-[100dvh] flex flex-col md:flex-row font-sans m-0 p-0 overflow-hidden">
      {/* Left Panel */}
      <div className="hidden md:flex md:w-[52%] h-full relative bg-[#9ab8a3]">
        <MorphSlider
          items={sliderItems}
          transition="melt"
          intensity={0.55}
          aberration={0.35}
          drift={0.4}
          autoplay
          autoplayDelay={3}
          radius={0}
        />
      </div>

      {/* Right Panel */}
      <div className="w-full md:w-[48%] bg-white flex flex-col items-center justify-center px-8 sm:px-16 lg:px-24">
        <div className="w-full max-w-[440px] mx-auto">
          {/* Logo */}
          <div className="text-center mb-[40px] flex flex-col items-center">
            <img src="/logo.jpg" alt="TikiTaka Logo" className="w-24 h-24 mb-6 shadow-md object-cover" />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">TikiTaka</h1>
            <p className="text-[17px] text-[#7a7a7a]">Join TikiTaka</p>
          </div>

          <div className="flex justify-center w-full">
            <SignUp 
              routing="hash"
              signInUrl="/login" 
              forceRedirectUrl="/dashboard"
              appearance={{
                elements: {
                  rootBox: "w-full flex justify-center",
                  cardBox: "!shadow-none !border-0 !ring-0 w-full",
                  card: "!shadow-none !border-0 !ring-0 !bg-transparent p-0 w-full !rounded-none",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  dividerRow: "hidden",
                  formButtonPrimary: "bg-[#5b5b5b] hover:bg-[#4a4a4a] text-[16px] py-3.5 rounded-full w-[240px] mx-auto block mt-4",
                  formFieldInput: "w-full pb-3 border-0 border-b border-[#e5e5e5] focus:ring-0 focus:border-[#9ab8a3] bg-transparent text-[#333333] text-[16px] placeholder-[#d1d1d1] outline-none rounded-none shadow-none focus:outline-none",
                  formFieldLabel: "text-[12px] font-bold text-[#b5b5b5] uppercase tracking-wide",
                  footer: "bg-transparent",
                  footerAction: "bg-transparent",
                  footerActionText: "text-[#8e8e8e] text-[12px]",
                  footerActionLink: "text-[#8ca895] font-bold hover:text-[#789180]",
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}