---
title: "Exporting foobar2000 playlists (with FLACs!) to iTunes"
date: "2017-03-10 06:45:58"
---

# Exporting foobar2000 playlists (with FLACs!) to iTunes

<sup>2017-03-10</sup>

I spend an inordinate amount of time on music management, and have lately undertaken the task of automating a lot of it.

[flac-phobic](https://github.com/david-cako/flac-phobic) is a program that I wrote that aims to fully automate the process of maintaining your music library in both foobar2000 and iTunes.

It functions kind of like a linker.  It encodes all FLAC files as mp3, and spits out a playlist containing all of the original mp3s in-place, as well as all of the newly encoded mp3s.

The idea here is that I can continue managing my music in foobar2000 on my Windows machine, while also automatically having this playlist sync with my iPhone and macs.

It's fairly easy to use.

`git clone` or download the repository as a zip, install it with 

```
pip3 install flac_phobic
```

(either `pip3`, or `pip` -- make sure you're using python3), and run it:

```
flac_phobic [input playlist] [output directory]
```

You can also set defaults in `flac_phobic.py` that may be used with

```
flac_phobic default default
```

(I'm sure I'll add a proper flag at some point).

Finally, you just delete the **contents** of the previous version of the playlist in iTunes and drag and drop the new .m3u into it.  It's important that you don't delete the playlist itself, because that seems to trigger a full re-sync of all the files.

I've found that I'm also able to use the output playlist as input to 

```
rsync -avP --files-from=playlist.m3u
``` 

and 

```
tar -czvf flac_phobic.tar.gz -T playlist.m3u
``` 

so long as I replace backslashes with forwardslashes and set the file format to unix in vim:

```
:set ff=unix
:%s/\\/\//gc
```

rsync's `--files-from` and tar's `-T` allow you to pass a line-separated list of files as input.