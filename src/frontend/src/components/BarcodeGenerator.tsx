import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    JsBarcode: (
      element: HTMLElement | HTMLCanvasElement,
      value: string,
      options?: Record<string, unknown>,
    ) => void;
  }
}

interface BarcodeGeneratorProps {
  value: string;
  label?: string;
  showControls?: boolean;
  width?: number;
  height?: number;
}

export function BarcodeGenerator({
  value,
  label,
  showControls = true,
  width = 200,
  height = 60,
}: BarcodeGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window.JsBarcode === "function") {
      setLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
    script.onload = () => setLoaded(true);
    script.onerror = () => setError("Failed to load barcode library");
    document.head.appendChild(script);
  }, []);

  const renderBarcode = useCallback(() => {
    if (
      !loaded ||
      !canvasRef.current ||
      !value ||
      typeof window.JsBarcode !== "function"
    )
      return;
    try {
      window.JsBarcode(canvasRef.current, value, {
        format: "CODE128",
        width: 2,
        height,
        displayValue: true,
        fontSize: 12,
        margin: 8,
        background: "transparent",
        lineColor: "currentColor",
      });
      setError(null);
    } catch {
      setError("Invalid barcode value");
    }
  }, [loaded, value, height]);

  useEffect(() => {
    renderBarcode();
  }, [renderBarcode]);

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL();
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Barcode - ${label || value}</title>
      <style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;}</style>
      </head><body><img src="${dataUrl}" /></body></html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `barcode-${value}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  };

  if (error) return <div className="text-xs text-destructive">{error}</div>;
  if (!value)
    return (
      <div className="text-xs text-muted-foreground">
        Enter SKU to generate barcode
      </div>
    );

  return (
    <div className="flex flex-col items-center gap-2">
      {label && (
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
      )}
      <div className="bg-white p-2 rounded-lg" style={{ minWidth: width }}>
        <canvas ref={canvasRef} className="block" />
      </div>
      {showControls && loaded && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            data-ocid="barcode.print.button"
          >
            <Printer className="w-3 h-3 mr-1" /> Print
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            data-ocid="barcode.download.button"
          >
            <Download className="w-3 h-3 mr-1" /> Download
          </Button>
        </div>
      )}
    </div>
  );
}
