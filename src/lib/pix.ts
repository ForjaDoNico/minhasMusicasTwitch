// Static Pix "copia e cola" (BR Code / EMV MPM) payload generator.

function tlv(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    crc &= 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const clean = (s: string, max: number) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ]/g, "").trim().slice(0, max) || "NA";

export function pixPayload(opts: { key: string; name: string; city: string; amount?: number; txid?: string; message?: string }) {
  const account = tlv("00", "br.gov.bcb.pix") + tlv("01", opts.key.trim()) + (opts.message ? tlv("02", opts.message.slice(0, 40)) : "");
  let p =
    tlv("00", "01") +
    tlv("26", account) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (opts.amount && opts.amount > 0 ? tlv("54", opts.amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", clean(opts.name, 25)) +
    tlv("60", clean(opts.city, 15)) +
    tlv("62", tlv("05", (opts.txid ?? "***").replace(/[^A-Za-z0-9*]/g, "").slice(0, 25) || "***"));
  p += "6304";
  return p + crc16(p);
}
