import addressHelper from './addresses.js';
import SignedMessageHandler from './signed-message-handler.js';

export default {
    addressHelper: addressHelper,
    getSignedMessageHandler: (message) => new SignedMessageHandler(message)
};
