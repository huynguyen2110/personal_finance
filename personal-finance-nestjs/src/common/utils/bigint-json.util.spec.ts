import './bigint-json.util';

describe('bigint-json.util', () => {
  it('JSON.stringify đổi BigInt (tiền VND) thành số', () => {
    expect(JSON.stringify({ amount: BigInt(1_250_000), nested: [BigInt(0)] })).toBe('{"amount":1250000,"nested":[0]}');
  });
});
