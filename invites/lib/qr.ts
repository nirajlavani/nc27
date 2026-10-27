import QRCode from "qrcode";

export function qrDataUrl(url: string) {
  return QRCode.toDataURL(url, { margin: 1, width: 180, errorCorrectionLevel: "M" });
}
