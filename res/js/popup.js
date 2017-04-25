//sorts array of objects by key
function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
}

$(document).ready(function() {

    //AJAX request to change the status of a manga in the user's list
    function mal_change_manga_status(mal_basicauth, manga_id, new_status) {
        alert( 'manga id: ' + manga_id + ' ' + new_status ); 
        return true;// request was successful (status 200)? 
    }

    function display_bookmarks(obj) {
        var bookmarks_table = $('<table/>').css("list-style-type", "none").appendTo($("#bookmarks"));
        chrome.storage.local.get('mimi_bookmarks_' + obj.mal_username, function(items) {
            if (chrome.runtime.lastError) {
                console.err(chrome.runtime.lastError);
                return;
            }
            if(!items || !items['mimi_bookmarks_' + obj.mal_username]) {
                return;
            }
            var bookmarks = sortByKey(items['mimi_bookmarks_' + obj.mal_username], 'time');
            $.each(bookmarks, function() {
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
                                var success = mal_change_manga_status(mal_basicauth, this.id, status);
                                if(success) {
                                    tr.remove();
                                }
                            });
                        });
                    });
                });
            });

    }

    chrome.storage.local.get('mal_username', function(obj) {
        if (obj.mal_username)
        {
            $('body').css("width", "350px");
            $("#loginForm").css("display", "none"); 
            $("#msg").css("display", "block");
            $("#msg").text("Logged in as " + obj.mal_username);

            $("#bookmarks").css("display", "block");
            display_bookmarks(obj);
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
                $("#loginForm").css("display", "none");
                $("#msg").css("display", "block");
                $("#msg").text("Logged in as " + mal_username);
            });
        })
        .fail(function(data) {
            $("#msg").css("display", "block");
            $("#msg").text("Failed to log in.");
        });
    });
});
