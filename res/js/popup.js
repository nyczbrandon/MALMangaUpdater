//sorts array of objects by key
function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
}

$(document).ready(function() {

    //AJAX request to change the status of a manga in the user's myanimelist
    function mal_delete_manga(mal_basicauth, manga_id) {
        return $.ajax({
            url: 'https://myanimelist.net/api/mangalist/delete/' + manga_id + '.xml',
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + mal_basicauth);
            }
        });
    }

    //AJAX request to update manga on user's myanimelist
    function mal_update_manga(mal_basicauth, manga_id, manga_xml) {
        return $.ajax({
            url: 'https://myanimelist.net/api/mangalist/update/' + manga_id + '.xml',
            type: 'POST',
            data: {'data': manga_xml},
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + mal_basicauth);
            }
        });
    }

    //Create manga XML to use for updating user's myanimelist
    function create_mal_manga_xml(manga_volumes, manga_chapters, manga_status) {
        var manga_xml = ('<?xml version="1.0" encoding="UTF-8"?><entry><chapter>' + manga_chapters + '</chapter><volume>' + manga_volumes + '</volume><status>' + manga_status + '</status><score>0</score></entry>');
        return manga_xml;
    }

    //Update bookmark list
    function update_bookmarks(user_bookmarks, manga_id, tr) {
        //Update bookmarks in case multiple updates at the same time
        chrome.storage.local.get(user_bookmarks, function(items) {
            //remove from local storage
            var bookmarks =  $.grep(items[user_bookmarks], (bookmark) => {
                return bookmark.id !== manga_id;
            });
            var prop_name = user_bookmarks;
            var update_dict = {};
            update_dict[prop_name] = bookmarks;
            chrome.storage.local.set(update_dict, function(){
                if(chrome.runtime.lastError)
                    console.error(chrome.runtime.lastError);
                //remove table row
                tr.remove();
            });
        });
    }

    function display_bookmarks(mal_username) {
        var bookmarks_table = $('<table/>').css('list-style-type', 'none').appendTo($('#bookmarks'));
        var user_bookmarks = 'mimi_bookmarks_' + mal_username;
        chrome.storage.local.get(user_bookmarks, function(items) {
            if (chrome.runtime.lastError) {
                console.err(chrome.runtime.lastError);
                return;
            }
            if(!items || !items[user_bookmarks]) {
                return;
            }
            var bookmarks_sorted = sortByKey(items[user_bookmarks], 'time');
            $.each(bookmarks_sorted, function() {
                var tr = $('<tr/>')
                    .appendTo(bookmarks_table);
                var bookmark_cell = $('<td/>')
                    .appendTo(tr);
                var a = $('<a/>')
                    .attr('href', this.link)
                    .text(this.text)
                    .appendTo(bookmark_cell)
                    .click(()=> {
                        chrome.tabs.create({url: this.link});
                        return false;
                    });
                $.each(['Delete', 'Drop', 'Complete'], (_, status )=>{
                    var button_cell = $('<td/>')
                        .appendTo(tr);
                    var button = $('<button/>')
                        .text( status )
                        .appendTo(button_cell)
                        .click(()=> {
                            chrome.storage.local.get('mal_basicauth', ({mal_basicauth})=> {
                                var manga_id = this.id;
                                var manga_volume = parseInt(this.text.split('Vol. ')[1]);
                                var manga_chapter = parseInt(this.text.split('Ch. ')[1]);
                                if (status === 'Delete') {
                                    var delete_manga = mal_delete_manga(mal_basicauth, manga_id);
                                    delete_manga.then(function() {
                                        update_bookmarks(user_bookmarks, manga_id, tr);
                                    }, function() {
                                        alert('Cannot reach MyAnimeList');
                                        return;
                                    });
                                }
                                else {
                                    var manga_status = 1;
                                    //Status number for drop is 4 and completed is 2
                                    if (status === 'Drop')
                                        manga_status = 4;
                                    else if (status === 'Complete')
                                        manga_status = 2;
                                    var mal_manga_xml = create_mal_manga_xml(manga_volume, manga_chapter, manga_status);
                                    var update_manga = mal_update_manga(mal_basicauth, manga_id, mal_manga_xml);
                                    update_manga.then(function() {
                                        update_bookmarks(user_bookmarks, manga_id, tr);
                                    }, function() {
                                        alert('Cannot reach MyAnimeList');
                                        return;
                                    });
                                }
                            });
                        });
                    });
                });
            });

    }

    function logged_in(mal_username) {
        $('body').css('width', '350px');
        $('#loginForm').css('display', 'none');
        $('#msg').css('display', 'inline');
        $('#msg').text('Logged in as ' + mal_username);
        $('#logout').css('display', 'inline');
        $('#bookmarks').css('display', 'block');
        display_bookmarks(mal_username);
    }

    function logged_out() {
        $('body').removeAttr('style');
        $('#loginForm').removeAttr('style');
        $('#msg').removeAttr('style');
        $('#msg').text('Message');
        $('#logout').removeAttr('style');
        $('#bookmarks').removeAttr('style');
        $('#bookmarks table').remove();
    }

    chrome.storage.local.get('mal_username', function(obj) {
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
            return;
        }
        if (obj.mal_username)
            logged_in(obj.mal_username);
    });

    $('#login').click(() => {
        var mal_username = $('#username').val();
        var mal_password = $('#password').val();
        var mal_basicauth = btoa(mal_username + ':' + mal_password);
        $.ajax({
            url: 'https://myanimelist.net/api/account/verify_credentials.xml',
            type: 'GET',
            dataType: 'XML',
            beforeSend: (xhr) => {
                xhr.setRequestHeader('Authorization', 'Basic ' + mal_basicauth);
                }
        })
        .done((data) => {
            chrome.storage.local.set({'mal_username': mal_username, 'mal_basicauth': mal_basicauth}, () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError);
                    return;
                }
                logged_in(mal_username);
            });
        })
        .fail((data) => {
            $('#msg').css('display', 'block');
            $('#msg').text('Failed to log in.');
        });
    });

    $('#logout').click(() => {
        chrome.storage.local.remove(['mal_username', 'mal_basicauth'], () => {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }
            logged_out();
        });
    });
});
