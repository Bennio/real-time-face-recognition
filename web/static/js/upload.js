$('.upload-btn').on('click', function() {
	$('#upload-input').click();
	$('.progress-bar').text('0%');
	$('.progress-bar').width('0%');
});

$('#upload-input').on('change', function() {
	var files = $(this).get(0).files;

	if (files.length > 0) {
		// create a FormData object which will be sent as the data payload in the
		// AJAX request
		var formData = new FormData();

		// loop through all the selected files and add them to the formData object
		for (var i = 0; i < files.length; i++) {
			var file = files[i];

			// add the files to formData object for the data payload
			formData.append('uploads[]', file, file.name);
		}

		$.ajax({
			url: '/upload-file',
			type: 'POST',
			data: formData,
			processData: false,
			contentType: false,
			success: function(data) {
				console.log('upload successful!\n' + data);
			},
			xhr: function() {
				// create an XMLHttpRequest
				var xhr = new XMLHttpRequest();

				// listen to the 'progress' event
				xhr.upload.addEventListener(
					'progress',
					function(evt) {
						if (evt.lengthComputable) {
							// calculate the percentage of upload completed
							var percentComplete = evt.loaded / evt.total;
							percentComplete = parseInt(percentComplete * 100);

							// update the Bootstrap progress bar with the new percentage
							$('.progress-bar').text(percentComplete + '%');
							$('.progress-bar').width(percentComplete + '%');

							// once the upload reaches 100%, set the progress bar text to done
							if (percentComplete === 100) {
								$('.progress-bar').html('Done');
							}
						}
					},
					false
				);

				return xhr;
			}
		});
	}
});


function train() {
	let infoElement = document.querySelector('#info_train')
	let errorElement = document.querySelector('#error_train');
	let successElement = document.querySelector('#success_train');

	infoElement.classList.remove('hide');
	errorElement.classList.add('hide');
	successElement.classList.add('hide');

	$.ajax({
		url: '/train',
		type: 'GET',
		success: function(data) {
			infoElement.classList.add('hide');
			successElement.classList.remove('hide');
		},
		error: function(data) {
			infoElement.classList.add('hide');
			errorElement.classList.remove('hide');
		}
	});
}