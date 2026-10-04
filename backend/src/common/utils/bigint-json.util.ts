// Tiền VND lưu BigInt trong DB; JSON.stringify mặc định ném lỗi với BigInt.
// Gán toJSON một lần để mọi response (interceptor, filter, test) trả về số.
// An toàn vì số tiền luôn nhỏ hơn Number.MAX_SAFE_INTEGER (~9 triệu tỷ).
declare global {
  interface BigInt {
    toJSON(): number;
  }
}

BigInt.prototype.toJSON = function (this: bigint): number {
  return Number(this);
};

export {};
