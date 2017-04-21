//sorts array of objects by key
function sortByKey(array, key) {
    return array.sort(function(a, b) {
        var x = a[key]; var y = b[key];
        return ((x > y) ? -1 : ((x < y) ? 1 : 0));
    });
}

$(document).ready(function() {
    chrome.storage.local.get('mal_username', function(obj) {
        if (obj.mal_username)
        {
	    $('body').css("width", "300px");
            $("#loginForm").css("display", "none");
            $("#msg").css("display", "block");
            $("#msg").text("Logged in as " + obj.mal_username);

	    $("#bookmarks").css("display", "block");
	    var bookmarks_list = $('<ul/>').css("list-style-type", "none").appendTo($("#bookmarks"));
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
		    var li = $('<li/>')
			.appendTo(bookmarks_list);
		    var a = $('<a/>')
			.attr( "href", this.link )
			.text( this.text )
			.appendTo(li);
		});
		$('body').on('click', 'a', function(){
		    chrome.tabs.create({url: $(this).attr('href')});
		    return false;
		});
	    });
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
