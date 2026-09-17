// Gera o payload do BR Code (QR Code Pix), padrao do Banco Central.
// Referencia: Manual de Padroes para Iniciacao do Pix (BR Code).

function sanitize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')
    .trim();
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return id + len + value;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function normalizePixKey(key: string, keyType: string | null | undefined): string {
  const trimmed = key.trim();
  if (keyType === 'telefone') {
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 11 || digits.length === 10) return '+55' + digits;
    if ((digits.length === 13 || digits.length === 12) && digits.startsWith('55')) return '+' + digits;
    return '+55' + digits;
  }
  if (keyType === 'cpf' || keyType === 'cnpj') {
    return trimmed.replace(/\D/g, '');
  }
  if (keyType === 'email') {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

export function buildPixPayload(params: {
  key: string;
  keyType?: string | null;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txid?: string;
}): string {
  const normalizedKey = normalizePixKey(params.key, params.keyType);
  const merchantName = sanitize(params.merchantName).slice(0, 25) || 'RECEBEDOR';
  const merchantCity = sanitize(params.merchantCity).slice(0, 15) || 'CIDADE';
  const txid = sanitize(params.txid ?? '***').slice(0, 25) || '***';

  const merchantAccountInfo = tlv('00', 'br.gov.bcb.pix') + tlv('01', normalizedKey);

  let payload =
    tlv('00', '01') +
    tlv('26', merchantAccountInfo) +
    tlv('52', '0000') +
    tlv('53', '986');

  if (params.amount && params.amount > 0) {
    payload += tlv('54', params.amount.toFixed(2));
  }

  payload += tlv('58', 'BR') + tlv('59', merchantName) + tlv('60', merchantCity) + tlv('62', tlv('05', txid));

  payload += '6304';
  const crc = crc16(payload);
  return payload + crc;
}