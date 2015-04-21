$(document).ready(function() {
  var primus = new Primus
  var count = 0

  primus.on('data', function(msg) {
    if (msg.photo) {
      count += 1
      $('#stats').html('Total: ' + count + ' photos')

      var div = $('<div class="photo"></div>')
      div.append('<img src="' + msg.photo.url + '" />')

      var location = '(Not given)'
      if (msg.photo.latitude && msg.photo.longitude)
        location = msg.photo.latitude.toFixed(2) + ', ' + msg.photo.longitude.toFixed(2)

      div.append('<p><strong>Time:</strong> ' + msg.photo.timestamp + '</p>')
      div.append('<p><strong>Description:</strong> ' + (msg.photo.description || '(No description)') + '</p>')
      div.append('<p><strong>Location:</strong> ' + location + '</p>')
      div.append('<p><strong>Tags:</strong> ' + msg.photo.tags.join(', ') + '</p>')

      $('.photos').append(div)

      window.scrollTo(0,document.body.scrollHeight)
    }
  })
})
