/* jshint quotmark: false */
/* globals self, caches, Request, Response */

var CACHE = 'rainwave';

self.addEventListener('fetch', function(evt) {
	var url = new URL(evt.request.url).pathname;

	if (url === "/") {
		console.log("Serving index from service worker.");
		// needs cookies or something?
		var bootstrap = new Request("/api4/bootstrap", { method: 'POST' });
		evt.respondWith(fetch(bootstrap).then(function(response) { return response.json(); }).then(function (data) {
			var indexHTML = (
				'<!DOCTYPE html>' +
				'<html lang="' + data.locale + '">' +
				'<head>' +
					'<title>Rainwave</title>' +
					'<meta charset="UTF-8" />' +
					'<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />' +
					'<link  href="/static/baked/' + data.build_version + '/style5.css" type="text/css" rel="stylesheet" />' +
					'<script>var MOBILE = ' + (data.mobile ? 'true' : 'false') + ';</script>' +
					'<script>var BOOTSTRAP = ' + JSON.stringify(data) + ';</script>' +
					'<script src="/static/baked/' + data.build_version + '/' + data.locale + '.js"></script>' +
					'<script src="/static/baked/' + data.build_version + '/templates5.js"></script>' +
					'<script src="/static/baked/' + data.build_version + '/script5.js" type="application/javascript"></script>' +
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
								'src: local("KoPub Dotum"), local("KoPub Dotum-Medium"), url(/static/baked/' + data.build_version + '/KoPubDotum-Medium.min.woff) format("woff");' +
							'}' +
							'@font-face {' +
								'font-family: "KoPub Dotum";' +
								'font-style: normal;' +
								'font-weight: 700;' +
								'src: local("KoPub Dotum"), local("KoPub Dotum-Medium"), url(/static/baked/' + data.build_version + '/KoPubDotum-Bold.min.woff) format("woff");' +
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
				'</head>'
			);

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

			return new Response(indexHTML, {status: 200, headers: { 'Content-Type': 'text/html' }});
		}));
	}
	// always grab beta files from the network
	else if (url.indexOf('templates5b.js') !== -1 || url.indexOf('style5b.css') !== -1) {
		// pass
	}
	// grab album art from network
	else if (url.indexOf('/static/baked/album_art') !== -1 || url.indexOf('/static/baked/art') !== -1) {
		// pass
	}
	// grab any baked or images from cache
	else if (url.indexOf('/static/baked/') === 0 || url.indexOf('/static/images4/') === 0) {
		console.log("Serving from cache: ", url);
		fetchAndCache(evt);
	}
	else if (url.indexOf('/serviceworker.js') === 0) {
		console.log("Fetching service worker from server.");
		evt.respondWith(fetch(new Request(evt.request.url), { "cache": "no-cache" }));
	}
	// anything else can come from the network
});

// https://developers.google.com/web/fundamentals/getting-started/primers/service-workers#cache_and_return_requests
var fetchAndCache = function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // IMPORTANT: Clone the request. A request is a stream and
        // can only be consumed once. Since we are consuming this
        // once by cache and once by the browser for fetch, we need
        // to clone the response.
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            var responseToCache = response.clone();

            caches.open(CACHE)
              .then(function(cache) {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
};
