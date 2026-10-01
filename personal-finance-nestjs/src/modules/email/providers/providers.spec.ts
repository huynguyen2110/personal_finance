// Kiểm tra bộ đọc email ngân hàng với dữ liệu giả (bố cục giống email thật).
//   npm test
import assert from 'node:assert/strict';
import { parseBankEmail } from './index';
import { parseMoney } from '../utils/tokens';
import { emailContent, isSelfTransfer } from '../utils/email-content';

function ok(r: ReturnType<typeof parseBankEmail>) {
  assert.ok(r.ok, !r.ok ? r.reason : '');
  return r.data;
}


describe('Bộ đọc email ngân hàng', () => {
  it('Vietcombank: biên lai chuyển tiền (HTML)', () => {
    const row = (vi: string, en: string, value: string) => `<tr><td><b>${vi}</b><br><i>${en}</i></td><td>${value}</td></tr>`;
    const vcbHtml = `<!doctype html><html><head><style>td{padding:4px}</style></head><body>
    <h2>Biên lai chuyển tiền qua tài khoản</h2><p>(Payment Receipt)</p>
    <table>
    ${row('Ngày, giờ giao dịch', 'Trans. Date, Time', '13:48 Thứ Ba 29/09/2026')}
    ${row('Số lệnh giao dịch', 'Order Number', '<a href="#">1234567890</a>')}
    ${row('Tài khoản nguồn', 'Debit Account', '0011223344')}
    ${row('Tên người chuyển tiền', 'Remitter&#8217;s name', 'NGUYEN VAN A')}
    ${row('Tài khoản người hưởng', 'Credit Account', '100200300400')}
    ${row('Tên người hưởng', 'Beneficiary Name', 'NGUYEN VAN A')}
    ${row('Tên ngân hàng hưởng', 'Beneficiary Bank Name', 'Ngân hàng TMCP Công Thương Việt Nam')}
    ${row('Số tiền', 'Amount', '1,250,000 VND')}
    <tr><td><b>Loại phí</b><br><i>Charge Code</i></td><td>Người chuyển trả<br><i>Exclude</i></td>
    <td><b>Số tiền phí</b><br><i>Charge Amount</i><br>Net income<br>VAT</td><td>3,300 VND<br>3,000 VND<br>300 VND</td></tr>
    ${row('Nội dung chuyển tiền', 'Details of Payment', 'NGUYEN VAN A chuyen&nbsp;tien')}
    </table></body></html>`;

    const a = ok(parseBankEmail({ html: vcbHtml, from: 'VCB Digibank <noreply@info.vietcombank.com.vn>' }));
    assert.equal(a.provider, 'vcb');
    assert.equal(a.externalId, 'vcb-email:1234567890');
    assert.equal(a.transactionDate.toISOString(), '2026-09-29T06:48:00.000Z'); // 13:48 giờ VN
    assert.equal(a.accountNumber, '0011223344');
    assert.equal(a.direction, 'OUT');
    assert.equal(a.amount, 1_250_000);
    assert.equal(a.fee, 3_300);
    assert.equal(a.counterpartyAccount, '100200300400');
    assert.equal(a.counterpartyBank, 'Ngân hàng TMCP Công Thương Việt Nam');
    assert.equal(a.details, 'NGUYEN VAN A chuyen tien');
    assert.equal(isSelfTransfer(a), true);
  });

  it('Vietcombank: nội dung copy/dán', () => {
    const vcbPasted = `Biên lai chuyển tiền qua tài khoản
    (Payment Receipt)
    Ngày, giờ giao dịch
    Trans. Date, Time	08:05 Chủ Nhật 04/10/2026
    Số lệnh giao dịch
    Order Number	9876543210
    Tài khoản nguồn
    Debit Account	0011223344
    Tên người chuyển tiền
    Remitter’s name	NGUYEN VAN A
    Tài khoản người hưởng
    Credit Account	5566778899
    Tên người hưởng
    Beneficiary Name	CONG TY TNHH SHOPEE
    Tên ngân hàng hưởng
    Beneficiary Bank Name	Ngân hàng TMCP Quân đội
    Số tiền
    Amount	89,000 VND
    Loại phí
    Charge Code	Người chuyển trả
    Exclude	Số tiền phí
    Charge Amount
    Net income
    VAT	0 VND
    0 VND
    0 VND
    Nội dung chuyển tiền
    Details of Payment	Thanh toan don hang 250104ABC`;

    const b = ok(parseBankEmail({ text: vcbPasted }));
    assert.equal(b.provider, 'vcb');
    assert.equal(b.transactionDate.toISOString(), '2026-10-04T01:05:00.000Z');
    assert.equal(b.amount, 89_000);
    assert.equal(b.fee, 0);
    assert.equal(b.counterpartyName, 'CONG TY TNHH SHOPEE');
    assert.equal(isSelfTransfer(b), false);
  });

  it('Cake: tiền ra (HTML)', () => {
    const cakeRow = (label: string, value: string) => `<tr><td style="color:#666">${label}</td><td>${value}</td></tr>`;
    const cakeHtml = `<html><body>
    <p>Chào <b>Nguyễn Văn A</b></p>
    <p>Cake xin thông báo tài khoản của bạn vừa mới phát sinh giao dịch như sau:</p>
    <h3>Thông tin tài khoản</h3>
    <table>
    ${cakeRow('Tài khoản chuyển', '0099887766 - Tài khoản thanh toán')}
    ${cakeRow('Tài khoản nhận', 'PMC2603110000000001')}
    ${cakeRow('Tên người nhận', 'CUAHANGABC_TRAN VAN B')}
    ${cakeRow('Ngân hàng nhận', 'Momo')}
    </table>
    <h3>Thông tin giao dịch</h3>
    <table>
    ${cakeRow('Loại giao dịch', 'Chuyển tiền ngoài CAKE')}
    ${cakeRow('Mã giao dịch', '500000001')}
    ${cakeRow('Ngày giờ giao dịch', '25/09/2026, 20:29:05')}
    ${cakeRow('Số tiền', '<span style="color:red">-65.000 đ</span>')}
    ${cakeRow('Phí giao dịch', '0 đ')}
    ${cakeRow('Nội dung giao dịch', 'Chuyen khoan tu Cake')}
    </table></body></html>`;

    const c = ok(parseBankEmail({ html: cakeHtml, from: 'Cake <no-reply@cake.vn>' }));
    assert.equal(c.provider, 'cake');
    assert.equal(c.externalId, 'cake-email:500000001');
    assert.equal(c.accountNumber, '0099887766');
    assert.equal(c.direction, 'OUT');
    assert.equal(c.amount, 65_000);
    assert.equal(c.fee, 0);
    assert.equal(c.transactionDate.toISOString(), '2026-09-25T13:29:05.000Z');
    assert.equal(c.ownerName, 'Nguyễn Văn A');
    assert.equal(c.counterpartyName, 'CUAHANGABC_TRAN VAN B');
    assert.equal(c.counterpartyAccount, 'PMC2603110000000001');
    assert.equal(c.counterpartyBank, 'Momo');
    assert.equal(c.kind, 'Chuyển tiền ngoài CAKE');
    assert.equal(isSelfTransfer(c), false);
  });

  it('Cake: tiền vào (nội dung dán), người chuyển trùng tên → chuyển nội bộ', () => {
    const cakeIn = `Chào Nguyễn Văn A
    Cake xin thông báo tài khoản của bạn vừa mới phát sinh giao dịch như sau:
    Thông tin tài khoản
    Tài khoản chuyển	0011223344
    Tên người chuyển	NGUYEN VAN A
    Ngân hàng chuyển	Vietcombank
    Tài khoản nhận	0099887766 - Tài khoản thanh toán
    Thông tin giao dịch
    Loại giao dịch	Nhận tiền
    Mã giao dịch	500000002
    Ngày giờ giao dịch	26/09/2026, 08:00:00
    Số tiền	+2.000.000 đ
    Phí giao dịch	0 đ
    Nội dung giao dịch	NGUYEN VAN A chuyen tien`;

    const d = ok(parseBankEmail({ text: cakeIn }));
    assert.equal(d.provider, 'cake');
    assert.equal(d.direction, 'IN');
    assert.equal(d.accountNumber, '0099887766');
    assert.equal(d.amount, 2_000_000);
    assert.equal(d.counterpartyAccount, '0011223344');
    assert.equal(d.counterpartyBank, 'Vietcombank');
    assert.equal(isSelfTransfer(d), true);
  });

  it('ACB: câu văn, Ghi nợ, có số dư, không có giờ / mã giao dịch', () => {
    const acbHtml = `<html><body><img alt="ACB">
    <p>Kính gửi Quý khách hàng.</p>
    <p>ACB trân trọng thông báo tài khoản <b>12345678</b> của Quý khách đã thay đổi số dư như sau:<br>
    Số dư mới của tài khoản trên là: <b>2,000.00 VND</b> tính đến <b>29/09/2026</b>.<br>
    Giao dịch mới nhất:Ghi nợ <b>-2,000.00 VND</b>.<br>
    Nội dung giao dịch: <b>HELLO-290926-14:37:33 1111ABCD02XYZ1VK</b>.</p>
    <p>Cảm ơn Quý khách hàng đã sử dụng Sản phẩm/ Dịch vụ của ACB.</p></body></html>`;

    const received = new Date('2026-09-29T14:43:10+07:00');
    const f = ok(parseBankEmail({ html: acbHtml, from: 'mailalert@acb.com.vn', receivedAt: received }));
    assert.equal(f.provider, 'acb');
    assert.equal(f.accountNumber, '12345678');
    assert.equal(f.direction, 'OUT');
    assert.equal(f.amount, 2_000);
    assert.equal(f.balanceAfter, 2_000);
    assert.equal(f.details, 'HELLO-290926-14:37:33 1111ABCD02XYZ1VK');
    assert.equal(f.transactionDate.toISOString(), received.toISOString()); // giờ = giờ gửi email
    assert.match(f.externalId, /^acb-email:[0-9a-f]{16}$/);

    // Cùng email đó nhưng dán tay (không có giờ gửi) → cùng khóa chống trùng, giờ = 12:00 ngày đó
    const acbPasted = `Kính gửi Quý khách hàng.

    ACB trân trọng thông báo tài khoản 12345678 của Quý khách đã thay đổi số dư như sau:
    Số dư mới của tài khoản trên là: 2,000.00 VND tính đến 29/09/2026.
    Giao dịch mới nhất:Ghi nợ -2,000.00 VND.
    Nội dung giao dịch: HELLO-290926-14:37:33 1111ABCD02XYZ1VK.`;
    const g = ok(parseBankEmail({ text: acbPasted }));
    assert.equal(g.externalId, f.externalId);
    assert.equal(g.provider, 'acb');

    // Ghi có (tiền vào)
    const h = ok(
      parseBankEmail({
        text: acbPasted
          .replace('Ghi nợ -2,000.00', 'Ghi có +1,500,000.00')
          .replace('2,000.00 VND tính', '1,502,000.00 VND tính')
          .replace('HELLO-290926-14:37:33 1111ABCD02XYZ1VK', 'CONG TY ABC TRA LUONG T9'),
        receivedAt: new Date('2026-09-29T09:00:00+07:00'),
      })
    );
    assert.equal(h.direction, 'IN');
    assert.equal(h.amount, 1_500_000);
    assert.equal(h.balanceAfter, 1_502_000);
    assert.notEqual(h.externalId, f.externalId);
  });

  it('Email khác bị bỏ qua', () => {
    const e = parseBankEmail({ html: '<p>Vietcombank xin thông báo chương trình khuyến mãi</p>', from: 'x@vietcombank.com.vn' });
    assert.equal(e.ok, false);

    assert.deepEqual(parseMoney('1.000.000 VND'), { value: 1_000_000, sign: 0 });
    assert.deepEqual(parseMoney('1,000.00 VND'), { value: 1_000, sign: 0 });
    assert.deepEqual(parseMoney('-65.000 đ'), { value: 65_000, sign: -1 });
    assert.deepEqual(parseMoney('+2.000.000đ'), { value: 2_000_000, sign: 1 });
  });

});
