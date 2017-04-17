(function($) {
    'use strict;';
    //AJAX request to get manga list of username
    function mal_get_manga_list(mal_username) {
        return $.ajax({
            url: 'https://myanimelist.net/malappinfo.php',
            type: 'GET',
            dataType: 'XML',
            data: {'u': mal_username, 'status': 'all', 'type': 'manga'}
        });
    } 

    //AJAX request to add manga to user's myanimelist
    function mal_add_manga(mal_basicauth, manga_id, manga_xml) {
        return $.ajax({
            url: 'https://myanimelist.net/api/mangalist/add/' + manga_id + '.xml',
            type: 'POST',
            data: {'data': manga_xml},
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

    //AJAX request to search for manga on myanimelist
    function mal_search_manga(mal_basicauth, manga_name) {
        return $.ajax({
            url: 'https://myanimelist.net/api/manga/search.xml',
            type: 'GET',
            dataType: 'XML',
            data: {'q': manga_name},
            beforeSend: function(xhr) {
                xhr.setRequestHeader('Authorization', 'Basic ' + mal_basicauth);
            }
        });
    }

    //Create manga XML to use for adding and updating user's myanimelist
    function create_mal_manga_xml(manga_volumes, manga_chapters) {
        var manga_xml = ('<?xml version="1.0" encoding="UTF-8"?><entry><chapter>' + manga_chapters + '</chapter><volume>' + manga_volumes + '</volume><status>1</status><score>0</score></entry>');
        return manga_xml;
    }

    //Compare manga names by getting rid of special characters
    function compare_manga_names(manga_name_1, manga_name_2) {
        var manga_1 = manga_name_1.replace(/[^a-zA-Z0-9]/g, '');
        var manga_2 = manga_name_2.replace(/[^a-zA-Z0-9]/g, '');
        if (manga_1.toLowerCase() === manga_2.toLowerCase())
            return true;
        return false;
    }

    //Returns a string that can be better used in search
    function search_query_string(name) {
        return name.replace(/[^a-zA-Z0-9]/g, '%');
    }

    //Compare each manga synonym with the reader manga
    function check_manga_synonyms(manga_synonyms, reader_manga) {
        var split = manga_synonyms.split(';');
        for (var i = 0; i < split.length; i++) {
            if (compare_manga_names(split[i], reader_manga))
                return true;
        }
        return false;
    }

    //Update user's MyAnimelist
    function update_mal(mal_username, mal_basicauth, manga_name, manga_volume, manga_chapter) {
        var manga_list = mal_get_manga_list(mal_username);
        manga_list.then(function(data) {
            var manga_found = false;
            var manga_id = 0;
            var manga_volumes_read = 0;
            var manga_chapters_read = 0;
            //Look for manga in user's myanimelist
            //Priority for searing user's myanimelist
            //Priority 1: Title
            $(data).find('manga').each(function() {
                if (!manga_found && compare_manga_names($(this).find('series_title').text(), manga_name)) {
                    manga_id = parseInt($(this).find('series_mangadb_id').text());
                    manga_volumes_read = parseInt($(this).find('my_read_volumes').text());
                    manga_chapters_read = parseInt($(this).find('my_read_chapters').text());
                    manga_found = true;
                    return false;
                }
            });
            //Priority 2: Synonyms
            if (!manga_found) {
                $(data).find('manga').each(function() {
                    if (!manga_found && check_manga_synonyms($(this).find('series_synonyms').text(), manga_name)) {
                        manga_id = parseInt($(this).find('series_mangadb_id').text());
                        manga_volumes_read = parseInt($(this).find('my_read_volumes').text());
                        manga_chapters_read = parseInt($(this).find('my_read_chapters').text());
                        manga_found = true;
                        return false;
                    }
                });
            }
            //If manga is not found in user's myanimelist then search for the manga on myanimelist
            if (!manga_found) {
                var manga_search = mal_search_manga(mal_basicauth, search_query_string(manga_name));
                manga_search.then(function(data) {
                    //Look for manga on myanimelist
                    console.log(data);
                    //Priority for searching manga
                    //Priority 1: Title
                    $(data).find('entry').each(function() {
                        if (!manga_found && compare_manga_names($(this).find('title').text(), manga_name)) {
                            manga_id = parseInt($(this).find('id').text());
                            manga_found = true;
                            return false;
                        }
                    });
                    //Priority 2: English
                    if (!manga_found) {
                        $(data).find('entry').each(function() {
                            if (!manga_found && compare_manga_names($(this).find('english').text(), manga_name)) {
                                manga_id = parseInt($(this).find('id').text());
                                manga_found = true;
                                return false;
                            }
                        });
                    }
                    //Priority 3: Synonyms
                    if (!manga_found) {
                        $(data).find('entry').each(function() {
                            if (!manga_found && (check_manga_synonyms($(this).find('synonyms').text(), manga_name))) {
                                manga_id = parseInt($(this).find('id').text());
                                manga_found = true;
                                return false;
                            }
                        });
                    }
                    //If manga is not found in myanimelist return
                    if (!manga_found) {
                        console.error('Failed to find exact manga on myanimelist');
                        return;
                    }
                    //If manga is found on myanimelist, add it to user's myanimelist
                    var mal_manga_xml = create_mal_manga_xml(manga_volume, manga_chapter);
                    var manga_add = mal_add_manga(mal_basicauth, manga_id, mal_manga_xml);
                    manga_add.then(function(data) {
                        console.log('Sucessfully added manga to myanimelist');
            save_bookmark(mal_username, manga_id, manga_name, manga_volume, manga_chapter);
                        return;
                    }, function(data) {
                        console.error('Manga already on your list ');
                        return;
                    });
                }, function(data) {
                    console.log(data);
                    console.error('Failed to find any matching manga on myanimelist');
                    return;
                });
                return;
            }
            //If manga on user's myanimelist is progressed further than the current chapter being read, do not update
            if (manga_chapter <= manga_chapters_read || manga_volume < manga_volumes_read) {
                console.error('Already read this');
                return;
            }
            var mal_manga_xml = create_mal_manga_xml(manga_volume, manga_chapter);
            var manga_update = mal_update_manga(mal_basicauth, manga_id, mal_manga_xml);
            manga_update.then(function(data) {
                console.log('Sucessfully updated your manga myanimelist');
          save_bookmark(mal_username, manga_id, manga_name, manga_volume, manga_chapter);
          return;
            }, function(data) {
                console.error('Failed to update your manga myanimelist');
                return;
            });
        }, function(data) {
            console.error('Failed to get your manga list');
            return;
        });
    }

    //Get the name of the series as well as the current chapter from a batoto reader page
    function parse_batoto_manga_page(page_data) {
        if (window.location.hostname !== 'bato.to') {
            console.error('Not Batoto');
            return ['', 0, 0];
        }
        var manga_name = $(page_data).find('a')[0].text;
        var manga_progress = $(page_data).find('option:selected')[0].text;
        var manga_volume = 0;
        var manga_chapter = 0;
        console.log(manga_name);
        console.log(manga_progress);
        if (manga_progress.indexOf('Vol.') !== -1)
            manga_volume = parseInt(manga_progress.split('Vol.')[1]);
        if (manga_progress.indexOf('Ch.') !== -1)
            manga_chapter = parseInt(manga_progress.split('Ch.')[1]);
        return [manga_name, manga_volume, manga_chapter]; 
    }


    //syncs bookmarks with MAL currently reading list
    //this function may be used in the future if/when
    //'dropping a manga' feature is added
    function sync_bookmarks(mal_username) {
        var manga_list = mal_get_manga_list(mal_username);
        manga_list.then(function(data) {
      get_bookmarks(mal_username, function(bookmarks) {
          var mal_id_list = Set();
          $(data).find('manga').each(function() {
        if($(this).find('my_status').text() !== '1')
            return;
        var manga_id = parseInt($(this).find('series_mangadb_id').text());
        mal_id_list.add(manga_id);
          });
          // have to traverse in reverse as we are deleting from the array as
          // we traverse it
          for (var i = bookmarks.length-1; i >= 0; i--) {
        if (!mal_id_list.has(bookmarks[i].id)) {
            bookmarks.splice(i, 1);
            break;
        }
          }
      });
        });
    }

    //gets bookmarks from local storage
    function get_bookmarks(mal_username, cb) {
        chrome.storage.local.get('mimi_bookmarks_' + mal_username, function(items) {
      if (chrome.runtime.lastError) {
          console.err(chrome.runtime.lastError);
          return;
      }
            if(!items || !items['mimi_bookmarks_' + mal_username]) {
          cb([]);
          return;
      }
      cb(items['mimi_bookmarks_' + mal_username]);
        });
    }

    //saves bookmark with link to manga webpage to local storage
    function save_bookmark(mal_username, manga_id, manga_name, manga_volume, manga_chapter) {
        var bookmark_text = manga_name + ' Vol. ' + manga_volume + ' Ch. ' + manga_chapter;
        get_bookmarks(mal_username, function(bookmarks) {  
      var found = false; // does an old bookmark to the same manga exist
      for (var i in bookmarks) {
          if (bookmarks[i].id == manga_id) {
        bookmarks[i].link = window.location.href;
        bookmarks[i].text = bookmark_text;
        bookmarks[i].time = Date.now();
        found = true;
        break; 
          }
      }
      if(!found) {
          bookmarks.push({'id': manga_id, 'link': window.location.href, 'text': bookmark_text, 'time': Date.now()}); 
      }
      var prop_name = 'mimi_bookmarks_' + mal_username;
      var update_dict = {};
      update_dict[prop_name] = bookmarks;
      chrome.storage.local.set(update_dict, function(){
          if(chrome.runtime.lastError) console.error(chrome.runtime.lastError);
      });
        });
    }

    //Update user's myanimelist using the current manga the batoto reader is currently on
    function batoto_mal_updater(mal_username, mal_basicauth, id, page)
    {
        return $.ajax({
            url: 'http://bato.to/areader',
            type: 'GET',
            dataType: 'HTML',
            data: {'id': id, 'p': page},
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-Alt-Referer', 'http://bato.to/reader');
            }
        })
        .done(function(data) {
            var manga_data = parse_batoto_manga_page(data);
            var manga_name = manga_data[0];
            var manga_volume = manga_data[1];
            var manga_chapter = manga_data[2];
            update_mal(mal_username, mal_basicauth, manga_name, manga_volume, manga_chapter);
        })
        .fail(function(data) {
            console.error('Failed to get manga data');
        });
    }

    //Update user's myanimelist when reading batoto
    function batoto_scrobbler(mal_username, mal_basicauth) {
        if (window.location.hash.length <= 1) {
            console.error('Not on Batoto reader');
            return;
        }
        var split = window.location.hash.substring(1).split('_');
        var id = split[0];
        var page = '1';
        if (split.length === 2)
            page = split[1];
        batoto_mal_updater(mal_username, mal_basicauth, id, page);
        window.addEventListener('hashchange', function(event) {
            split = window.location.hash.substring(1).split('_');
            if (id != split[0]) {
                id = split[0];
                if (split.length === 2)
                    page = split[1];
                batoto_mal_updater(mal_username, mal_basicauth, id, page);
            }
        });
    }

    //Update user's myanimelist when reading kissmanga
    function kissmanga_scrobbler(mal_username, mal_basicauth) {
        //Gets rid of the last empty value if url ends in /
        var split = window.location.pathname.substring(1).split('/').filter(function(e){return e;});
        if (split.length != 3) {
            console.error('Not on KissManga reader');
            return;
        }
        var manga_name = split[1];
        //Old kissmanga chapters have different styling than newer ones
        var manga_chapter = parseInt(split[2].replace(/[^0-9.]/g, ''));
        //Kissmanga does not include volume
        update_mal(mal_username, mal_basicauth, manga_name, 0, manga_chapter);
    }

    //Update user's myanimelist when reading mangastream
    function mangastream_scrobbler(mal_username, mal_basicauth) {
        //Gets rid of the last empty value if url ends in /
        var split = window.location.pathname.substring(1).split('/').filter(function(e){return e;});
        if (split[0] !== 'r') {
            console.error('Not on MangaStream reader');
            return;
        }
        var manga_name = $('span.hidden-xs.hidden-sm').text();
        var manga_chapter = parseInt($('a.btn.btn-default.dropdown-toggle').text().replace(manga_name, ''));
        //Mangastream does not include volume
        update_mal(mal_username, mal_basicauth, manga_name, 0, manga_chapter);
    }

    //Update user's myanimelist when reading mangahere
    function mangahere_scrobbler(mal_username, mal_basicauth) {
        //Gets rid of the last empty value if url ends in /
        var split = window.location.pathname.substring(1).split('/').filter(function(e){return e;});
        if (split[0] !== 'manga' || split.length <= 2) {
            console.error('Not on MangaHere reader');
            return;
        }
        var manga_name = split[1];
        var manga_volume = 0;
        var manga_chapter = 0;
        if (split.length === 3) {
            manga_chapter = parseInt(split[2].replace('c',''));
        }
        else if (split.length === 4) {
            manga_volume = parseInt(split[2].replace('v',''));
            manga_chapter = parseInt(split[3].replace('c',''));
        }
        update_mal(mal_username, mal_basicauth, manga_name, manga_volume, manga_chapter);
    }

    //Update user's myanimelist when reading jaminisbox
    function jaiminisbox_scrobbler(mal_username, mal_basicauth) {
        var split = window.location.pathname.substring(1).split('/').filter(function(e){return e;});
        if (split[0] !== 'reader' || split[1] !== 'read') {
            console.error('Not on Jaiminis Box reader');
            return;
        }
        var manga_name = $('title').text().split('::')[1];
        var manga_volume = split[4];
        var manga_chapter = split[5];
        update_mal(mal_username, mal_basicauth, manga_name, manga_volume, manga_chapter);
    }

    $(document).ready(function() {
        chrome.storage.local.get(['mal_username', 'mal_basicauth'], function(obj) {
            if (chrome.runtime.lastError) {
                console.error(chrome.runtime.lastError);
                return;
            }

            console.log(window.location.hostname);
            if (obj.mal_username && obj.mal_basicauth) {
                switch(window.location.hostname) {
                case 'bato.to':
                    batoto_scrobbler(obj.mal_username, obj.mal_basicauth);
                    break;
                case 'kissmanga.com':
                    kissmanga_scrobbler(obj.mal_username, obj.mal_basicauth);
                    break;
                case 'mangastream.com':
                case 'readms.net':
                    mangastream_scrobbler(obj.mal_username, obj.mal_basicauth);
                    break;
                case 'www.mangahere.co':
                    mangahere_scrobbler(obj.mal_username, obj.mal_basicauth);
                    break;
                case 'jaiminisbox.com':
                    jaiminisbox_scrobbler(obj.mal_username, obj.mal_basicauth);
                    break;
                default:
                    console.log('Site unknown');
                }
            }
            else
                console.log('Not logged in');
        });
    });
}(jQuery));
