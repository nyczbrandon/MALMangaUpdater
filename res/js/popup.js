//sorts array of objects by key
function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
}

$(document).ready(function() {

    //AJAX request to change the status of a manga in the user's list
    function mal_delete_manga(mal_basicauth, manga_id) {
        return $.ajax({
            url: 'https://myanimelist.net/api/mangalist/delete/' + manga_id + '.xml',
            type: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + mal_basicauth);
            }
        });
    }

    function display_bookmarks(mal_username) {
        var bookmarks_table = $('<table/>').css("list-style-type", "none").appendTo($("#bookmarks"));
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
                $.each(['drop', 'completed'], (_, status )=>{
                    var button_cell = $('<td/>')
                        .appendTo(tr);
                    var button = $('<button/>')
                        .text( status )
                        .appendTo(button_cell)
                        .click(()=> {
                            chrome.storage.local.get('mal_basicauth', ({mal_basicauth})=> {
                                var manga_id = this.id;
                                if (status === 'drop') {
                                    var drop_manga = mal_delete_manga(mal_basicauth, manga_id);
                                    drop_manga.then(function() {
                                        //Update bookmarks before dropping in case multiple drops at the same time
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
        $('body').css("width", "350px");
        $("#loginForm").css("display", "none");
        $("#msg").css("display", "block");
        $("#msg").text("Logged in as " + mal_username);
        $("#bookmarks").css("display", "block");
        display_bookmarks(mal_username);
    }

    chrome.storage.local.get('mal_username', function(obj) {
        if (obj.mal_username) {
            logged_in(obj.mal_username);
        }
    });

    $("#login").click(function() {
        var mal_username = $("#username").val();
        var mal_password = $("#password").val();
        var mal_basicauth = btoa(mal_username + ":" + mal_password);
        $.ajax({
            url: "https://myanimelist.net/api/account/verify_credentials.xml",
            type: "GET",
            dataType: "XML",
            beforeSend: function(xhr) {
                xhr.setRequestHeader("Authorization", "Basic " + mal_basicauth);
                }
        })
        .done(function(data) {
            chrome.storage.local.set({'mal_username': mal_username, "mal_basicauth": mal_basicauth}, function() {
                logged_in(mal_username);
            });
        })
        .fail(function(data) {
            $("#msg").css("display", "block");
            $("#msg").text("Failed to log in.");
        });
    });
});
