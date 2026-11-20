// {% youtube id %} renders a facade: the video thumbnail linking to YouTube.
// The footer turns it into a Plyr player only when it is clicked, so pages do
// not load the YouTube player (and its trackers) for videos nobody plays.
hexo.extend.tag.register(
  'youtube',
  function (args) {
    const id = encodeURIComponent(args[0]);

    return (
      '<div class="js-player video-facade" data-plyr-provider="youtube" data-plyr-embed-id="' +
      id +
      '"><a class="video-facade-play" href="https://www.youtube.com/watch?v=' +
      id +
      '" aria-label="Play the video"><img src="https://i.ytimg.com/vi/' +
      id +
      '/hqdefault.jpg" alt="" width="480" height="360" loading="lazy"></a></div>'
    );
  },
  { ends: false, async: false },
);
