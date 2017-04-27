chrome.runtime.onMessage.addListener(function(msg, sender) {
    'use strict';
    /* Verify the message's format */
    console.log(sender);
    if(msg.type !== 'mimi_add_manga' 
     || !msg.name 
     || !msg.id) return;

    var opt = {
        type: "basic",
        title: "New Manga Added",
        message: msg.name,
        buttons: [{title: 'No, I do not want to track this manga'}],
        iconUrl: "res/images/mimi.png"
    };

    chrome.notifications.create(msg.id.toString(), opt);
    chrome.notifications.onButtonClicked.addListener((manga_id, buttonIndex)=> {
        manga_id = parseInt(manga_id);
        alert(manga_id + ' manga removed');
        // TODO: remove from mal and bookmarks list
    });

});
