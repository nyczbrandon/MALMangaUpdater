'use strict';
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type !== 'mimi_add_manga' || !msg.name || !msg.image)
        return false;
    var notification_id = null;
    var opt = {
        type: 'image',
        title: 'Add Manga',
        message: 'Do you want to add ' + msg.name + '?',
        iconUrl: '/res/images/mimi.png',
        imageUrl: msg.image,
        buttons: [{
            title: 'Yes'
        }, {
            title: 'No'
        }]
    };
    chrome.notifications.create('', opt, (id) => notification_id = id);
    chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
        if (notificationId === notification_id) {
            chrome.notifications.clear(notification_id);
            if (buttonIndex === 0)
                sendResponse({response: 'Yes'});
            else if (buttonIndex === 1)
                sendResponse({response: 'No'});
        }
    });
    return true;
})
