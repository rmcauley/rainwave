/* jshint quotmark: false */
/* globals self, caches, Promise, Request */

// https://raw.githubusercontent.com/mozilla/serviceworker-cookbook/master/strategy-cache-and-update/service-worker.js

var CACHE = 'rainwave';

self.addEventListener('fetch', function(evt) {
	var url = evt.request.url;

	if (url === "/") {
		// needs cookies or something?
		var bootstrap = new Request("/api4/bootstrap", { method: 'POST' });
		evt.respondWidth(fetch(bootstrap).then(function(data) {
			var indexHTML = (
				'<!DOCTYPE html>' +
				'<html lang="' + data.locale + '">' +
				'<head>' +
					'<title>Rainwave</title>' +
					'<meta charset="UTF-8" />' +
					'<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />' +
					'<link  href="/static/baked/' + data.build_number + '/style5.css" type="text/css" rel="stylesheet" />' +
					'<script src="/static/baked/' + data.build_number + '/' + data.locale + '.js"></script>' +
					'<script src="/static/baked/' + data.build_number + '/templates5.js"></script>' +
					'<script src="/static/baked/' + data.build_number + '/script5.js" type="application/javascript"></script>' +
				'<meta name="msapplication-TileColor" content="#1978B7">' +
				'<meta name="msapplication-TileImage" content="/static/images4/logo_white.png">' +
				'<link rel="apple-touch-icon" sizes="1024x1024" href="/static/images4/ios/1024.png" />' +
				'<link rel="apple-touch-icon" sizes="152x152" href="/static/images4/ios/152.png" />' +
				'<link rel="apple-touch-icon" sizes="120x120" href="/static/images4/ios/120.png" />' +
				'<link rel="apple-touch-icon" sizes="76x76" href="/static/images4/ios/76.png" />' +
				'<link rel="mask-icon" href="/static/images4/ios/safari_pinned.svg" color="#5bbad5">' +
				'<link rel="shortcut icon" href="/static/favicon.ico" />' +
				'<link rel="icon" sizes="16x16 32x32 48x48 256x256" href="/static/favicon.ico" />' +
				'<meta name="theme-color" content="#1978B7" />' +
				'<meta name="msapplication-navbutton-color" content="#1978B7" />' +
				'<meta name="apple-mobile-web-app-status-bar-style" content="#1978B7" />' +
				'<link rel="manifest" href="/manifest.json" />' +
				'<meta name="twitter:card" content="summary" />' +
				'<meta name="twitter:site" content="@Rainwavecc" />' +
				'<meta name="twitter:title" content="Rainwave {{ station_name }}" />' +
				'<meta name="twitter:description" content="{{ site_description }}" />' +
				'<meta name="twitter:image" content="https://core.rainwave.cc/static/images4/android/256.jpg" />' +
				'<meta property="og:title" content="Rainwave {{ station_name }}" />' +
				'<meta property="og:site_name" content="Rainwave" />' +
				'<meta property="og:type" content="website" />' +
				'<meta property="og:description" content="{{ site_description }}" />' +
				'<meta property="og:locale" content="{{ request.locale.code }}" />' +
				'<meta property="og:locale_alternative" content="en_US" />' +
				'<meta property="og:url" content="https://rainwave.cc" />' +
				'<meta property="og:image" content="https://rainwave.cc/static/images4/android/256.png" />'
			);

			if (!data.mobile) {
				indexHTML += '<style>@import url(//fonts.googleapis.com/css?family=Roboto+Condensed:400,700)</style>';
				if (data.locale === 'ko_KO') {
					indexHTML += (
						'<style>' +
							'@font-face {' +
								'font-family: "KoPub Dotum";' +
								'font-style: normal;' +
								'font-weight: 400;' +
								'src: local("KoPub Dotum"), local("KoPub Dotum-Medium"), url(/static/baked/' + data.build_number + '/KoPubDotum-Medium.min.woff) format("woff");' +
							'}' +
							'@font-face {' +
								'font-family: "KoPub Dotum";' +
								'font-style: normal;' +
								'font-weight: 700;' +
								'src: local("KoPub Dotum"), local("KoPub Dotum-Medium"), url(/static/baked/' + data.build_number + '/KoPubDotum-Bold.min.woff) format("woff");' +
							'}' +
						'</style>'
					);
				}

				indexHTML += (
					'<style>' +
						'::-webkit-scrollbar {' +
							'width: 8px;' +
						'}' +
						'::-webkit-scrollbar-track {' +
							'display: none;' +
						'}' +
						'::-webkit-scrollbar-thumb {' +
							'border-width: 1px;' +
							'border-style: solid;' +
							'border-color: #555;' +
						'}' +
					'</style>'
				);
			}

			indexHTML += (
				'<body class="simple loading normal">' +
				'<div id="audio_volume_container">' +
				'	<svg class="unselectable audio_volume" id="audio_volume" viewBox="0 0 100 100" preserveAspectRatio="none" style="display: none;">' +
				'		<clipPath id="volume_bars">' +
				'			<rect x="0" y="80"  width="17" height="20"></rect>' +
				'			<rect x="20" y="60" width="17" height="40"></rect>' +
				'			<rect x="40" y="40" width="17" height="60"></rect>' +
				'			<rect x="60" y="20" width="17" height="80"></rect>' +
				'			<rect x="80" y="0"  width="17" height="100"></rect>' +
				'		</clipPath>' +
				'		<rect id="audio_volume_indicator_background" x="0" y="0" width="100" height="100" clip-path="url(#volume_bars)" style="opacity: 0.3;"></rect>' +
				'		<rect id="audio_volume_indicator" x="0" y="0" width="100" height="100" clip-path="url(#volume_bars)"></rect>' +
				'	</svg>' +
				'</div>' +
				'</body>' +
				'</html>'
			);
		}));
	}
	else {
		evt.respondWidth(fetch(evt.request));
	}

});

// Open the cache where the assets were stored and search for the requested
// resource. Notice that in case of no matching, the promise still resolves
// but it does with `undefined` as value.
function fromCache(request) {
	return caches.open(CACHE).then(function (cache) {
		return cache.match(request).then(function (matching) {
			return matching || Promise.reject('no-match');
		});
	});
}

