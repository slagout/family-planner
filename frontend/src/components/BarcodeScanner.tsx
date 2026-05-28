import React, { useEffect, useRef, useState } from 'react';
import { lookupBarcode, BarcodeResult } from '../services/inventoryApi';

interface Props {
  onDetect: (result: BarcodeResult) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onDetect, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [manual, setManual] = useState('');
  const [error, setError]   = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [useCamera, setUseCamera] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const rafRef = useRef<number>(0);

  // Check browser BarcodeDetector support
  const hasDetector = 'BarcodeDetector' in window;

  useEffect(() => {
    if (!useCamera || !hasDetector) { setUseCamera(false); return; }

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // @ts-ignore — BarcodeDetector is new API
        detectorRef.current = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        scan();
      } catch {
        setUseCamera(false);
      }
    })();

    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [useCamera, hasDetector]);

  function scan() {
    if (!videoRef.current || !detectorRef.current) return;
    detectorRef.current.detect(videoRef.current).then((barcodes: any[]) => {
      if (barcodes.length > 0) {
        cancelAnimationFrame(rafRef.current);
        streamRef.current?.getTracks().forEach(t => t.stop());
        handleUPC(barcodes[0].rawValue);
      } else {
        rafRef.current = requestAnimationFrame(scan);
      }
    }).catch(() => {
      rafRef.current = requestAnimationFrame(scan);
    });
  }

  async function handleUPC(upc: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await lookupBarcode(upc);
      onDetect(result);
    } catch {
      setError(`Product not found for UPC: ${upc}. You can still add it manually.`);
      onDetect({ upc, name: upc });
    } finally {
      setLoading(false);
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (manual.trim()) handleUPC(manual.trim());
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">📷 Scan Barcode</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {useCamera && hasDetector ? (
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-64 object-cover" muted playsInline />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-green-400 w-48 h-24 rounded-lg opacity-75" />
              </div>
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
              Camera scanning not available. Enter UPC manually below.
            </p>
          )}

          <div className="text-center text-sm text-gray-400">— or enter UPC manually —</div>

          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{8,14}"
              placeholder="e.g. 0001200016268"
              value={manual}
              onChange={e => setManual(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !manual.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
            >
              Look up
            </button>
          </form>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
