import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, CameraOff, SwitchCamera, X } from "lucide-react";
import { useEffect } from "react";
import { useQRScanner } from "../qr-code/useQRScanner";

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  title?: string;
}

export function BarcodeScannerModal({
  open,
  onClose,
  onScan,
  title = "Scan Barcode",
}: BarcodeScannerModalProps) {
  const scanner = useQRScanner({ facingMode: "environment" });

  // biome-ignore lint/correctness/useExhaustiveDependencies: scanner methods are stable
  useEffect(() => {
    if (open) {
      scanner.startScanning();
    } else {
      scanner.stopScanning();
    }
    return () => {
      scanner.stopScanning();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on results change
  useEffect(() => {
    if (scanner.qrResults.length > 0) {
      const latest = scanner.qrResults[0];
      onScan(latest.data);
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanner.qrResults]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" data-ocid="scanner.dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {title}
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7"
              onClick={onClose}
              data-ocid="scanner.close.button"
            >
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={scanner.videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={scanner.canvasRef} className="hidden" />
            {!scanner.isActive && (
              <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                <div className="text-center">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <div className="opacity-70">Camera inactive</div>
                </div>
              </div>
            )}
            {/* Scan overlay */}
            {scanner.isActive && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-6 border-2 border-primary/70 rounded-lg">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-sm" />
                </div>
              </div>
            )}
          </div>
          {scanner.error && (
            <div
              className="text-xs text-destructive text-center"
              data-ocid="scanner.error_state"
            >
              {scanner.error ? String(scanner.error) : null}
            </div>
          )}
          <div className="flex gap-2 justify-center">
            <Button
              size="sm"
              variant={scanner.isScanning ? "destructive" : "default"}
              onClick={() =>
                scanner.isScanning
                  ? scanner.stopScanning()
                  : scanner.startScanning()
              }
              data-ocid="scanner.toggle"
            >
              {scanner.isScanning ? (
                <>
                  <CameraOff className="w-3 h-3 mr-1" />
                  Stop
                </>
              ) : (
                <>
                  <Camera className="w-3 h-3 mr-1" />
                  Start
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => scanner.switchCamera()}
              data-ocid="scanner.switch.button"
            >
              <SwitchCamera className="w-3 h-3 mr-1" /> Flip
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Point camera at barcode or QR code
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
