$(document).ready(function() {
    chrome.storage.local.get('mal_username', function(obj) {
        if (obj.mal_username)
        {
            $("#loginForm").css("display", "none");
            $("#msg").css("display", "block");
            $("#msg").text("Logged in as " + obj.mal_username);
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