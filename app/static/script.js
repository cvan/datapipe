jQuery.event.props.push("dataTransfer");

function upload(file){
    var fd = new FormData();
    fd.append("image", file); // Append the file
    fd.append("key", "6528448c258cff474ca9701c5bab6927");

    // upload to imgur using jquery/CORS
    // https://developer.mozilla.org/En/HTTP_access_control
    $.ajax({
        url: 'http://api.imgur.com/2/upload.json',
        type: 'POST',
        data: fd,
        dataType: 'json',
        contentType: false,
        processData: false,
        cache: false
    }).success(function(data) {
        console.log(data.upload.image);
        $.post('/post', {hash: data.upload.image.hash}, function(data) {
            $('<div class="uploaded">File posted!</div>').insertBefore($('#dropzone'));
        });
    }).error(function() {
        alert('Could not reach api.imgur.com. Sorry :(');
    });
}

$(function() {
    $('#dropzone').on('drop', function(e) {
        e.preventDefault();
        //stop the browser from opening the file

        //Now we need to get the files that were dropped
        //The normal method would be to use event.dataTransfer.files
        //but as jquery creates its own event object you ave to access
        //the browser even through originalEvent.  which looks like this
        var files = e.originalEvent.dataTransfer.files;
        var file = files[0];
        if (!file || !file.type.match(/image.*/)) {
            alert("That's not an image!");
        }

        upload(file);

    }).on('dragover', function(e) {
        $(this).addClass('drag');
        e.preventDefault();
    }).on('dragleave', function(e) {
        $(this).removeClass('drag');
        e.preventDefault();
    });

    if(MozActivity !== undefined) {
        var pick = new MozActivity({
            name: "pick",
            data: {type: ["image/png", "image/jpg", "image/jpeg"]}
        });

        pick.onsuccess = function () { 
            var img = document.createElement("img");
            img.src = window.URL.createObjectURL(this.result.blob);
            var imagePresenter = document.querySelector("#image-presenter");
            imagePresenter.appendChild(img);
            imagePresenter.style.display = "block";
        };

        pick.onerror = function () { 
            alert("Can't view the image!");
        };
    }
});
