import { useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Compressor from './components/Compressor';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import FAQ from './components/FAQ';
import Footer from './components/Footer';

export default function App() {
  const uploadRef = useRef(null);

  const scrollToUpload = () => {
    document.getElementById('upload')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="noise relative min-h-screen bg-[#070A12]">
      {/* Ambient background blobs */}
      <div
        className="glow-blob w-[700px] h-[700px]"
        style={{ top: '-200px', left: '-200px', background: '#6C5CE7' }}
      />
      <div
        className="glow-blob w-[500px] h-[500px]"
        style={{ top: '600px', right: '-150px', background: '#00D2FF', opacity: 0.1 }}
      />
      <div
        className="glow-blob w-[400px] h-[400px]"
        style={{ bottom: '200px', left: '30%', background: '#a29bfe', opacity: 0.08 }}
      />

      {/* Content */}
      <div className="relative z-10">
        <Navbar onStart={scrollToUpload} />
        <Hero onStart={scrollToUpload} />
        <Compressor ref={uploadRef} />
        <HowItWorks />
        <Features />
        <FAQ />
        <Footer />
      </div>
    </div>
  );
}
