import CardanoUtils from '../index.js';

const cardanoUtils = CardanoUtils(true);

function testExtractBech32() {
    let res = null;
    let addr = 'addr1vym4ke6w88wshlp6ak8zdygyyu7m4ru3m5xajssy53jqw9gdz3p95';
    res = cardanoUtils.serialization.extractBech32(addr);
    if (!res) throw new Error('Unexpected invalid wallet');
    if (res.paymentPart.type !== 'payment') throw new Error('Payment address');
    if (res.delegationPart.type !== null) throw new Error('Should not be a delegation part');
    if (res.walletAddress !== addr) throw new Error('Wallet addr incorrect');

    addr = 'addr1q9qdsyy3leg336a9esvvkaha9uudlg9ndxhd4sywqs9jus64e4wsh29mr0xn7cl0uyvj6z8l5wr6w05xquym3wnmkrkslye9za';
    res = cardanoUtils.serialization.extractBech32(addr);
    if (!res) throw new Error('Unexpected invalid wallet');
    if (res.paymentPart.type !== 'payment') throw new Error('Payment address');
    if (res.delegationPart.type !== 'stake') throw new Error('Delegation is stake');
    if (res.walletAddress !== 'stake1u92u6hgt4za3hnflv0h7zxfdprl68pa886rqwzdchfampmgy03sqj') throw new Error('Wallet addr incorrect');

    addr = 'stake1u92u6hgt4za3hnflv0h7zxfdprl68pa886rqwzdchfampmgy03sqj';
    res = cardanoUtils.serialization.extractBech32(addr);
    if (!res) throw new Error('Unexpected invalid wallet');
    if (res.paymentPart.type !== null) throw new Error('No payment part expected');
    if (res.delegationPart.type !== 'stake') throw new Error('Delegation is stake');
    if (res.walletAddress !== 'stake1u92u6hgt4za3hnflv0h7zxfdprl68pa886rqwzdchfampmgy03sqj') throw new Error('Wallet addr incorrect');

    res = cardanoUtils.serialization.extractBech32('add1somethingincorrect');
    if (res) throw new Error('Wallet should not exist');
}

testExtractBech32();